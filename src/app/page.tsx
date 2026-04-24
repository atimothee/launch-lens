import Link from "next/link";
import { Nav } from "@/components/Nav";

export default function Landing() {
  return (
    <div className="relative min-h-screen">
      <div className="grid-faint absolute inset-0 pointer-events-none" aria-hidden />
      <Nav
        right={
          <>
            <Link href="/login" className="btn btn-ghost">
              Log in
            </Link>
            <Link href="/signup" className="btn btn-primary">
              Start a project
            </Link>
          </>
        }
      />

      <main className="relative z-10 mx-auto max-w-5xl px-6 pt-20 pb-32 md:pt-28">
        <div className="flex items-center gap-2">
          <span className="chip">
            <span className="dot pulse-dot" style={{ background: "var(--color-accent)" }} />
            AI research agents · live
          </span>
        </div>
        <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-[-0.03em] leading-[1.05]">
          Customer conversations
          <br />
          <span className="text-[color:var(--color-fg-muted)]">into</span>{" "}
          <span
            style={{
              backgroundImage: "linear-gradient(90deg, #ff7a45, #ff5a1f)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            sharper positioning
          </span>
          .
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[color:var(--color-fg-muted)] leading-relaxed">
          LaunchLens helps teams turn customer conversations and online signals into
          sharper positioning, messaging, and growth opportunities. Run AI-moderated
          interviews, synthesize online voice, and ship campaign-ready strategy.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/signup" className="btn btn-primary">
            Start a research project →
          </Link>
          <Link href="/login" className="btn">
            I have an account
          </Link>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          <Feature
            title="Insight Engine"
            body="Scrapes Reddit, TikTok, and the open web. Clusters what people actually say into beliefs, goals, and usage contexts."
            tag="Agent 1"
          />
          <Feature
            title="AI Customer Interviews"
            body="Share a link and collect real interviews on your own audience. A research-backed moderator probes beliefs, goals, occasions, and concept reactions — text or voice."
            tag="Agent 2"
          />
          <Feature
            title="Report Generator"
            body="From raw voice to campaign-ready positioning and messaging in a single pass. Export to a clean doc."
            tag="Agent 3"
          />
        </div>

        <div className="mt-20 panel p-6 md:p-8">
          <div className="flex items-center gap-2">
            <span className="chip">Demo</span>
            <span className="text-sm text-[color:var(--color-fg-muted)]">
              Protein drinks for Gen X
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SampleInsight
              type="belief"
              title="Protein is for bodybuilders"
              body="Gen X consumers associate protein drinks with bodybuilders, creating a psychological barrier to everyday use."
              quote="I'm 52 — I just want to keep my muscle. I'm not trying to look like the guy on the label."
            />
            <SampleInsight
              type="goal"
              title="Aging well, not getting ripped"
              body='The underlying goal is vitality and resilience. "Stay strong enough to keep up", not "perform at the gym".'
              quote="My dad had a fall at 68. I don't want that to be me."
            />
            <SampleInsight
              type="context"
              title="Breakfast replacement, not post-workout"
              body="Usage skews to rushed mornings and skipped-lunch moments — protection, not performance."
              quote="I grab one when I know I'm going to skip lunch. It's insurance."
            />
            <SampleInsight
              type="pattern"
              title="Too artificial vs. actually healthy"
              body='Convenience vs. clean-eating identity is the central tension across sources.'
              quote="Read the label. It's basically candy with extra steps."
            />
          </div>
        </div>

        <p className="mt-10 text-sm text-[color:var(--color-fg-dim)]">
          Built for PMs and brand strategists who want research to move as fast as they do.
        </p>
      </main>
    </div>
  );
}

function Feature({ title, body, tag }: { title: string; body: string; tag: string }) {
  return (
    <div className="panel p-5 hover:border-[color:var(--color-fg-dim)] transition-colors">
      <span className="chip">{tag}</span>
      <h3 className="mt-3 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">{body}</p>
    </div>
  );
}

function SampleInsight({
  type,
  title,
  body,
  quote,
}: {
  type: "belief" | "goal" | "context" | "pattern";
  title: string;
  body: string;
  quote: string;
}) {
  const colorVar = {
    belief: "--color-belief",
    goal: "--color-goal",
    context: "--color-context",
    pattern: "--color-pattern",
  }[type];
  return (
    <div className="panel-soft p-4">
      <div className="flex items-center gap-2">
        <span className="dot" style={{ background: `var(${colorVar})` }} />
        <span className="text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          {type}
        </span>
      </div>
      <h4 className="mt-2 font-medium tracking-tight">{title}</h4>
      <p className="mt-1.5 text-sm text-[color:var(--color-fg-muted)]">{body}</p>
      <blockquote className="mt-3 border-l-2 pl-3 text-sm italic text-[color:var(--color-fg)]"
        style={{ borderColor: `var(${colorVar})` }}>
        “{quote}”
      </blockquote>
    </div>
  );
}
