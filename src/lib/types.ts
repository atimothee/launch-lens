export type InsightType = "belief" | "goal" | "context" | "pattern";

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_audience: string | null;
  research_question: string | null;
  status: "draft" | "running" | "ready" | "error";
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  project_id: string;
  type: InsightType;
  title: string;
  content: string;
  tension: string | null;
  confidence: number;
  created_at: string;
}

export interface Quote {
  id: string;
  insight_id: string;
  text: string;
  source: string | null;
  source_url: string | null;
  created_at: string;
}

export interface ResearchSource {
  id: string;
  project_id: string;
  kind: "reddit" | "web" | "tiktok";
  url: string | null;
  title: string | null;
  excerpt: string | null;
  raw: Record<string, unknown> | null;
  created_at: string;
}

export interface InterviewMessage {
  role: "interviewer" | "respondent" | "system";
  content: string;
  ts?: string;
}

export interface Interview {
  id: string;
  project_id: string;
  persona: string | null;
  transcript: InterviewMessage[];
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Report {
  id: string;
  project_id: string;
  positioning: PositioningAngle[] | null;
  messaging: MessagingAngle[] | null;
  summary: string | null;
  created_at: string;
}

export interface PositioningAngle {
  title: string;
  from: string;
  to: string;
  rationale: string;
}

export interface MessagingAngle {
  headline: string;
  body: string;
  target_segment: string;
}

export const INSIGHT_META: Record<
  InsightType,
  { label: string; color: string; description: string }
> = {
  belief: {
    label: "Customer Beliefs",
    color: "var(--color-belief)",
    description: "What people think is true",
  },
  goal: {
    label: "Customer Goals",
    color: "var(--color-goal)",
    description: "What they are trying to accomplish",
  },
  context: {
    label: "Usage Contexts",
    color: "var(--color-context)",
    description: "When and where they use the category",
  },
  pattern: {
    label: "Market Patterns",
    color: "var(--color-pattern)",
    description: "Tensions and repeated structures across the market",
  },
};
