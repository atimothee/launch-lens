import type { ScrapedItem } from "./types";

/**
 * TikTok scraping via Apify.
 *
 * Uses novi/advanced-search-tiktok-api — the most popular TikTok search actor
 * on Apify (millions of runs, actively maintained). The older
 * apidojo/tiktok-scraper has been returning {noResults: true} on search
 * queries in 2025.
 *
 * Optional — if APIFY_TOKEN is not set, returns [] and the pipeline
 * continues with Reddit + web.
 */
export async function scrapeTikTok(
  query: string,
  { limit = 15 }: { limit?: number } = {},
): Promise<ScrapedItem[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  const res = await fetch(
    `https://api.apify.com/v2/acts/novi~advanced-search-tiktok-api/run-sync-get-dataset-items?token=${token}&timeout=150`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: [query],
        limit,
        region: "US",
      }),
      signal: AbortSignal.timeout(160_000),
    },
  );
  if (!res.ok) {
    throw new Error(`Apify TikTok actor failed: ${res.status}`);
  }
  const items = (await res.json()) as TikTokItem[];

  return items
    .filter((i) => !i.noResults)
    .filter((i) => {
      const caption = i.desc ?? i.text ?? "";
      return caption.length >= 20;
    })
    .slice(0, limit)
    .map((i) => {
      const caption = i.desc ?? i.text ?? "";
      const author = i.author?.unique_id ?? i.author?.nickname ?? null;
      return {
        kind: "tiktok" as const,
        url: i.share_url ?? null,
        title: author ? `@${author}` : null,
        excerpt: caption,
        raw: {
          aweme_id: i.aweme_id,
          digg_count: i.statistics?.digg_count,
          play_count: i.statistics?.play_count,
        },
      };
    });
}

type TikTokItem = {
  noResults?: boolean;
  desc?: string;
  text?: string;
  aweme_id?: string;
  share_url?: string;
  author?: {
    unique_id?: string;
    nickname?: string;
  };
  statistics?: {
    digg_count?: number;
    play_count?: number;
  };
};
