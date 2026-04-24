import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claudeJSON, MODELS } from "@/lib/claude";
import { REPORT_SYSTEM, REPORT_USER, INTERVIEW_SUMMARY_SYSTEM, INTERVIEW_SUMMARY_USER } from "@/lib/prompts";
import type { MessagingAngle, PositioningAngle } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 180;

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

  // Summarize any interviews we have (only those with >= 4 turns to be worth summarizing).
  const { data: interviews } = await supabase
    .from("interviews")
    .select("id,transcript,summary")
    .eq("project_id", id);

  const interviewSummaries: string[] = [];
  for (const iv of interviews ?? []) {
    const transcript = (iv.transcript ?? []) as { role: string; content: string }[];
    if (transcript.length < 4) continue;
    if (iv.summary) {
      interviewSummaries.push(iv.summary);
      continue;
    }
    try {
      const sum = await claudeJSON<{ summary: string }>({
        system: INTERVIEW_SUMMARY_SYSTEM,
        user: INTERVIEW_SUMMARY_USER({ title: project.title, transcript }),
        maxTokens: 1200,
      });
      if (sum.summary) {
        interviewSummaries.push(sum.summary);
        await supabase
          .from("interviews")
          .update({ summary: sum.summary })
          .eq("id", iv.id);
      }
    } catch (err) {
      console.error("interview summary failed", err);
    }
  }

  try {
    const result = await claudeJSON<{
      summary: string;
      positioning: PositioningAngle[];
      messaging: MessagingAngle[];
    }>({
      model: MODELS.synthesis,
      system: REPORT_SYSTEM,
      user: REPORT_USER({
        title: project.title,
        audience: project.target_audience ?? "",
        question: project.research_question ?? "",
        insights,
        interviewSummaries,
      }),
      maxTokens: 4000,
    });

    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        project_id: id,
        summary: result.summary,
        positioning: result.positioning,
        messaging: result.messaging,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, report_id: report?.id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
