/**
 * Instagram scraper using Apify.
 * 
 * Scrapes Instagram posts, captions, and comments via hashtags or account searches.
 * Requires APIFY_TOKEN environment variable.
 */

import type { ScrapedItem } from "./types";

interface InstagramPost {
    url?: string;
    caption?: string;
    ownerUsername?: string;
    ownerFullName?: string;
    likesCount?: number;
    commentsCount?: number;
    timestamp?: string;
    comments?: Array<{
        text: string;
        ownerUsername: string;
        timestamp?: string;
    }>;
}

interface InstagramScraperOptions {
    hashtags?: string[];
    accounts?: string[];
    limit?: number;
    includeComments?: boolean;
}

/**
 * Scrape Instagram content via Apify.
 * Falls back gracefully if APIFY_TOKEN is not set.
 */
export async function scrapeInstagram(
    query: string,
    options: InstagramScraperOptions = {}
): Promise<ScrapedItem[]> {
    const token = process.env.APIFY_TOKEN;

    if (!token) {
        console.warn("APIFY_TOKEN not set, skipping Instagram scraping");
        return [];
    }

    const {
        hashtags = [],
        accounts = [],
        limit = 20,
        includeComments = true,
    } = options;

    // If no specific hashtags/accounts provided, derive from query
    const searchHashtags = hashtags.length > 0
        ? hashtags
        : [query.toLowerCase().replace(/\s+/g, "")];

    try {
        console.log(`Scraping Instagram: hashtags=${searchHashtags.join(", ")}, accounts=${accounts.join(", ")}`);

        const res = await fetch(
            `https://api.apify.com/v2/acts/apify~instagram-scraper/run-sync-get-dataset-items?token=${token}&timeout=120`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Search by hashtags
                    hashtags: searchHashtags,

                    // Or search specific accounts
                    directUrls: accounts.map(a =>
                        a.startsWith("http") ? a : `https://instagram.com/${a}`
                    ),

                    // Limits
                    resultsLimit: limit,
                    searchLimit: 1,

                    // What to scrape
                    searchType: hashtags.length > 0 ? "hashtag" : "user",

                    // Include comments for richer voice
                    scrapeComments: includeComments,
                    maxComments: includeComments ? 10 : 0,

                    // Proxy settings
                    proxy: {
                        useApifyProxy: true,
                        apifyProxyGroups: ["RESIDENTIAL"],
                    },
                }),
                signal: AbortSignal.timeout(130_000),
            }
        );

        if (!res.ok) {
            const errorText = await res.text().catch(() => "");
            throw new Error(
                `Instagram scraper failed: ${res.status} ${errorText}`.slice(0, 300)
            );
        }

        const posts = (await res.json()) as InstagramPost[];
        console.log(`Instagram scraper returned ${posts.length} posts`);

        return convertInstagramPosts(posts);
    } catch (error) {
        console.error("Instagram scraping failed:", error);
        // Return empty array on error - don't block the entire research pipeline
        return [];
    }
}

/**
 * Convert Apify Instagram posts to our ScrapedItem format.
 */
function convertInstagramPosts(posts: InstagramPost[]): ScrapedItem[] {
    const items: ScrapedItem[] = [];

    for (const post of posts) {
        // Skip posts without meaningful content
        if (!post.caption && (!post.comments || post.comments.length === 0)) {
            continue;
        }

        // Main post with caption
        if (post.caption && post.caption.length >= 20) {
            items.push({
                kind: "instagram",
                url: post.url ?? null,
                title: `Instagram post by @${post.ownerUsername || "unknown"}`,
                excerpt: post.caption,
                raw: {
                    author: post.ownerUsername,
                    author_bio: post.ownerFullName,
                    likes: post.likesCount,
                    comments_count: post.commentsCount,
                    timestamp: post.timestamp,
                },
            });
        }

        // Comments as separate items (they often contain rich customer voice)
        if (post.comments && post.comments.length > 0) {
            for (const comment of post.comments) {
                // Skip very short comments
                if (!comment.text || comment.text.length < 30) continue;

                items.push({
                    kind: "instagram",
                    url: post.url ?? null,
                    title: `Comment by @${comment.ownerUsername} on Instagram post`,
                    excerpt: comment.text,
                    raw: {
                        author: comment.ownerUsername,
                        parent_post_author: post.ownerUsername,
                        timestamp: comment.timestamp,
                    },
                });
            }
        }
    }

    console.log(`Converted ${posts.length} Instagram posts into ${items.length} scraped items`);
    return items;
}

/**
 * Helper: Extract hashtags from a query string.
 */
export function extractHashtags(query: string): string[] {
    // Remove common words and convert to hashtag format
    const words = query
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(w => w.length > 2 && !isCommonWord(w));

    return words.map(w => w.replace(/^#/, ""));
}

/**
 * Helper: Check if a word is too common to be a useful hashtag.
 */
function isCommonWord(word: string): boolean {
    const common = new Set([
        "the", "and", "for", "are", "but", "not", "you", "all", "can", "her",
        "was", "one", "our", "out", "day", "get", "has", "him", "his", "how",
        "its", "may", "new", "now", "old", "see", "two", "who", "boy", "did",
        "use", "way", "what", "when", "with", "your",
    ]);
    return common.has(word.toLowerCase());
}

/**
 * Helper: Suggest Instagram accounts to scrape based on query.
 * This is a placeholder - in production, you'd want a more sophisticated
 * account discovery mechanism.
 */
export function suggestInstagramAccounts(query: string): string[] {
    const lower = query.toLowerCase();

    // Example: protein drinks -> suggest fitness influencer accounts
    if (/protein|fitness|workout|gym/i.test(lower)) {
        return []; // Could return known fitness accounts
    }

    // Example: water bottles -> suggest eco/sustainability accounts
    if (/water bottle|hydration|reusable/i.test(lower)) {
        return []; // Could return eco-lifestyle accounts
    }

    return [];
}

// Made with Bob
