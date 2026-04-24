import { scrapeReddit } from "./reddit";
import { scrapeTikTok } from "./tiktok";
import { scrapeWeb } from "./web";
import type { ScrapedItem } from "./types";

export type { ScrapedItem, ScrapedKind } from "./types";

export interface ResearchPlan {
  title: string;
  audience: string;
  question: string;
}

export type ProgressEvent =
  | { step: "started"; source: string }
  | { step: "source_done"; source: string; count: number }
  | { step: "source_error"; source: string; error: string };

/**
 * Runs all enabled scrapers in parallel, yielding progress events as each
 * source finishes. Sources that fail don't block the rest.
 */
export async function* runResearch(
  plan: ResearchPlan,
  onItems: (items: ScrapedItem[]) => Promise<void>,
): AsyncGenerator<ProgressEvent> {
  const queries = [
    `${plan.title} ${plan.audience}`,
    `${plan.question}`,
    plan.title,
  ];
  const primary = queries[0];

  const jobs: { name: string; run: () => Promise<ScrapedItem[]> }[] = [
    { name: "reddit", run: () => scrapeReddit(primary, { limit: 10, commentsPerPost: 4 }) },
    { name: "web", run: () => scrapeWeb(primary, { limit: 4 }) },
    { name: "tiktok", run: () => scrapeTikTok(primary, { limit: 10 }) },
  ];

  // Yield a "started" event for each source.
  for (const j of jobs) yield { step: "started", source: j.name };

  // Run in parallel, race for finish order.
  const promises = jobs.map((j) =>
    j.run().then(
      (items) => ({ ok: true as const, name: j.name, items }),
      (err) => ({ ok: false as const, name: j.name, error: err?.message ?? String(err) }),
    ),
  );

  // Drain as they complete.
  const pending = new Set(promises);
  while (pending.size > 0) {
    const done = await Promise.race(
      Array.from(pending).map((p) => p.then((r) => ({ p, r }))),
    );
    pending.delete(done.p);
    if (done.r.ok) {
      await onItems(done.r.items);
      yield { step: "source_done", source: done.r.name, count: done.r.items.length };
    } else {
      yield { step: "source_error", source: done.r.name, error: done.r.error };
    }
  }
}
