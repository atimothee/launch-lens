"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function ProjectTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/projects/${id}`, label: "Insights", match: (p: string) => p === `/projects/${id}` },
    { href: `/projects/${id}/interviews`, label: "Interviews", match: (p: string) => p.startsWith(`/projects/${id}/interviews`) },
    { href: `/projects/${id}/report`, label: "Report", match: (p: string) => p.startsWith(`/projects/${id}/report`) },
  ];
  return (
    <nav className="flex items-center gap-1 border-b border-[color:var(--color-border)]">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={clsx(
            "px-3 py-2 text-sm rounded-t-md transition-colors",
            t.match(pathname)
              ? "text-[color:var(--color-fg)] border-b-2 border-[color:var(--color-accent)] -mb-px"
              : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
