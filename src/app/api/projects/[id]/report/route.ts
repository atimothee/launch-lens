import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJSON } from "@/lib/ai/model-router";
import {
  REPORT_SYSTEM,
  REPORT_USER,
  INTERVIEW_SUMMARY_SYSTEM,
  INTERVIEW_SUMMARY_USER,
} from "@/lib/prompts";
import type {
  InterviewMessage,
  InterviewRespondent,
  MessagingAngle,
  PositioningAngle,
  ResearchFinding,
  StrategicOpportunity,
} from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

interface ReportResult {
  summary: string;
  secondary_findings: ResearchFinding[];
  primary_findings: ResearchFinding[];
  strategic_opportunities: StrategicOpportunity[];
  positioning: PositioningAngle[];
  messaging: MessagingAngle[];
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

  const { data: insights } = await supabase
    .from("insights")
    .select("type,title,content,tension")
    .eq("project_id", id);

  if (!insights || insights.length === 0) {
    return NextResponse.json({ error: "no_insights" }, { status: 400 });
  }

  // Pull completed/partial interviews with enough content to be worth using.
  const { data: interviewsRaw } = await supabase
    .from("interviews")
    .select("id, transcript, summary, respondent_id, status")
    .eq("project_id", id)
    .in("status", ["completed", "partial"]);

  // Load respondents in bulk.
  const respondentIds = (interviewsRaw ?? [])
    .map((i) => i.respondent_id)
    .filter((x): x is string => !!x);
  const { data: respondents } = respondentIds.length
    ? await supabase.from("interview_respondents").select("*").in("id", respondentIds)
    : { data: [] as InterviewRespondent[] };
  const respondentsById = new Map<string, InterviewRespondent>();
  for (const r of respondents ?? []) respondentsById.set(r.id, r as InterviewRespondent);

  // Summarize interviews that haven't been summarized, cache each summary.
  const interviewPayload: {
    summary: string | null;
    respondent?: {
      age_range?: string | null;
      gender?: string | null;
      location?: string | null;
      occupation?: string | null;
      usage_frequency?: string | null;
    };
    quotes: string[];
  }[] = [];

  for (const iv of interviewsRaw ?? []) {
    const transcript = (iv.transcript ?? []) as InterviewMessage[];
    if (transcript.length < 4) continue;

    let summary = iv.summary as string | null;
    if (!summary) {
      try {
        const { value: sum } = await generateJSON<{ summary: string }>({
          system: INTERVIEW_SUMMARY_SYSTEM,
          user: INTERVIEW_SUMMARY_USER({ title: project.title, transcript }),
          maxTokens: 1200,
          tier: "workhorse",
        });
        summary = sum.summary ?? null;
        if (summary) {
          await supabase.from("interviews").update({ summary }).eq("id", iv.id);
        }
      } catch (err) {
        console.error("interview summary failed", err);
      }
    }

    const quotes = transcript
      .filter((m) => m.role === "respondent" && m.content.length > 40)
      .map((m) => m.content);

    const r = iv.respondent_id ? respondentsById.get(iv.respondent_id) : null;
    interviewPayload.push({
      summary,
      respondent: r
        ? {
            age_range: r.age_range,
            gender: r.gender,
            location: r.location,
            occupation: r.occupation,
            usage_frequency: r.usage_frequency,
          }
        : undefined,
      quotes,
    });
  }

  try {
    const { value: result, provider } = await generateJSON<ReportResult>({
      system: REPORT_SYSTEM,
      user: REPORT_USER({
        title: project.title,
        audience: project.target_audience ?? "",
        question: project.research_question ?? "",
        insights,
        interviews: interviewPayload,
      }),
      maxTokens: 6000,
      tier: "synthesis",
    });

    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        project_id: id,
        summary: result.summary,
        secondary_findings: result.secondary_findings,
        primary_findings: result.primary_findings,
        strategic_opportunities: result.strategic_opportunities,
        positioning: result.positioning,
        messaging: result.messaging,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      ok: true,
      report_id: report?.id,
      provider,
      interviews_used: interviewPayload.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
