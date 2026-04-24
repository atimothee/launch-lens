import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { ProjectTabs } from "@/components/ProjectTabs";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${id}`);

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  return (
    <div className="min-h-screen">
      <Nav
        right={
          <>
            <Link href="/dashboard" className="btn btn-ghost text-sm">
              Projects
            </Link>
            <form action={logout}>
              <button className="btn btn-ghost text-sm">Log out</button>
            </form>
          </>
        }
      />
      <main className="mx-auto max-w-6xl px-6 pb-20">
        <header className="mb-6">
          <div className="flex items-center gap-2">
            <span className="chip">{project.status}</span>
            <span className="text-xs text-[color:var(--color-fg-dim)]">
              {new Date(project.updated_at).toLocaleString()}
            </span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">{project.title}</h1>
          {project.research_question && (
            <p className="mt-1 text-[color:var(--color-fg-muted)]">{project.research_question}</p>
          )}
          {project.target_audience && (
            <p className="mt-0.5 text-sm text-[color:var(--color-fg-dim)]">
              Audience: {project.target_audience}
            </p>
          )}
        </header>
        <ProjectTabs id={id} />
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
