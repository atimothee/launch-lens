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
  demographic_relevance_score: number;
  primary_demographic: string | null;
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

// New: Author profile extracted from social media
export interface AuthorProfile {
  username?: string;
  age_indicators?: string[];
  location_indicators?: string[];
  occupation_indicators?: string[];
  self_description?: string;
  [key: string]: unknown;
}

export interface ResearchSource {
  id: string;
  project_id: string;
  kind: "reddit" | "web" | "tiktok" | "instagram";
  url: string | null;
  title: string | null;
  excerpt: string | null;
  raw: Record<string, unknown> | null;
  author_profile: AuthorProfile | null;
  demographic_match_score: number;
  demographic_signals: string[] | null;
  created_at: string;
}

// New: Hierarchical evidence system (replaces flat quotes)
export type EvidenceType = "quote" | "statistic" | "observation" | "screenshot";
export type ValidationStatus = "pending" | "verified" | "disputed" | "excluded";

export interface Evidence {
  id: string;
  insight_id: string;
  parent_evidence_id: string | null;
  text: string;
  source_id: string | null;
  source_url: string | null;
  evidence_type: EvidenceType;
  validation_status: ValidationStatus;
  is_fact: boolean | null;
  researcher_notes: string | null;
  media_url: string | null;
  media_type: string | null;
  media_metadata: Record<string, unknown> | null;
  demographic_match_score: number;
  created_at: string;
  updated_at: string;
}

// Evidence with nested children for tree display
export interface EvidenceWithChildren extends Evidence {
  children?: EvidenceWithChildren[];
  source?: ResearchSource;
}

// Evidence with context for researcher UI
export interface EvidenceWithContext extends Evidence {
  project_id: string;
  insight_type: InsightType;
  insight_title: string;
  source_kind: string | null;
  author_profile: AuthorProfile | null;
  demographic_signals: string[] | null;
  hierarchy_depth: number;
}

// Insight with evidence summary
export interface InsightWithEvidenceSummary extends Insight {
  evidence_count: number;
  verified_count: number;
  pending_count: number;
  disputed_count: number;
  avg_evidence_demographic_score: number;
  fact_count: number;
  opinion_count: number;
}

export interface InterviewMessage {
  role: "interviewer" | "respondent" | "system";
  content: string;
  ts?: string;
  stage?: InterviewStage;
}

export type InterviewStatus = "in_progress" | "completed" | "partial" | "abandoned";
export type InterviewMode = "text" | "voice";
export type InterviewStage =
  | "intro"
  | "warmup"
  | "beliefs"
  | "goals"
  | "occasions"
  | "competitive"
  | "concept"
  | "closing";

export interface Interview {
  id: string;
  project_id: string;
  respondent_id: string | null;
  link_id: string | null;
  persona: string | null;
  transcript: InterviewMessage[];
  summary: string | null;
  status: InterviewStatus;
  mode: InterviewMode;
  duration_seconds: number | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewLink {
  id: string;
  project_id: string;
  token: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export interface InterviewRespondent {
  id: string;
  project_id: string;
  interview_id: string | null;
  name: string | null;
  age_range: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  segment_relevance: string | null;
  usage_frequency: string | null;
  notes: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  project_id: string;
  positioning: PositioningAngle[] | null;
  messaging: MessagingAngle[] | null;
  summary: string | null;
  secondary_findings: ResearchFinding[] | null;
  primary_findings: ResearchFinding[] | null;
  strategic_opportunities: StrategicOpportunity[] | null;
  created_at: string;
}

export interface ResearchFinding {
  title: string;
  detail: string;
  evidence: string[];
}

export interface StrategicOpportunity {
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
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

export const INTERVIEW_STAGES: { id: InterviewStage; label: string; description: string }[] = [
  { id: "intro", label: "Introduction", description: "Consent + framing" },
  { id: "warmup", label: "Warm-up", description: "Context about the respondent" },
  { id: "beliefs", label: "Beliefs", description: "What they think is true about the category" },
  { id: "goals", label: "Goals", description: "What they're trying to accomplish + triggers" },
  { id: "occasions", label: "Occasions", description: "When + where they use the category" },
  { id: "competitive", label: "Competitive", description: "How they compare options and brands" },
  { id: "concept", label: "Concept", description: "Reactions to a framing or idea" },
  { id: "closing", label: "Closing", description: "Anything else + wrap" },
];

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
