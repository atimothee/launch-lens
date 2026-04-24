import { NextResponse } from "next/server";
import { loadPublicContext } from "@/lib/public-interview";

export const runtime = "nodejs";

/** Public GET: returns project info for the landing page (title, topic, question). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const ctx = await loadPublicContext(token);
  if (!ctx) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });
  }
  // Only expose fields safe for a public respondent.
  return NextResponse.json({
    project: {
      title: ctx.project.title,
      research_question: ctx.project.research_question,
      description: ctx.project.description,
    },
  });
}
