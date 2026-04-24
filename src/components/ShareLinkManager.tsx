"use client";

import { useEffect, useState } from "react";
import type { InterviewLink } from "@/lib/types";

export function ShareLinkManager({ projectId }: { projectId: string }) {
  const [links, setLinks] = useState<InterviewLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/projects/${projectId}/links`);
    if (res.ok) {
      const j = (await res.json()) as { links: InterviewLink[] };
      setLinks(j.links ?? []);
    }
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function createLink() {
    setCreating(true);
    const res = await fetch(`/api/projects/${projectId}/links`, { method: "POST" });
    setCreating(false);
    if (res.ok) load();
  }

  async function toggleActive(link: InterviewLink) {
    await fetch(`/api/projects/${projectId}/links/${link.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !link.is_active }),
    });
    load();
  }

  function copy(link: InterviewLink) {
    const url = `${window.location.origin}/interview/${projectId}/${link.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1500);
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-medium tracking-tight">Share links</h3>
          <p className="text-xs text-[color:var(--color-fg-dim)] mt-0.5">
            Public interview URLs. Anyone with the link can complete an interview.
          </p>
        </div>
        <button onClick={createLink} className="btn btn-primary text-sm" disabled={creating}>
          {creating ? "Creating…" : "New link"}
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-xs text-[color:var(--color-fg-dim)]">Loading…</p>
      ) : links.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--color-fg-muted)]">
          No share links yet. Create one to invite respondents.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {links.map((l) => {
            const url =
              typeof window !== "undefined"
                ? `${window.location.origin}/interview/${projectId}/${l.token}`
                : `/interview/${projectId}/${l.token}`;
            return (
              <li
                key={l.id}
                className="panel-soft px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="dot"
                      style={{
                        background: l.is_active
                          ? "var(--color-goal)"
                          : "var(--color-fg-dim)",
                      }}
                    />
                    <code className="text-xs truncate block" title={url}>
                      {url}
                    </code>
                  </div>
                  <p className="text-[11px] text-[color:var(--color-fg-dim)] mt-1">
                    Created {new Date(l.created_at).toLocaleString()}
                    {l.is_active ? "" : " · disabled"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => copy(l)} className="btn text-xs">
                    {copiedId === l.id ? "Copied ✓" : "Copy"}
                  </button>
                  <button
                    onClick={() => toggleActive(l)}
                    className="btn btn-ghost text-xs"
                    title={l.is_active ? "Disable this link" : "Re-enable this link"}
                  >
                    {l.is_active ? "Disable" : "Enable"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
