"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { VoiceController } from "@/lib/voice/controller";
import type { InterviewMessage } from "@/lib/types";

export function PublicInterviewChat({
  token,
  interviewId,
  mode,
  project,
  respondentName,
  onDone,
}: {
  token: string;
  interviewId: string;
  mode: "text" | "voice";
  project: { title: string; research_question: string | null };
  respondentName: string | null;
  onDone: () => void;
}) {
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const voiceRef = useRef<VoiceController | null>(null);

  // Auto-start with the opener on mount.
  useEffect(() => {
    startInterview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, streaming]);

  async function startInterview() {
    setStreaming(true);
    const res = await fetch(`/api/public/interview/${token}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id: interviewId, action: "start" }),
    });
    await streamInto(res);
    setStreaming(false);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "respondent", content: trimmed }]);
    setStreaming(true);
    const res = await fetch(`/api/public/interview/${token}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interview_id: interviewId,
        action: "turn",
        respondent_text: trimmed,
      }),
    });
    await streamInto(res);
    setStreaming(false);
  }

  async function streamInto(res: Response) {
    if (!res.ok || !res.body) {
      setMessages((m) => [
        ...m,
        { role: "system", content: `Error: HTTP ${res.status}` },
      ]);
      return;
    }
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
    if (mode === "voice" && voiceRef.current && acc) {
      voiceRef.current.speak(acc).catch(() => {});
    }
  }

  async function finish(abandoned = false) {
    await fetch(`/api/public/interview/${token}/finish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interview_id: interviewId, abandoned }),
    });
    onDone();
  }

  function handleToggleVoice() {
    if (!voiceRef.current) {
      try {
        voiceRef.current = VoiceController.browser({
          onTranscript: (text) => send(text),
          onError: (err) => setVoiceError(err),
        });
      } catch (err) {
        setVoiceError(err instanceof Error ? err.message : String(err));
        return;
      }
    }
    if (voiceActive) {
      voiceRef.current?.stopListening();
      setVoiceActive(false);
    } else {
      voiceRef.current?.startListening();
      setVoiceActive(true);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-8 pb-24 min-h-screen flex flex-col">
      <header className="flex items-center justify-between mb-5">
        <Logo size={20} />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmExit(true)}
            className="btn btn-ghost text-xs"
            title="Pause — we'll save your progress"
          >
            Pause / exit
          </button>
          <button
            onClick={() => setConfirmFinish(true)}
            className="btn text-xs"
          >
            Finish interview
          </button>
        </div>
      </header>

      <div className="panel p-0 overflow-hidden flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--color-border)] px-5 py-3">
          <div className="flex items-center gap-2">
            <span className={"dot " + (streaming ? "pulse-dot" : "")} style={{ background: "var(--color-accent)" }} />
            <h3 className="text-sm font-medium">{project.title}</h3>
          </div>
          <span className="text-[11px] text-[color:var(--color-fg-dim)]">
            {respondentName ? `Hi, ${respondentName}` : "Interview"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((m, i) => (
            <Message key={i} message={m} />
          ))}
          {streaming && messages.at(-1)?.role === "interviewer" && (
            <div className="text-xs text-[color:var(--color-fg-dim)] pl-1">…</div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-[color:var(--color-border)] px-5 py-3 space-y-2">
          {voiceError && (
            <p className="text-xs text-red-400">Voice: {voiceError}</p>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voiceActive ? "Listening… (or type)" : "Type your response"}
              disabled={streaming}
              className="input flex-1"
            />
            {mode === "voice" && (
              <button
                type="button"
                onClick={handleToggleVoice}
                className={"btn text-sm " + (voiceActive ? "btn-primary" : "")}
                title={voiceActive ? "Stop listening" : "Start listening"}
                disabled={streaming}
              >
                {voiceActive ? "● Stop" : "🎙 Speak"}
              </button>
            )}
            <button disabled={streaming || !input.trim()} className="btn btn-primary text-sm">
              Send
            </button>
          </form>
        </div>
      </div>

      {confirmFinish && (
        <ConfirmModal
          title="Finish interview?"
          body="We'll save everything you've shared and close the interview. Thanks for your time."
          confirmLabel="Yes, finish"
          onConfirm={() => finish(false)}
          onCancel={() => setConfirmFinish(false)}
        />
      )}
      {confirmExit && (
        <ConfirmModal
          title="Pause / exit?"
          body="We'll save your partial response and mark the interview as incomplete. You won't be able to resume from this link."
          confirmLabel="Yes, exit"
          onConfirm={() => finish(true)}
          onCancel={() => setConfirmExit(false)}
        />
      )}
    </main>
  );
}

function Message({ message }: { message: InterviewMessage }) {
  if (message.role === "system") {
    return <div className="text-xs text-red-400">{message.content}</div>;
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
          "max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap " +
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

function ConfirmModal({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="panel p-6 max-w-sm w-full">
        <h3 className="text-lg font-medium tracking-tight">{title}</h3>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">{body}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
          <button onClick={onConfirm} className="btn btn-primary">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
