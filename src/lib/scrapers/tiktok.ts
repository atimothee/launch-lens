import type { ScrapedItem } from "./types";

/**
 * TikTok scraping via Apify. Optional — if APIFY_TOKEN is not set, we return []
 * and the system continues with Reddit + web.
 *
 * Uses Apify's "apidojo/tiktok-scraper" actor (a popular, maintained option).
 * You can swap the actor slug to any TikTok actor you prefer.
 */
export async function scrapeTikTok(
  query: string,
  { limit = 15 }: { limit?: number } = {},
): Promise<ScrapedItem[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) return [];

  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/apidojo~tiktok-scraper/run-sync-get-dataset-items?token=${token}&timeout=60`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchQueries: [query],
          resultsPerPage: limit,
          shouldDownloadVideos: false,
          shouldDownloadCovers: false,
        }),
        // Apify sync endpoint can take a while; bound it.
        signal: AbortSignal.timeout(90_000),
      },
    );
    if (!runRes.ok) return [];
    const items = (await runRes.json()) as TikTokItem[];
    return items
      .filter((i) => typeof i.text === "string" && i.text.length > 20)
      .slice(0, limit)
      .map((i) => ({
        kind: "tiktok" as const,
        url: i.webVideoUrl ?? null,
        title: i.authorMeta?.name ? `@${i.authorMeta.name}` : null,
        excerpt: [i.text, ...(i.hashtags ?? []).map((h) => `#${h}`)]
          .filter(Boolean)
          .join(" "),
        raw: { stats: i.playCount, diggCount: i.diggCount },
      }));
  } catch {
    return [];
  }
}

type TikTokItem = {
  text?: string;
  webVideoUrl?: string;
  authorMeta?: { name?: string };
  hashtags?: string[];
  playCount?: number;
  diggCount?: number;
};
