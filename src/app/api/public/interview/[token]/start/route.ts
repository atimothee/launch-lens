import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { loadPublicContext } from "@/lib/public-interview";

export const runtime = "nodejs";

interface StartBody {
  consent: boolean;
  mode?: "text" | "voice";
  respondent: {
    name?: string | null;
    age_range?: string | null;
    gender?: string | null;
    location?: string | null;
    occupation?: string | null;
    segment_relevance?: string | null;
    usage_frequency?: string | null;
    notes?: string | null;
  };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await loadPublicContext(token);
  if (!ctx) return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });

  const body = (await req.json()) as StartBody;
  if (!body.consent) {
    return NextResponse.json({ error: "consent_required" }, { status: 400 });
  }

  const svc = createServiceClient();

  // Insert respondent + interview in tandem, then stitch the back-reference.
  const { data: respondent, error: rErr } = await svc
    .from("interview_respondents")
    .insert({
      project_id: ctx.project.id,
      name: body.respondent.name ?? null,
      age_range: body.respondent.age_range ?? null,
      gender: body.respondent.gender ?? null,
      location: body.respondent.location ?? null,
      occupation: body.respondent.occupation ?? null,
      segment_relevance: body.respondent.segment_relevance ?? null,
      usage_frequency: body.respondent.usage_frequency ?? null,
      notes: body.respondent.notes ?? null,
    })
    .select("id")
    .single();
  if (rErr || !respondent) {
    return NextResponse.json(
      { error: rErr?.message ?? "respondent_failed" },
      { status: 500 },
    );
  }

  const { data: interview, error: iErr } = await svc
    .from("interviews")
    .insert({
      project_id: ctx.project.id,
      respondent_id: respondent.id,
      link_id: ctx.link.id,
      status: "in_progress",
      mode: body.mode ?? "text",
      transcript: [],
    })
    .select("id")
    .single();
  if (iErr || !interview) {
    return NextResponse.json(
      { error: iErr?.message ?? "interview_failed" },
      { status: 500 },
    );
  }

  await svc
    .from("interview_respondents")
    .update({ interview_id: interview.id })
    .eq("id", respondent.id);

  return NextResponse.json({ interview_id: interview.id, respondent_id: respondent.id });
}
