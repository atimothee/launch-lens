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
              Reusable water bottles for commuters
            </span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SampleInsight
              type="belief"
              title="Reusable bottles feel inconvenient"
              body="Commuters assume reusable bottles are one more thing to carry, clean, and remember during an already rushed day."
              quote="I like the idea, but if it leaks once in my bag, I'm done."
            />
            <SampleInsight
              type="goal"
              title="Stay prepared without extra friction"
              body='The underlying goal is feeling ready for the day. "Have water when I need it", not "optimize hydration".'
              quote="I just want something I can throw in my work bag and forget about."
            />
            <SampleInsight
              type="context"
              title="Transit moments decide usage"
              body="Usage is won or lost during packed trains, desk transitions, and after-work errands — portability matters more than ideals."
              quote="If it does not fit in the side pocket, it is not coming with me."
            />
            <SampleInsight
              type="pattern"
              title="Sustainable vs. realistic"
              body="The central tension is wanting a lower-waste habit without adding another chore to the morning routine."
              quote="I want to use less plastic, but mornings are chaos."
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
