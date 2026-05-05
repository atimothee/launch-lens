export type ScrapedKind = "reddit" | "web" | "tiktok" | "instagram";

export interface ScrapedItem {
  kind: ScrapedKind;
  url: string | null;
  title: string | null;
  excerpt: string;
  raw?: Record<string, unknown>;
  author_profile?: {
    username?: string;
    age_indicators?: string[];
    location_indicators?: string[];
    occupation_indicators?: string[];
    self_description?: string;
    [key: string]: unknown;
  } | null;
  demographic_match_score?: number;
  demographic_signals?: string[] | null;
}
