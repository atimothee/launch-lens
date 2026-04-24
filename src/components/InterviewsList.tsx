import Link from "next/link";
import type { Interview, InterviewRespondent, InterviewStatus } from "@/lib/types";

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

export function InterviewsList({
  projectId,
  interviews,
  respondentsById,
}: {
  projectId: string;
  interviews: Interview[];
  respondentsById: Record<string, InterviewRespondent>;
}) {
  if (interviews.length === 0) {
    return (
      <div className="panel-soft p-6 text-center text-sm text-[color:var(--color-fg-muted)]">
        No interviews collected yet. Share a link above to start collecting.
      </div>
    );
  }
  return (
    <div className="panel p-0 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-5 py-2.5 border-b border-[color:var(--color-border)] text-[11px] uppercase tracking-wider text-[color:var(--color-fg-dim)]">
        <span>Respondent</span>
        <span>Mode</span>
        <span>Status</span>
        <span>Duration</span>
        <span>Completed</span>
      </div>
      <ul>
        {interviews.map((iv) => {
          const r = iv.respondent_id ? respondentsById[iv.respondent_id] : null;
          const demographics = r
            ? [r.age_range, r.gender, r.location].filter(Boolean).join(" · ")
            : "";
          return (
            <li
              key={iv.id}
              className="border-b border-[color:var(--color-border-soft)] last:border-0"
            >
              <Link
                href={`/projects/${projectId}/interviews/${iv.id}`}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-5 py-3 hover:bg-[color:var(--color-panel-2)] transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium tracking-tight truncate">
                    {r?.name || "Anonymous respondent"}
                  </div>
                  {demographics && (
                    <div className="text-xs text-[color:var(--color-fg-dim)] truncate">
                      {demographics}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[color:var(--color-fg-muted)]">
                  {iv.mode === "voice" ? "🎙 Voice" : "Text"}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="dot" style={{ background: STATUS_COLOR[iv.status] }} />
                  <span className="text-xs text-[color:var(--color-fg-muted)]">
                    {STATUS_LABEL[iv.status]}
                  </span>
                </div>
                <span className="text-xs text-[color:var(--color-fg-dim)]">
                  {formatDuration(iv.duration_seconds)}
                </span>
                <span className="text-xs text-[color:var(--color-fg-dim)]">
                  {iv.completed_at
                    ? new Date(iv.completed_at).toLocaleDateString()
                    : new Date(iv.created_at).toLocaleDateString()}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}
