import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InsightsGrid } from "@/components/InsightsGrid";
import { ResearchRunner } from "@/components/ResearchRunner";
import type { Insight, Quote } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function InsightsTabPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { id } = await params;
  const { run } = await searchParams;

  const supabase = await createClient();
  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  const { data: insights } = await supabase
    .from("insights")
    .select("*")
    .eq("project_id", id)
    .order("confidence", { ascending: false });

  const insightIds = (insights ?? []).map((i) => i.id);
  const { data: quotes } = insightIds.length
    ? await supabase.from("quotes").select("*").in("insight_id", insightIds)
    : { data: [] as Quote[] };

  const quotesByInsight: Record<string, Quote[]> = {};
  for (const q of quotes ?? []) {
    (quotesByInsight[q.insight_id] ??= []).push(q);
  }

  const hasResearch = (insights?.length ?? 0) > 0;
  const shouldAutoRun = run === "1" && !hasResearch;

  return (
    <div className="space-y-8">
      <ResearchRunner projectId={id} autoStart={shouldAutoRun} />

      {hasResearch ? (
        <InsightsGrid
          insights={(insights ?? []) as Insight[]}
          quotesByInsight={quotesByInsight}
        />
      ) : (
        <div className="panel-soft p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
          No insights yet. Start the research run above — you'll see structured insights
          appear here the moment extraction finishes.
        </div>
      )}
    </div>
  );
}
