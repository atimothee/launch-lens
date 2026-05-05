import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runResearch, type ScrapedItem } from "@/lib/scrapers";
import { enrichWithDemographics } from "@/lib/scrapers/demographic-filter";
import { generateJSON } from "@/lib/ai/model-router";
import {
  INSIGHT_EXTRACTOR_SYSTEM,
  INSIGHT_EXTRACTOR_USER_DEMOGRAPHIC
} from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ExtractedInsight {
  type: "belief" | "goal" | "context" | "pattern";
  title: string;
  content: string;
  tension?: string | null;
  confidence: number;
  demographic_relevance_score?: number;
  primary_demographic?: string;
  evidence: Array<{
    text: string;
    source_index: number;
    evidence_type?: "quote" | "statistic" | "observation";
    demographic_match_score?: number;
  }>;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(obj: unknown) {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      }

      try {
        await supabase.from("projects").update({ status: "running" }).eq("id", id);

        const collected: ScrapedItem[] = [];
        const perSource: Record<string, { count: number; error?: string }> = {};
        const plan = {
          title: project.title,
          audience: project.target_audience ?? "",
          question: project.research_question ?? "",
        };

        // Clear prior sources and insights for a clean re-run.
        await supabase.from("research_sources").delete().eq("project_id", id);
        await supabase.from("insights").delete().eq("project_id", id);

        for await (const ev of runResearch(plan, async (items) => {
          // Persist scraped items as we go.
          collected.push(...items);
          if (items.length) {
            await supabase.from("research_sources").insert(
              items.map((i) => ({
                project_id: id,
                kind: i.kind,
                url: i.url,
                title: i.title,
                excerpt: i.excerpt.slice(0, 5000),
                raw: i.raw ?? null,
                author_profile: i.author_profile ?? null,
                demographic_match_score: i.demographic_match_score ?? 0,
                demographic_signals: i.demographic_signals ?? null,
              })),
            );
          }
        })) {
          if (ev.step === "source_done") {
            perSource[ev.source] = { count: ev.count };
          } else if (ev.step === "source_error") {
            perSource[ev.source] = { count: 0, error: ev.error };
          }
          send({ type: ev.step, source: ev.source, ...("count" in ev ? { count: ev.count } : {}), ...("error" in ev ? { error: ev.error } : {}) });
        }

        if (collected.length === 0) {
          const summary = Object.entries(perSource)
            .map(([src, s]) =>
              s.error ? `${src}: error (${s.error})` : `${src}: ${s.count} items`,
            )
            .join(" · ");
          send({
            type: "error",
            message: `All sources returned zero items. ${summary || "(no source events)"}. Reddit often 403s from serverless IPs; try running locally, adding an APIFY_TOKEN, or checking REDDIT_USER_AGENT.`,
          });
          await supabase.from("projects").update({ status: "error" }).eq("id", id);
          controller.close();
          return;
        }

        // NEW: Enrich with demographic data
        send({ type: "stage", stage: "demographic", message: `analyzing demographics for ${collected.length} items` });
        const enriched = await enrichWithDemographics(
          collected,
          project.target_audience ?? "",
          { batchSize: 5, minScore: 0.0 } // Keep all items but score them
        );
        send({ type: "stage", stage: "demographic", message: `demographic analysis complete` });

        send({ type: "stage", stage: "extract", message: `synthesizing ${enriched.length} items with OpenAI` });

        // Bounded context: top ~40 items, prioritizing high demographic matches
        const trimmed = enriched.slice(0, 40);
        const { value: extracted, provider } = await generateJSON<{ insights: ExtractedInsight[] }>({
          system: INSIGHT_EXTRACTOR_SYSTEM,
          user: INSIGHT_EXTRACTOR_USER_DEMOGRAPHIC({
            title: project.title,
            audience: project.target_audience ?? "",
            question: project.research_question ?? "",
            sources: trimmed.map((s) => ({
              kind: s.kind,
              url: s.url,
              title: s.title,
              excerpt: s.excerpt,
              demographic_match_score: s.demographic_match_score,
              demographic_signals: s.demographic_signals ?? undefined,
            })),
          }),
          maxTokens: 6000,
          tier: "workhorse",
        });
        send({ type: "stage", stage: "extract", message: `extracted via ${provider}` });

        // Insert insights with demographic data
        for (const ins of extracted.insights ?? []) {
          const { data: inserted, error: insErr } = await supabase
            .from("insights")
            .insert({
              project_id: id,
              type: ins.type,
              title: ins.title,
              content: ins.content,
              tension: ins.tension ?? null,
              confidence: clamp01(ins.confidence),
              demographic_relevance_score: clamp01(ins.demographic_relevance_score ?? 0),
              primary_demographic: ins.primary_demographic ?? null,
            })
            .select("id")
            .single();
          if (insErr || !inserted) continue;

          // Insert evidence (replaces quotes)
          const evidencePayload = (ins.evidence ?? [])
            .filter((e) => e.text && e.text.length > 0)
            .map((e) => {
              const src = trimmed[e.source_index - 1];
              return {
                insight_id: inserted.id,
                text: e.text,
                source_url: src?.url ?? null,
                evidence_type: e.evidence_type ?? "quote",
                validation_status: "verified" as const, // Auto-verify AI-extracted evidence
                demographic_match_score: e.demographic_match_score ?? src?.demographic_match_score ?? 0,
              };
            });
          if (evidencePayload.length) {
            await supabase.from("evidence").insert(evidencePayload);
          }
        }

        send({ type: "insights_ready", count: (extracted.insights ?? []).length });
        await supabase.from("projects").update({ status: "ready" }).eq("id", id);
        send({ type: "done" });
        controller.close();
      } catch (err) {
        console.error("research failed", err);
        await supabase.from("projects").update({ status: "error" }).eq("id", id);
        send({ type: "error", message: err instanceof Error ? err.message : String(err) });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : 0.5;
  if (Number.isNaN(x)) return 0.5;
  return Math.max(0, Math.min(1, x));
}
