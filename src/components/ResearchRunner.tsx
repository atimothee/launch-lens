"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Event =
  | { type: "started"; source: string }
  | { type: "source_done"; source: string; count: number }
  | { type: "source_error"; source: string; error: string }
  | { type: "stage"; stage: string; message: string }
  | { type: "insights_ready"; count: number }
  | { type: "done" }
  | { type: "error"; message: string };

export function ResearchRunner({
  projectId,
  autoStart,
}: {
  projectId: string;
  autoStart?: boolean;
}) {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const startedRef = useRef(false);

  async function start() {
    if (running) return;
    startedRef.current = true;
    setRunning(true);
    setEvents([]);
    setDone(false);

    const res = await fetch(`/api/projects/${projectId}/research`, {
      method: "POST",
    });
    if (!res.ok || !res.body) {
      setEvents((e) => [...e, { type: "error", message: `HTTP ${res.status}` }]);
      setRunning(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const ev = JSON.parse(trimmed) as Event;
          setEvents((prev) => [...prev, ev]);
          if (ev.type === "done") setDone(true);
        } catch {
          // ignore malformed line
        }
      }
    }
    setRunning(false);
    router.refresh();
  }

  useEffect(() => {
    if (autoStart && !startedRef.current) {
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={"dot " + (running ? "pulse-dot" : "")}
            style={{
              background: running
                ? "var(--color-accent)"
                : done
                  ? "var(--color-goal)"
                  : "var(--color-fg-dim)",
            }}
          />
          <h3 className="text-base font-medium tracking-tight">
            {running ? "Researching…" : done ? "Research complete" : "Research"}
          </h3>
        </div>
        {!running && (
          <button onClick={start} className="btn btn-primary text-sm">
            {done ? "Re-run" : "Start research"}
          </button>
        )}
      </div>

      {events.length > 0 && (
        <ul className="mt-4 space-y-1.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
          {events.map((e, i) => (
            <li key={i} className="fade-up">
              {renderEvent(e)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function renderEvent(e: Event): string {
  switch (e.type) {
    case "started":
      return `→ scraping ${e.source}`;
    case "source_done":
      return `✓ ${e.source} — ${e.count} items`;
    case "source_error":
      return `! ${e.source} skipped — ${e.error}`;
    case "stage":
      return `· ${e.stage}: ${e.message}`;
    case "insights_ready":
      return `✓ extracted ${e.count} insights`;
    case "done":
      return `✓ done`;
    case "error":
      return `✖ ${e.message}`;
  }
}
