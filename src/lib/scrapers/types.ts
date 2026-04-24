export type ScrapedKind = "reddit" | "web" | "tiktok";

export interface ScrapedItem {
  kind: ScrapedKind;
  url: string | null;
  title: string | null;
  excerpt: string;
  raw?: Record<string, unknown>;
}
