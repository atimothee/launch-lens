import { INSIGHT_META, type Insight, type Quote } from "@/lib/types";

export function InsightCard({
  insight,
  quotes,
}: {
  insight: Insight;
  quotes: Quote[];
}) {
  const meta = INSIGHT_META[insight.type];
  const confidencePct = Math.round(insight.confidence * 100);
  return (
    <article className="panel p-5 fade-up">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="dot" style={{ background: meta.color }} />
          <span className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            {insight.type}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[color:var(--color-fg-dim)]">
          <span title="Confidence">{confidencePct}%</span>
          <div className="h-1 w-14 rounded-full bg-[color:var(--color-border)] overflow-hidden">
            <div
              className="h-full"
              style={{ width: `${confidencePct}%`, background: meta.color }}
            />
          </div>
        </div>
      </div>
      <h3 className="mt-3 text-base font-medium tracking-tight">{insight.title}</h3>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
        {insight.content}
      </p>
      {insight.tension && (
        <div className="mt-3 text-xs text-[color:var(--color-fg-dim)]">
          <span className="uppercase tracking-wider mr-1.5">tension</span>
          {insight.tension}
        </div>
      )}
      {quotes.length > 0 && (
        <div className="mt-4 space-y-2">
          {quotes.slice(0, 3).map((q) => (
            <blockquote
              key={q.id}
              className="border-l-2 pl-3 text-sm italic text-[color:var(--color-fg)]"
              style={{ borderColor: meta.color }}
            >
              "{q.text}"
              {q.source_url && (
                <a
                  href={q.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block not-italic text-[11px] text-[color:var(--color-fg-dim)] mt-1 hover:text-[color:var(--color-accent)]"
                >
                  {q.source ?? hostOf(q.source_url)}
                </a>
              )}
            </blockquote>
          ))}
        </div>
      )}
    </article>
  );
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
