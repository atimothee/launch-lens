import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Interview, InterviewMessage, InterviewRespondent, InterviewStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_COLOR: Record<InterviewStatus, string> = {
  in_progress: "var(--color-accent)",
  completed: "var(--color-goal)",
  partial: "var(--color-pattern)",
  abandoned: "var(--color-fg-dim)",
};

const STATUS_LABEL: Record<InterviewStatus, string> = {
  in_progress: "In progress",
  completed: "Completed",
  partial: "Partial",
  abandoned: "Abandoned",
};

export default async function InterviewDetail({
  params,
}: {
  params: Promise<{ id: string; interviewId: string }>;
}) {
  const { id, interviewId } = await params;
  const supabase = await createClient();

  const { data: interview } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", interviewId)
    .eq("project_id", id)
    .maybeSingle();
  if (!interview) notFound();

  const { data: respondent } = interview.respondent_id
    ? await supabase
        .from("interview_respondents")
        .select("*")
        .eq("id", interview.respondent_id)
        .maybeSingle()
    : { data: null };

  const iv = interview as Interview;
  const r = respondent as InterviewRespondent | null;
  const transcript = (iv.transcript ?? []) as InterviewMessage[];

  return (
    <div className="space-y-6">
      <Link href={`/projects/${id}/interviews`} className="btn btn-ghost text-xs">
        ← Back to interviews
      </Link>

      <div className="grid gap-5 md:grid-cols-[1fr_280px]">
        <section className="panel p-0 overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="dot" style={{ background: STATUS_COLOR[iv.status] }} />
              <h2 className="text-sm font-medium">
                {r?.name || "Anonymous respondent"}
              </h2>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-fg-dim)]">
              <span>{STATUS_LABEL[iv.status]}</span>
              <span>·</span>
              <span>{iv.mode === "voice" ? "Voice" : "Text"}</span>
              <span>·</span>
              <span>
                {iv.duration_seconds != null ? `${Math.round(iv.duration_seconds / 60)}m` : "—"}
              </span>
            </div>
          </header>

          <div className="px-5 py-4 space-y-4">
            {transcript.length === 0 ? (
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                No messages yet.
              </p>
            ) : (
              transcript.map((m, i) => <TranscriptMessage key={i} message={m} />)
            )}
          </div>
        </section>

        <aside className="space-y-4">
          {r && (
            <div className="panel p-5">
              <h3 className="text-sm font-medium tracking-tight">Respondent</h3>
              <dl className="mt-3 space-y-2 text-xs">
                <DemoRow label="Name" value={r.name} />
                <DemoRow label="Age" value={r.age_range} />
                <DemoRow label="Gender" value={r.gender} />
                <DemoRow label="Location" value={r.location} />
                <DemoRow label="Occupation" value={r.occupation} />
                <DemoRow label="Category usage" value={r.usage_frequency} />
                <DemoRow label="Relevance" value={r.segment_relevance} />
                {r.notes && (
                  <div className="pt-2">
                    <dt className="text-[color:var(--color-fg-dim)]">Notes</dt>
                    <dd className="mt-1 text-[color:var(--color-fg-muted)]">{r.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
          {iv.summary && (
            <div className="panel p-5">
              <h3 className="text-sm font-medium tracking-tight">AI summary</h3>
              <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                {iv.summary}
              </p>
            </div>
          )}
          <div className="panel-soft p-4 text-xs text-[color:var(--color-fg-dim)]">
            Started {new Date(iv.started_at ?? iv.created_at).toLocaleString()}
            <br />
            {iv.completed_at
              ? `Completed ${new Date(iv.completed_at).toLocaleString()}`
              : "Not yet completed"}
          </div>
        </aside>
      </div>
    </div>
  );
}

function DemoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <dt className="text-[color:var(--color-fg-dim)]">{label}</dt>
      <dd className="text-[color:var(--color-fg)]">{value}</dd>
    </div>
  );
}

function TranscriptMessage({ message }: { message: InterviewMessage }) {
  if (message.role === "system") {
    return <div className="text-xs text-red-400">{message.content}</div>;
  }
  const isInterviewer = message.role === "interviewer";
  return (
    <div className={isInterviewer ? "flex gap-3" : "flex gap-3 justify-end"}>
      {isInterviewer && (
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium"
          style={{ background: "rgba(255,90,31,0.15)", color: "var(--color-accent)" }}
        >
          AI
        </div>
      )}
      <div
        className={
          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap " +
          (isInterviewer
            ? "bg-[color:var(--color-panel-2)] border border-[color:var(--color-border)]"
            : "bg-[color:var(--color-accent)] text-white")
        }
      >
        {message.content}
      </div>
    </div>
  );
}
