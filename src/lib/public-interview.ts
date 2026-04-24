import { createServiceClient } from "@/lib/supabase/server";
import type { Insight, Interview, InterviewRespondent, Project } from "@/lib/types";

export interface PublicInterviewContext {
  link: { id: string; project_id: string; token: string; label: string | null };
  project: Pick<Project, "id" | "title" | "research_question" | "target_audience" | "description">;
}

/**
 * Loads + validates a public interview token. Returns null if the token is
 * missing, inactive, expired, or the project has been deleted.
 */
export async function loadPublicContext(
  token: string,
): Promise<PublicInterviewContext | null> {
  const svc = createServiceClient();
  const { data: link } = await svc
    .from("interview_links")
    .select("id, project_id, token, label, is_active, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!link || !link.is_active) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  const { data: project } = await svc
    .from("projects")
    .select("id, title, research_question, target_audience, description")
    .eq("id", link.project_id)
    .maybeSingle();
  if (!project) return null;

  return {
    link: { id: link.id, project_id: link.project_id, token: link.token, label: link.label },
    project: project as PublicInterviewContext["project"],
  };
}

/**
 * Fetches everything the interviewer prompt needs: current respondent,
 * interview row, top insights.
 */
export async function loadInterviewForTurn(interviewId: string): Promise<{
  interview: Interview;
  respondent: InterviewRespondent | null;
  insights: Pick<Insight, "type" | "title" | "content">[];
} | null> {
  const svc = createServiceClient();
  const { data: interview } = await svc
    .from("interviews")
    .select("*")
    .eq("id", interviewId)
    .maybeSingle();
  if (!interview) return null;

  const { data: respondent } = interview.respondent_id
    ? await svc
        .from("interview_respondents")
        .select("*")
        .eq("id", interview.respondent_id)
        .maybeSingle()
    : { data: null };

  const { data: insights } = await svc
    .from("insights")
    .select("type, title, content")
    .eq("project_id", interview.project_id)
    .limit(12);

  return {
    interview: interview as Interview,
    respondent: (respondent ?? null) as InterviewRespondent | null,
    insights: (insights ?? []) as Pick<Insight, "type" | "title" | "content">[],
  };
}
