import Link from "next/link";
import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { logout } from "../(auth)/actions";
import { createClient } from "@/lib/supabase/server";
import type { Project } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <Nav
        right={
          <>
            <span className="text-sm text-[color:var(--color-fg-muted)] hidden md:inline">
              {user.email}
            </span>
            <form action={logout}>
              <button className="btn btn-ghost text-sm">Log out</button>
            </form>
          </>
        }
      />
      <main className="mx-auto max-w-5xl px-6 pt-10 pb-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-1 text-sm text-[color:var(--color-fg-muted)]">
              Structured customer insight across every project you're running.
            </p>
          </div>
          <Link href="/dashboard/new" className="btn btn-primary">
            New project
          </Link>
        </div>

        <div className="mt-8">
          {(projects ?? []).length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {(projects as Project[]).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel p-10 text-center">
      <h2 className="text-xl font-medium tracking-tight">Nothing here yet</h2>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
        Create your first research project. You'll see insights appear in real time as the
        agents work.
      </p>
      <div className="mt-6">
        <Link href="/dashboard/new" className="btn btn-primary">
          Start a project
        </Link>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const statusColor =
    project.status === "ready"
      ? "var(--color-goal)"
      : project.status === "running"
        ? "var(--color-accent)"
        : project.status === "error"
          ? "#ef4444"
          : "var(--color-fg-dim)";
  return (
    <Link
      href={`/projects/${project.id}`}
      className="panel p-5 hover:border-[color:var(--color-fg-dim)] transition-colors block"
    >
      <div className="flex items-center gap-2">
        <span className="dot" style={{ background: statusColor }} />
        <span className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          {project.status}
        </span>
      </div>
      <h3 className="mt-2 text-lg font-medium tracking-tight">{project.title}</h3>
      {project.research_question && (
        <p className="mt-1 text-sm text-[color:var(--color-fg-muted)] line-clamp-2">
          {project.research_question}
        </p>
      )}
      {project.target_audience && (
        <p className="mt-3 text-xs text-[color:var(--color-fg-dim)]">
          {project.target_audience}
        </p>
      )}
    </Link>
  );
}
