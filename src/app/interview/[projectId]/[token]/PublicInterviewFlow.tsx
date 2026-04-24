"use client";

import { useState } from "react";
import { Logo } from "@/components/Logo";
import { RespondentForm, type RespondentFormValue } from "@/components/RespondentForm";
import { PublicInterviewChat } from "@/components/PublicInterviewChat";

type Phase = "landing" | "demographics" | "interview" | "done";

export function PublicInterviewFlow({
  token,
  project,
}: {
  token: string;
  project: { title: string; research_question: string | null; description: string | null };
}) {
  const [phase, setPhase] = useState<Phase>("landing");
  const [consent, setConsent] = useState(false);
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [error, setError] = useState<string | null>(null);
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [respondent, setRespondent] = useState<RespondentFormValue | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitDemographics(value: RespondentFormValue) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/public/interview/${token}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consent: true, mode, respondent: value }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Something went wrong. Try again in a moment.");
      return;
    }
    const j = (await res.json()) as { interview_id: string };
    setInterviewId(j.interview_id);
    setRespondent(value);
    setPhase("interview");
  }

  if (phase === "landing") {
    return (
      <main className="mx-auto max-w-xl px-6 pt-16 pb-20">
        <header className="mb-10 flex items-center justify-center">
          <Logo size={26} />
        </header>
        <div className="panel p-8">
          <p className="chip">Interview invitation</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Short research interview
          </h1>
          <p className="mt-2 text-[color:var(--color-fg-muted)]">
            We're exploring how people make purchasing decisions around this category.
          </p>
          <section className="mt-6 space-y-3 text-sm text-[color:var(--color-fg-muted)]">
            <p>
              You've been invited to a short conversational interview. There are no right
              or wrong answers — we're trying to understand how real people think about
              this topic.
            </p>
            <p>
              The interview happens in text (or voice, if you prefer). You can stop
              anytime by clicking <span className="text-[color:var(--color-fg)]">Finish interview</span> — we'll still save what you shared, with your permission.
            </p>
            <p>
              Your answers will only be used for research and insight generation. Nothing
              you share will be made public.
            </p>
          </section>

          <label className="mt-6 flex items-start gap-3 text-sm text-[color:var(--color-fg)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--color-accent)]"
            />
            <span>
              I consent to participating and having my responses used for this research.
              I understand I can stop anytime.
            </span>
          </label>

          <div className="mt-5 flex items-center gap-3 text-sm">
            <span className="text-[color:var(--color-fg-muted)]">Mode:</span>
            <button
              type="button"
              onClick={() => setMode("text")}
              className={
                "btn text-xs " +
                (mode === "text" ? "btn-primary" : "")
              }
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setMode("voice")}
              className={
                "btn text-xs " +
                (mode === "voice" ? "btn-primary" : "")
              }
              title="Requires a Chromium-based browser"
            >
              Voice (beta)
            </button>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-xs text-[color:var(--color-fg-dim)]">
              Takes about 10–15 minutes.
            </p>
            <button
              disabled={!consent}
              onClick={() => setPhase("demographics")}
              className="btn btn-primary disabled:opacity-50"
            >
              Continue →
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "demographics") {
    return (
      <main className="mx-auto max-w-xl px-6 pt-16 pb-20">
        <header className="mb-8 flex items-center justify-center">
          <Logo size={22} />
        </header>
        <h1 className="text-2xl font-semibold tracking-tight">A bit about you</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          This stays attached to your interview so the research team can understand how
          people like you think. You can skip optional fields.
        </p>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-6">
          <RespondentForm onSubmit={submitDemographics} submitting={busy} />
        </div>
        <button
          type="button"
          onClick={() => setPhase("landing")}
          className="btn btn-ghost text-xs mt-4"
        >
          ← Back
        </button>
      </main>
    );
  }

  if (phase === "interview" && interviewId) {
    return (
      <PublicInterviewChat
        token={token}
        interviewId={interviewId}
        mode={mode}
        project={project}
        respondentName={respondent?.name ?? null}
        onDone={() => setPhase("done")}
      />
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 pt-24 pb-20 text-center">
      <Logo size={28} />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight">Thank you</h1>
      <p className="mt-3 text-[color:var(--color-fg-muted)]">
        Your responses have been saved. The research team will use them to understand how
        people in your audience think about this topic.
      </p>
      <p className="mt-6 text-xs text-[color:var(--color-fg-dim)]">
        You can close this tab.
      </p>
    </main>
  );
}
