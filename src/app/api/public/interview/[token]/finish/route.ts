import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { loadPublicContext } from "@/lib/public-interview";

export const runtime = "nodejs";

interface FinishBody {
  interview_id: string;
  /** If true, mark as partial/abandoned instead of completed. */
  abandoned?: boolean;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await loadPublicContext(token);
  if (!ctx) return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });

  const body = (await req.json()) as FinishBody;

  const svc = createServiceClient();
  const { data: interview } = await svc
    .from("interviews")
    .select("id, project_id, started_at, status")
    .eq("id", body.interview_id)
    .maybeSingle();
  if (!interview || interview.project_id !== ctx.project.id) {
    return NextResponse.json({ error: "interview_not_found" }, { status: 404 });
  }
  if (interview.status !== "in_progress") {
    // Already closed; idempotent.
    return NextResponse.json({ ok: true, status: interview.status });
  }

  const now = new Date();
  const started = new Date(interview.started_at);
  const duration_seconds = Math.max(0, Math.round((now.getTime() - started.getTime()) / 1000));
  const status = body.abandoned ? "partial" : "completed";

  const { error } = await svc
    .from("interviews")
    .update({
      status,
      completed_at: now.toISOString(),
      duration_seconds,
    })
    .eq("id", body.interview_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, status, duration_seconds });
}
