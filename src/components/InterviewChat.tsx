"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { InterviewMessage } from "@/lib/types";

export function InterviewChat({
  projectId,
  interviewId: initialInterviewId,
  initialTranscript,
  initialPersona,
}: {
  projectId: string;
  interviewId?: string;
  initialTranscript: InterviewMessage[];
  initialPersona?: string | null;
}) {
  const router = useRouter();
  const [persona, setPersona] = useState(initialPersona ?? "");
  const [interviewId, setInterviewId] = useState<string | undefined>(initialInterviewId);
  const [messages, setMessages] = useState<InterviewMessage[]>(initialTranscript);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  async function start() {
    setStreaming(true);
    setMessages([]);
    const res = await fetch(`/api/projects/${projectId}/interview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        persona,
        interviewId,
      }),
    });
    await streamInto(res, (id) => setInterviewId(id));
    setStreaming(false);
    router.refresh();
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const next = [...messages, { role: "respondent" as const, content: text }];
    setMessages(next);
    setStreaming(true);
    const res = await fetch(`/api/projects/${projectId}/interview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "turn",
        interviewId,
        persona,
        respondent: text,
      }),
    });
    await streamInto(res, (id) => setInterviewId(id));
    setStreaming(false);
  }

  async function streamInto(res: Response, setId: (id: string) => void) {
    if (!res.ok || !res.body) {
      setMessages((m) => [
        ...m,
        { role: "system", content: `Error: HTTP ${res.status}` },
      ]);
      return;
    }
    const iid = res.headers.get("x-interview-id");
    if (iid) setId(iid);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = "";
    setMessages((m) => [...m, { role: "interviewer", content: "" }]);
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      setMessages((m) => {
        const copy = m.slice();
        copy[copy.length - 1] = { role: "interviewer", content: acc };
        return copy;
      });
    }
  }

  const canStart = !streaming && messages.length === 0;

  return (
    <div className="panel p-0 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-3">
        <div className="flex items-center gap-2">
          <span
            className={"dot " + (streaming ? "pulse-dot" : "")}
            style={{ background: "var(--color-accent)" }}
          />
          <h3 className="text-sm font-medium">AI Customer Interview</h3>
        </div>
        {canStart && (
          <input
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="Persona focus (optional) — e.g. 54yo woman, suburban"
            className="input max-w-sm text-xs"
          />
        )}
      </div>

      <div className="min-h-[420px] max-h-[60vh] overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-sm text-[color:var(--color-fg-muted)]">
            <p>No interview yet. Click start and play the role of a customer.</p>
            <p className="mt-1 text-[color:var(--color-fg-dim)]">
              The AI will ask grounded questions based on what we've already learned.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <Message key={i} message={m} />
        ))}
        {streaming && messages.at(-1)?.role === "interviewer" && (
          <div className="text-xs text-[color:var(--color-fg-dim)] pl-1">…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-[color:var(--color-border)] px-5 py-3">
        {messages.length === 0 ? (
          <button onClick={start} disabled={streaming} className="btn btn-primary">
            {streaming ? "Starting…" : "Start interview"}
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Respond as the customer…"
              disabled={streaming}
              className="input flex-1"
            />
            <button disabled={streaming || !input.trim()} className="btn btn-primary">
              Send
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Message({ message }: { message: InterviewMessage }) {
  if (message.role === "system") {
    return (
      <div className="text-xs text-red-400">{message.content}</div>
    );
  }
  const isInterviewer = message.role === "interviewer";
  return (
    <div className={isInterviewer ? "flex gap-3" : "flex gap-3 justify-end"}>
      {isInterviewer && (
        <div
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium"
          style={{ background: "rgba(255,90,31,0.15)", color: "var(--color-accent)" }}
        >
          AI
        </div>
      )}
      <div
        className={
          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed " +
          (isInterviewer
            ? "bg-[color:var(--color-panel-2)] border border-[color:var(--color-border)]"
            : "bg-[color:var(--color-accent)] text-white")
        }
      >
        {message.content}
      </div>
    </div>
  );
}
