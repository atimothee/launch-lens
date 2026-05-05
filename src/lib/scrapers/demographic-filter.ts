/**
 * Demographic filtering and enrichment for scraped content.
 * 
 * This module adds demographic matching to scraped items, helping ensure
 * insights come from the target customer demographic (e.g., "boomers" for
 * protein drinks research).
 */

import { generateJSON } from "@/lib/ai/model-router";
import { DEMOGRAPHIC_MATCHER_SYSTEM, DEMOGRAPHIC_MATCHER_USER } from "@/lib/prompts";
import type { ScrapedItem } from "./types";
import type { AuthorProfile } from "@/lib/types";

interface DemographicMatchResult {
    match_score: number;
    confidence: "low" | "medium" | "high";
    signals: string[];
    reasoning: string;
}

/**
 * Extract author profile from scraped item metadata.
 * Different platforms provide different profile data.
 */
export function extractAuthorProfile(item: ScrapedItem): AuthorProfile | null {
    if (!item.raw) return null;

    const profile: AuthorProfile = {};

    // Reddit-specific extraction
    if (item.kind === "reddit") {
        const raw = item.raw as {
            subreddit?: string;
            author?: string;
            author_flair_text?: string;
        };

        if (raw.author) {
            profile.username = raw.author;
        }

        // Subreddit can be a demographic signal
        if (raw.subreddit) {
            profile.location_indicators = [raw.subreddit];
        }

        // Flair often contains age/occupation info
        if (raw.author_flair_text) {
            profile.self_description = raw.author_flair_text;
        }
    }

    // Instagram-specific extraction
    if (item.kind === "instagram") {
        const raw = item.raw as {
            author?: string;
            author_bio?: string;
            author_full_name?: string;
        };

        if (raw.author) {
            profile.username = raw.author;
        }

        if (raw.author_bio) {
            profile.self_description = raw.author_bio;

            // Extract age indicators from bio
            const ageMatches = raw.author_bio.match(/\b(\d{2})\b|born in (\d{4})|age (\d{2})/gi);
            if (ageMatches) {
                profile.age_indicators = ageMatches;
            }

            // Extract location from bio
            const locationMatches = raw.author_bio.match(/📍\s*([^|•\n]+)|from ([^|•\n]+)/gi);
            if (locationMatches) {
                profile.location_indicators = locationMatches.map(m => m.trim());
            }
        }
    }

    // TikTok-specific extraction
    if (item.kind === "tiktok") {
        const raw = item.raw as {
            author?: string;
            author_bio?: string;
        };

        if (raw.author) {
            profile.username = raw.author;
        }

        if (raw.author_bio) {
            profile.self_description = raw.author_bio;
        }
    }

    // Web articles - limited profile data
    if (item.kind === "web") {
        const raw = item.raw as {
            author?: string;
            site?: string;
        };

        if (raw.author) {
            profile.username = raw.author;
        }
    }

    return Object.keys(profile).length > 0 ? profile : null;
}

/**
 * Use AI to match content against target demographic.
 * Returns a confidence score and specific signals found.
 */
export async function matchDemographic(args: {
    target_demographic: string;
    content: string;
    author_profile?: AuthorProfile | null;
}): Promise<DemographicMatchResult> {
    try {
        const { value } = await generateJSON<DemographicMatchResult>({
            system: DEMOGRAPHIC_MATCHER_SYSTEM,
            user: DEMOGRAPHIC_MATCHER_USER({
                target_demographic: args.target_demographic,
                content: args.content,
                author_profile: args.author_profile || null,
            }),
            maxTokens: 500,
            tier: "workhorse", // Use faster model for demographic matching
        });

        // Validate and clamp score
        const match_score = Math.max(0, Math.min(1, value.match_score || 0));

        return {
            match_score,
            confidence: value.confidence || "low",
            signals: value.signals || [],
            reasoning: value.reasoning || "No reasoning provided",
        };
    } catch (error) {
        console.error("Demographic matching failed:", error);
        // Return neutral score on error
        return {
            match_score: 0.5,
            confidence: "low",
            signals: [],
            reasoning: "Error during demographic matching",
        };
    }
}

/**
 * Enrich scraped items with demographic data.
 * This is the main entry point for the demographic filtering pipeline.
 */
export async function enrichWithDemographics(
    items: ScrapedItem[],
    targetDemographic: string,
    options: {
        batchSize?: number;
        minScore?: number;
    } = {}
): Promise<ScrapedItem[]> {
    const { batchSize = 5, minScore = 0.0 } = options;

    console.log(`Enriching ${items.length} items with demographic data...`);

    // Process in batches to avoid rate limits
    const enriched: ScrapedItem[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const batchResults = await Promise.all(
            batch.map(async (item) => {
                // 1. Extract author profile
                const author_profile = extractAuthorProfile(item);

                // 2. Run AI demographic matching
                const match = await matchDemographic({
                    target_demographic: targetDemographic,
                    content: item.excerpt,
                    author_profile,
                });

                // 3. Return enriched item
                return {
                    ...item,
                    author_profile,
                    demographic_match_score: match.match_score,
                    demographic_signals: match.signals,
                };
            })
        );

        enriched.push(...batchResults);

        // Log progress
        console.log(
            `Processed ${Math.min(i + batchSize, items.length)}/${items.length} items`
        );
    }

    // Filter by minimum score if specified
    const filtered = minScore > 0
        ? enriched.filter(item => (item.demographic_match_score ?? 0) >= minScore)
        : enriched;

    // Sort by demographic match score (highest first)
    filtered.sort((a, b) => (b.demographic_match_score ?? 0) - (a.demographic_match_score ?? 0));

    console.log(
        `Demographic enrichment complete. ${filtered.length}/${items.length} items above threshold (${minScore})`
    );

    // Log distribution
    const highMatch = filtered.filter(i => (i.demographic_match_score ?? 0) >= 0.7).length;
    const mediumMatch = filtered.filter(i => {
        const score = i.demographic_match_score ?? 0;
        return score >= 0.4 && score < 0.7;
    }).length;
    const lowMatch = filtered.filter(i => (i.demographic_match_score ?? 0) < 0.4).length;

    console.log(`Distribution: ${highMatch} high (≥70%), ${mediumMatch} medium (40-69%), ${lowMatch} low (<40%)`);

    return filtered;
}

/**
 * Quick demographic check without full enrichment.
 * Useful for filtering before expensive operations.
 */
export async function quickDemographicCheck(
    content: string,
    targetDemographic: string
): Promise<number> {
    const match = await matchDemographic({
        target_demographic: targetDemographic,
        content: content.slice(0, 1000), // Use first 1000 chars for speed
        author_profile: null,
    });

    return match.match_score;
}

/**
 * Extract demographic indicators from text using simple heuristics.
 * Faster than AI but less accurate. Good for pre-filtering.
 */
export function extractDemographicHeuristics(text: string): {
    age_indicators: string[];
    generation_indicators: string[];
    life_stage_indicators: string[];
} {
    const lower = text.toLowerCase();

    const age_indicators: string[] = [];
    const generation_indicators: string[] = [];
    const life_stage_indicators: string[] = [];

    // Age patterns
    const ageMatches = text.match(/\b(I'm|I am|age)\s*(\d{2})\b/gi);
    if (ageMatches) age_indicators.push(...ageMatches);

    const birthYearMatches = text.match(/\bborn in (\d{4})\b/gi);
    if (birthYearMatches) age_indicators.push(...birthYearMatches);

    // Generation markers
    if (/\b(boomer|baby boomer)\b/i.test(text)) generation_indicators.push("Baby Boomer");
    if (/\b(gen x|generation x)\b/i.test(text)) generation_indicators.push("Gen X");
    if (/\b(millennial|gen y)\b/i.test(text)) generation_indicators.push("Millennial");
    if (/\b(gen z|zoomer)\b/i.test(text)) generation_indicators.push("Gen Z");

    // Life stage markers
    if (/\b(retired|retirement)\b/i.test(text)) life_stage_indicators.push("retired");
    if (/\b(college|university|student)\b/i.test(text)) life_stage_indicators.push("student");
    if (/\b(parent|mom|dad|kids|children)\b/i.test(text)) life_stage_indicators.push("parent");
    if (/\b(grandparent|grandma|grandpa|grandkids)\b/i.test(text)) life_stage_indicators.push("grandparent");
    if (/\b(career|professional|work)\b/i.test(text)) life_stage_indicators.push("working professional");

    return {
        age_indicators,
        generation_indicators,
        life_stage_indicators,
    };
}

// Made with Bob
