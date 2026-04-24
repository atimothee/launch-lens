import { InsightCard } from "./InsightCard";
import { INSIGHT_META, type Insight, type InsightType, type Quote } from "@/lib/types";

export function InsightsGrid({
  insights,
  quotesByInsight,
}: {
  insights: Insight[];
  quotesByInsight: Record<string, Quote[]>;
}) {
  const groups: InsightType[] = ["belief", "goal", "context", "pattern"];
  const byType = new Map<InsightType, Insight[]>();
  for (const t of groups) byType.set(t, []);
  for (const i of insights) byType.get(i.type)?.push(i);

  return (
    <div className="space-y-10">
      {groups.map((t) => {
        const items = byType.get(t) ?? [];
        if (items.length === 0) return null;
        const meta = INSIGHT_META[t];
        return (
          <section key={t}>
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className="dot" style={{ background: meta.color }} />
                <h2 className="text-lg font-medium tracking-tight">{meta.label}</h2>
                <span className="text-xs text-[color:var(--color-fg-dim)]">
                  {items.length}
                </span>
              </div>
              <p className="text-xs text-[color:var(--color-fg-dim)]">{meta.description}</p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {items.map((i) => (
                <InsightCard
                  key={i.id}
                  insight={i}
                  quotes={quotesByInsight[i.id] ?? []}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
