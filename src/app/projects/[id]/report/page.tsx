import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReportView } from "./ReportView";
import type { MessagingAngle, PositioningAngle } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReportTab({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .maybeSingle();

  const { count: insightCount } = await supabase
    .from("insights")
    .select("*", { count: "exact", head: true })
    .eq("project_id", id);

  return (
    <ReportView
      projectId={id}
      project={{
        title: project.title,
        audience: project.target_audience,
        question: project.research_question,
      }}
      report={
        report
          ? {
              summary: report.summary ?? null,
              positioning: (report.positioning ?? null) as PositioningAngle[] | null,
              messaging: (report.messaging ?? null) as MessagingAngle[] | null,
              created_at: report.created_at,
            }
          : null
      }
      insightCount={insightCount ?? 0}
    />
  );
}
