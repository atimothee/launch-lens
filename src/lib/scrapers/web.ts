import type { ScrapedItem } from "./types";

/**
 * Minimal "crawl4ai-lite": fetch a handful of URLs from a DuckDuckGo HTML search,
 * then fetch each page and extract readable text. No deps.
 *
 * This is intentionally simple — blog discovery is a "nice to have" source.
 * If DDG's HTML layout changes, we degrade gracefully (return []).
 */
export async function scrapeWeb(
  query: string,
  { limit = 5 }: { limit?: number } = {},
): Promise<ScrapedItem[]> {
  const urls = await ddgSearch(query, limit);
  const results = await Promise.all(urls.map((u) => fetchReadable(u).catch(() => null)));
  return results.filter((x): x is ScrapedItem => x !== null);
}

async function ddgSearch(query: string, limit: number): Promise<string[]> {
  try {
    const res = await fetch(
      `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    const matches = Array.from(
      html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/g),
    );
    const urls: string[] = [];
    for (const m of matches) {
      const raw = m[1];
      // DDG wraps results through /l/?uddg=<urlencoded>
      const u = new URL(raw, "https://duckduckgo.com");
      const uddg = u.searchParams.get("uddg");
      const target = uddg ? decodeURIComponent(uddg) : raw;
      if (target.startsWith("http") && !urls.includes(target)) urls.push(target);
      if (urls.length >= limit) break;
    }
    return urls;
  } catch {
    return [];
  }
}

async function fetchReadable(url: string): Promise<ScrapedItem | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LaunchLensBot/0.1; +https://launchlens.app)",
      Accept: "text/html,application/xhtml+xml",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const html = await res.text();
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "").trim();
  const text = stripHTML(html);
  if (!text || text.length < 400) return null;
  return {
    kind: "web",
    url,
    title,
    excerpt: text.slice(0, 3000),
  };
}

function stripHTML(html: string): string {
  // Drop scripts/styles first, then tags, then decode a handful of entities.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return cleaned
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
