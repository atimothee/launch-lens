import { notFound } from "next/navigation";
import { loadPublicContext } from "@/lib/public-interview";
import { PublicInterviewFlow } from "./PublicInterviewFlow";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicInterviewPage({
  params,
}: {
  params: Promise<{ projectId: string; token: string }>;
}) {
  const { projectId, token } = await params;
  const ctx = await loadPublicContext(token);
  if (!ctx || ctx.project.id !== projectId) notFound();

  return (
    <div className="min-h-screen">
      <PublicInterviewFlow
        token={token}
        project={{
          title: ctx.project.title,
          research_question: ctx.project.research_question,
          description: ctx.project.description,
        }}
      />
    </div>
  );
}
