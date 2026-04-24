import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShareLinkManager } from "@/components/ShareLinkManager";
import { InterviewsList } from "@/components/InterviewsList";
import type { Interview, InterviewRespondent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InterviewsTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: interviews } = await supabase
    .from("interviews")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const respondentIds = (interviews ?? [])
    .map((i) => i.respondent_id)
    .filter((x): x is string => !!x);

  const { data: respondents } = respondentIds.length
    ? await supabase.from("interview_respondents").select("*").in("id", respondentIds)
    : { data: [] as InterviewRespondent[] };

  const respondentsById: Record<string, InterviewRespondent> = {};
  for (const r of respondents ?? []) {
    respondentsById[r.id] = r as InterviewRespondent;
  }

  return (
    <div className="space-y-6">
      <ShareLinkManager projectId={id} />
      <section>
        <h2 className="text-lg font-medium tracking-tight mb-3">Collected interviews</h2>
        <InterviewsList
          projectId={id}
          interviews={(interviews ?? []) as Interview[]}
          respondentsById={respondentsById}
        />
      </section>
    </div>
  );
}
