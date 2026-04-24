import type { ScrapedItem } from "./types";

const UA =
  process.env.REDDIT_USER_AGENT ||
  "launchlens/0.1 (educational research; contact admin)";

/**
 * Reddit search via the public JSON endpoint.
 * No API key required for read-only, but a descriptive User-Agent is important
 * to avoid rate-limiting.
 *
 * Returns the top posts and their top comments for a query.
 */
export async function scrapeReddit(
  query: string,
  { limit = 12, commentsPerPost = 5 }: { limit?: number; commentsPerPost?: number } = {},
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

    // Pull a few top comments for voice.
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
