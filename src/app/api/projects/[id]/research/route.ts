import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runResearch, type ScrapedItem } from "@/lib/scrapers";
import { claudeJSON } from "@/lib/claude";
import { INSIGHT_EXTRACTOR_SYSTEM, INSIGHT_EXTRACTOR_USER } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ExtractedInsight {
  type: "belief" | "goal" | "context" | "pattern";
  title: string;
  content: string;
  tension?: string | null;
  confidence: number;
  quotes: { text: string; source_index: number }[];
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
        const plan = {
          title: project.title,
          audience: project.target_audience ?? "",
          question: project.research_question ?? "",
        };

        // Clear prior sources for a clean re-run.
        await supabase.from("research_sources").delete().eq("project_id", id);

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
              })),
            );
          }
        })) {
          send({ type: ev.step, source: ev.source, ...("count" in ev ? { count: ev.count } : {}), ...("error" in ev ? { error: ev.error } : {}) });
        }

        if (collected.length === 0) {
          send({
            type: "error",
            message:
              "No research sources available. Check ANTHROPIC_API_KEY and network access for Reddit/web.",
          });
          await supabase.from("projects").update({ status: "error" }).eq("id", id);
          controller.close();
          return;
        }

        send({ type: "stage", stage: "extract", message: `synthesizing ${collected.length} items with Claude` });

        // Claude wants a bounded context. Take the top ~40 items.
        const trimmed = collected.slice(0, 40);
        const extracted = await claudeJSON<{ insights: ExtractedInsight[] }>({
          system: INSIGHT_EXTRACTOR_SYSTEM,
          user: INSIGHT_EXTRACTOR_USER({
            title: project.title,
            audience: project.target_audience ?? "",
            question: project.research_question ?? "",
            sources: trimmed.map((s) => ({
              kind: s.kind,
              url: s.url,
              title: s.title,
              excerpt: s.excerpt,
            })),
          }),
          maxTokens: 6000,
        });

        // Wipe prior insights for a clean re-run and re-insert.
        await supabase.from("insights").delete().eq("project_id", id);

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
            })
            .select("id")
            .single();
          if (insErr || !inserted) continue;

          const quotesPayload = (ins.quotes ?? [])
            .filter((q) => q.text && q.text.length > 0)
            .map((q) => {
              const src = trimmed[q.source_index - 1];
              return {
                insight_id: inserted.id,
                text: q.text,
                source: src?.kind ?? null,
                source_url: src?.url ?? null,
              };
            });
          if (quotesPayload.length) {
            await supabase.from("quotes").insert(quotesPayload);
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
