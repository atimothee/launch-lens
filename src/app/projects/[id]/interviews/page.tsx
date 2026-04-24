import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InterviewChat } from "@/components/InterviewChat";
import type { Interview } from "@/lib/types";

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
    .order("updated_at", { ascending: false });

  const latest = (interviews?.[0] as Interview | undefined) ?? null;

  return (
    <div className="space-y-6">
      <InterviewChat
        projectId={id}
        interviewId={latest?.id}
        initialTranscript={latest?.transcript ?? []}
        initialPersona={latest?.persona ?? ""}
      />

      {(interviews?.length ?? 0) > 1 && (
        <div>
          <h3 className="text-sm text-[color:var(--color-fg-muted)] mb-2">Past sessions</h3>
          <ul className="space-y-1">
            {(interviews ?? []).slice(1).map((iv) => (
              <li
                key={iv.id}
                className="panel-soft px-4 py-2 text-xs text-[color:var(--color-fg-muted)] flex items-center justify-between"
              >
                <span>{iv.persona || "(no persona)"}</span>
                <span>{new Date(iv.updated_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
