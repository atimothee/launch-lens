import type { ScrapedItem } from "./types";

const UA =
  process.env.REDDIT_USER_AGENT ||
  "launchlens/0.1 (educational research; contact admin)";

/**
 * Reddit voice-of-customer scraper.
 *
 * Two backends:
 *   1. Apify (trudax/reddit-scraper-lite) — used when APIFY_TOKEN is set.
 *      Runs through Apify's residential proxies so it works from Vercel's
 *      serverless IPs, which Reddit's public JSON endpoint 403s.
 *   2. Reddit public JSON (no auth) — fallback for local dev when you
 *      don't want to pay Apify credits.
 *
 * Both paths return the same ScrapedItem shape so the rest of the
 * pipeline is oblivious to which backend ran.
 */
export async function scrapeReddit(
  query: string,
  {
    limit = 12,
    commentsPerPost = 5,
  }: { limit?: number; commentsPerPost?: number } = {},
): Promise<ScrapedItem[]> {
  if (process.env.APIFY_TOKEN) {
    return scrapeRedditViaApify(query, { limit, commentsPerPost });
  }
  return scrapeRedditViaPublicJSON(query, { limit, commentsPerPost });
}

async function scrapeRedditViaApify(
  query: string,
  { limit, commentsPerPost }: { limit: number; commentsPerPost: number },
): Promise<ScrapedItem[]> {
  const token = process.env.APIFY_TOKEN!;
  // Budget: a handful of posts × commentsPerPost comments each, capped.
  const maxItems = Math.min(50, limit + limit * commentsPerPost);

  const res = await fetch(
    `https://api.apify.com/v2/acts/trudax~reddit-scraper-lite/run-sync-get-dataset-items?token=${token}&timeout=120`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        searches: [query],
        searchPosts: true,
        searchComments: true,
        searchCommunities: false,
        searchUsers: false,
        sort: "relevance",
        maxItems,
        maxPostCount: limit,
        maxComments: commentsPerPost,
        includeNSFW: false,
        proxy: { useApifyProxy: true },
      }),
      signal: AbortSignal.timeout(130_000),
    },
  );
  if (!res.ok) {
    throw new Error(`Apify Reddit actor failed: ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
  }
  const items = (await res.json()) as ApifyRedditItem[];

  return items
    .filter((it) => {
      const text = it.body || it.title || "";
      return text.length >= 40;
    })
    .slice(0, maxItems)
    .map((it) => ({
      kind: "reddit" as const,
      url: it.url ?? null,
      title:
        it.dataType === "comment"
          ? it.postTitle
            ? `Comment on: ${it.postTitle}`
            : "Reddit comment"
          : it.title ?? null,
      excerpt: [it.title, it.body].filter(Boolean).join("\n\n"),
      raw: {
        dataType: it.dataType,
        subreddit: it.communityName ?? null,
        score: it.upVotes ?? null,
        created: it.createdAt ?? null,
      },
    }));
}

async function scrapeRedditViaPublicJSON(
  query: string,
  { limit, commentsPerPost }: { limit: number; commentsPerPost: number },
): Promise<ScrapedItem[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    query,
  )}&limit=${limit}&sort=relevance&t=year`;

  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Reddit search failed: ${res.status}`);
  }
  const json = (await res.json()) as RedditListing;
  const posts = (json.data?.children ?? []).map((c) => c.data);

  const items: ScrapedItem[] = [];
  const commentFetches = posts.slice(0, limit).map(async (p) => {
    const permalink = `https://www.reddit.com${p.permalink}`;
    const bodyChunks = [p.title, p.selftext].filter(Boolean).join("\n\n");
    items.push({
      kind: "reddit",
      url: permalink,
      title: p.title,
      excerpt: bodyChunks,
      raw: { subreddit: p.subreddit, score: p.score, num_comments: p.num_comments },
    });

    try {
      const cRes = await fetch(`${permalink}.json?limit=${commentsPerPost}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        cache: "no-store",
      });
      if (!cRes.ok) return;
      const cJson = (await cRes.json()) as RedditListing[];
      const commentListing = cJson[1];
      const comments = (commentListing?.data?.children ?? [])
        .filter((c) => c.kind === "t1")
        .slice(0, commentsPerPost)
        .map((c) => c.data);
      for (const cm of comments) {
        if (!cm.body || cm.body.length < 40) continue;
        items.push({
          kind: "reddit",
          url: permalink,
          title: `Comment on: ${p.title}`,
          excerpt: cm.body,
          raw: { subreddit: p.subreddit, score: cm.score },
        });
      }
    } catch {
      // Skip this post's comments on failure — we still have the post body.
    }
  });

  await Promise.all(commentFetches);
  return items;
}

type RedditListing = {
  data?: {
    children?: Array<{
      kind: string;
      data: {
        title: string;
        selftext?: string;
        body?: string;
        permalink: string;
        subreddit: string;
        score: number;
        num_comments: number;
      };
    }>;
  };
};

type ApifyRedditItem = {
  dataType?: "post" | "comment";
  url?: string;
  title?: string;
  body?: string;
  postTitle?: string;
  communityName?: string;
  upVotes?: number;
  createdAt?: string;
};
