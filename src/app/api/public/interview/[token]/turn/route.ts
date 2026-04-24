import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { loadPublicContext, loadInterviewForTurn } from "@/lib/public-interview";
import { generateStream } from "@/lib/ai/model-router";
import { INTERVIEWER_SYSTEM, INTERVIEW_OPENER_USER } from "@/lib/prompts";
import type { InterviewMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

interface TurnBody {
  interview_id: string;
  action: "start" | "turn";
  respondent_text?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await loadPublicContext(token);
  if (!ctx) return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });

  const body = (await req.json()) as TurnBody;
  const state = await loadInterviewForTurn(body.interview_id);
  if (!state || state.interview.project_id !== ctx.project.id) {
    return NextResponse.json({ error: "interview_not_found" }, { status: 404 });
  }
  if (state.interview.status !== "in_progress") {
    return NextResponse.json({ error: "interview_not_active" }, { status: 409 });
  }

  const svc = createServiceClient();

  const system = INTERVIEWER_SYSTEM({
    title: ctx.project.title,
    description: ctx.project.description,
    audience: ctx.project.target_audience ?? "",
    question: ctx.project.research_question ?? "",
    persona: "",
    insights: state.insights,
    respondent: state.respondent,
    isPublic: true,
  });

  const transcript = (state.interview.transcript ?? []) as InterviewMessage[];
  const messages: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of transcript) {
    if (m.role === "interviewer") messages.push({ role: "assistant", content: m.content });
    else if (m.role === "respondent") messages.push({ role: "user", content: m.content });
  }

  if (body.action === "start") {
    messages.push({ role: "user", content: INTERVIEW_OPENER_USER });
  } else {
    if (!body.respondent_text) {
      return NextResponse.json({ error: "missing_text" }, { status: 400 });
    }
    transcript.push({
      role: "respondent",
      content: body.respondent_text,
      ts: new Date().toISOString(),
    });
    messages.push({ role: "user", content: body.respondent_text });

    // Persist respondent message immediately to interview_messages.
    await svc.from("interview_messages").insert({
      interview_id: body.interview_id,
      role: "respondent",
      content: body.respondent_text,
    });
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
          encoder.encode(
            `\n[error: ${err instanceof Error ? err.message : String(err)}]`,
          ),
        );
      } finally {
        transcript.push({
          role: "interviewer",
          content: accumulated,
          ts: new Date().toISOString(),
        });
        await svc
          .from("interviews")
          .update({ transcript })
          .eq("id", body.interview_id);
        await svc.from("interview_messages").insert({
          interview_id: body.interview_id,
          role: "interviewer",
          content: accumulated,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
