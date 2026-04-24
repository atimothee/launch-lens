import type { ScrapedItem } from "./types";

/**
 * Web voice-of-customer scraper.
 *
 * Two backends:
 *   1. Tavily (https://tavily.com) — used when TAVILY_API_KEY is set.
 *      Purpose-built for LLM research: returns article content pre-chunked,
 *      works from any IP, 1k req/mo free.
 *   2. DuckDuckGo HTML + readable text — free fallback. Works locally but
 *      flaky from datacenter IPs (Vercel etc.) as DDG rate-limits those.
 */
export async function scrapeWeb(
  query: string,
  { limit = 5 }: { limit?: number } = {},
): Promise<ScrapedItem[]> {
  if (process.env.TAVILY_API_KEY) {
    return scrapeWebViaTavily(query, limit);
  }
  return scrapeWebViaDDG(query, limit);
}

async function scrapeWebViaTavily(query: string, limit: number): Promise<ScrapedItem[]> {
  const key = process.env.TAVILY_API_KEY!;
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "basic",
      max_results: limit,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as TavilyResponse;
  return (json.results ?? [])
    .filter((r) => r.content && r.content.length > 80)
    .slice(0, limit)
    .map((r) => ({
      kind: "web" as const,
      url: r.url,
      title: r.title,
      excerpt: r.content,
    }));
}

async function scrapeWebViaDDG(query: string, limit: number): Promise<ScrapedItem[]> {
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

type TavilyResponse = {
  results?: Array<{
    title: string;
    url: string;
    content: string;
  }>;
};
