"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MessagingAngle, PositioningAngle } from "@/lib/types";

export function ReportView({
  projectId,
  project,
  report,
  insightCount,
}: {
  projectId: string;
  project: { title: string; audience: string | null; question: string | null };
  report: {
    summary: string | null;
    positioning: PositioningAngle[] | null;
    messaging: MessagingAngle[] | null;
    created_at: string;
  } | null;
  insightCount: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    start(async () => {
      const res = await fetch(`/api/projects/${projectId}/report`, { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(`Failed (${res.status}): ${text.slice(0, 200)}`);
        return;
      }
      router.refresh();
    });
  }

  function downloadMarkdown() {
    const md = toMarkdown(project, report);
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${slugify(project.title)}-report.md`;
    a.click();
  }

  if (insightCount === 0) {
    return (
      <div className="panel p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
        You need at least a few insights before you can generate a report. Run research
        on the <span className="text-[color:var(--color-fg)]">Insights</span> tab first.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="panel p-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-medium tracking-tight">Report</h3>
          <p className="text-xs text-[color:var(--color-fg-dim)] mt-0.5">
            {report
              ? `Generated ${new Date(report.created_at).toLocaleString()}`
              : "Not generated yet."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <button onClick={downloadMarkdown} className="btn text-sm">
              Export .md
            </button>
          )}
          <button onClick={generate} disabled={pending} className="btn btn-primary text-sm">
            {pending ? "Generating…" : report ? "Regenerate" : "Generate report"}
          </button>
        </div>
      </div>

      {error && (
        <div className="panel-soft p-3 text-sm text-red-400">{error}</div>
      )}

      {report?.summary && (
        <section className="panel p-6">
          <h2 className="text-lg font-medium tracking-tight">Executive summary</h2>
          <p className="mt-2 text-[color:var(--color-fg)] leading-relaxed">{report.summary}</p>
        </section>
      )}

      {report?.positioning && report.positioning.length > 0 && (
        <section>
          <h2 className="text-lg font-medium tracking-tight">Positioning angles</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {report.positioning.map((p, i) => (
              <div key={i} className="panel p-5 fade-up">
                <h3 className="font-medium tracking-tight">{p.title}</h3>
                <div className="mt-3 grid grid-cols-[auto_1fr] gap-2 text-sm">
                  <span className="text-[color:var(--color-fg-dim)]">from</span>
                  <span className="text-[color:var(--color-fg-muted)]">{p.from}</span>
                  <span className="text-[color:var(--color-fg-dim)]">to</span>
                  <span className="text-[color:var(--color-fg)]">{p.to}</span>
                </div>
                <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">{p.rationale}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {report?.messaging && report.messaging.length > 0 && (
        <section>
          <h2 className="text-lg font-medium tracking-tight">Messaging</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {report.messaging.map((m, i) => (
              <div key={i} className="panel p-5 fade-up">
                <h3 className="text-xl font-semibold tracking-tight leading-snug">
                  {m.headline}
                </h3>
                <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">{m.body}</p>
                <p className="mt-3 text-[11px] uppercase tracking-wider text-[color:var(--color-fg-dim)]">
                  {m.target_segment}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function toMarkdown(
  project: { title: string; audience: string | null; question: string | null },
  report: {
    summary: string | null;
    positioning: PositioningAngle[] | null;
    messaging: MessagingAngle[] | null;
  } | null,
) {
  if (!report) return `# ${project.title}\n\n(No report generated.)\n`;
  const lines: string[] = [];
  lines.push(`# ${project.title}`);
  if (project.audience) lines.push(`\n**Audience:** ${project.audience}`);
  if (project.question) lines.push(`\n**Research question:** ${project.question}`);
  if (report.summary) lines.push(`\n## Executive summary\n\n${report.summary}`);
  if (report.positioning?.length) {
    lines.push(`\n## Positioning angles`);
    for (const p of report.positioning) {
      lines.push(`\n### ${p.title}\n- **From:** ${p.from}\n- **To:** ${p.to}\n\n${p.rationale}`);
    }
  }
  if (report.messaging?.length) {
    lines.push(`\n## Messaging`);
    for (const m of report.messaging) {
      lines.push(`\n### ${m.headline}\n${m.body}\n\n_${m.target_segment}_`);
    }
  }
  return lines.join("\n");
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
