import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStream } from "@/lib/ai/model-router";
import { INTERVIEWER_SYSTEM, INTERVIEW_OPENER_USER } from "@/lib/prompts";
import type { InterviewMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  req: Request,
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

  const body = (await req.json()) as {
    action: "start" | "turn";
    interviewId?: string;
    persona?: string;
    respondent?: string;
  };

  const { data: insights } = await supabase
    .from("insights")
    .select("type,title,content")
    .eq("project_id", id)
    .limit(12);

  const system = INTERVIEWER_SYSTEM({
    title: project.title,
    audience: project.target_audience ?? "",
    question: project.research_question ?? "",
    persona: body.persona ?? "",
    insights: insights ?? [],
  });

  // Load or create interview row.
  let interviewId = body.interviewId;
  let transcript: InterviewMessage[] = [];

  if (body.action === "start" || !interviewId) {
    const { data: created, error } = await supabase
      .from("interviews")
      .insert({
        project_id: id,
        persona: body.persona || null,
        transcript: [],
      })
      .select("id,transcript")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: error?.message ?? "insert_failed" }, { status: 500 });
    }
    interviewId = created.id;
    transcript = [];
  } else {
    const { data: existing } = await supabase
      .from("interviews")
      .select("transcript")
      .eq("id", interviewId)
      .maybeSingle();
    transcript = (existing?.transcript ?? []) as InterviewMessage[];
  }

  // Build Claude message history.
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of transcript) {
    if (m.role === "interviewer") messages.push({ role: "assistant", content: m.content });
    else if (m.role === "respondent") messages.push({ role: "user", content: m.content });
  }

  if (body.action === "start") {
    messages.push({ role: "user", content: INTERVIEW_OPENER_USER });
  } else if (body.action === "turn" && body.respondent) {
    // We already appended the respondent message to local state client-side,
    // so make sure it's in transcript + messages.
    transcript.push({ role: "respondent", content: body.respondent });
    messages.push({ role: "user", content: body.respondent });
  }

  const encoder = new TextEncoder();
  let accumulated = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of generateStream({
          system,
          messages,
          maxTokens: 600,
          tier: "workhorse",
        })) {
          accumulated += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(`\n[error: ${err instanceof Error ? err.message : String(err)}]`),
        );
      } finally {
        // Persist final transcript including the assistant turn.
        transcript.push({ role: "interviewer", content: accumulated });
        await supabase
          .from("interviews")
          .update({ transcript, persona: body.persona || null })
          .eq("id", interviewId!);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "x-interview-id": interviewId!,
      "X-Accel-Buffering": "no",
    },
  });
}
