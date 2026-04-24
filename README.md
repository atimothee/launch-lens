# LaunchLens

> Turn customer noise into insight.

LaunchLens is an AI research workflow for marketing and product teams. Feed it
an audience and a question — it scrapes the voice of the customer, clusters it
into structured insights, runs probing AI customer interviews, and synthesizes
campaign-ready positioning and messaging.

Stack: **Next.js 15 (App Router)** · **Tailwind 4** · **Supabase** (auth + Postgres + RLS) ·
**Claude API** · Vercel. No LangChain, no vector DB, no Docker.

---

## What it does

Three agents, each replacing a slow piece of the research stack:

1. **Insight Engine** — scrapes Reddit, TikTok (via Apify), and the open web;
   Claude clusters raw voice into four structured insight types with verbatim
   quotes:
   - `belief` — what people think is true
   - `goal` — what they actually want
   - `context` — when and where they use the category
   - `pattern` — repeated market tensions

2. **AI Customer Interviews** — a grounded chat interviewer that asks one
   question at a time, probes emotional drivers, and listens for contradictions.
   Grounded in whichever insights the Insight Engine has already pulled.

3. **Report Generator** — synthesizes insights + interview takeaways into bold
   positioning reframes (`from → to`) and campaign-ready messaging. Exports to
   Markdown today; Notion/slides are a TODO.

---

## Project structure

```
launch-lens/
├── src/
│   ├── app/
│   │   ├── page.tsx                      — landing page
│   │   ├── (auth)/
│   │   │   ├── login/                    — login page
│   │   │   ├── signup/                   — signup page
│   │   │   ├── AuthForm.tsx
│   │   │   └── actions.ts                — login / signup / logout server actions
│   │   ├── dashboard/
│   │   │   ├── page.tsx                  — project list
│   │   │   └── new/
│   │   │       ├── page.tsx              — new project form
│   │   │       └── actions.ts            — createProject server action
│   │   ├── projects/[id]/
│   │   │   ├── layout.tsx                — shared header + tabs
│   │   │   ├── page.tsx                  — Insights tab
│   │   │   ├── interviews/page.tsx       — Interviews tab
│   │   │   └── report/                   — Report tab (+ export)
│   │   ├── api/projects/[id]/
│   │   │   ├── research/route.ts         — POST: scrape + extract (NDJSON stream)
│   │   │   ├── interview/route.ts        — POST: start | turn (text stream)
│   │   │   └── report/route.ts           — POST: generate positioning + messaging
│   │   ├── globals.css                   — Tailwind 4 + theme tokens
│   │   └── layout.tsx
│   ├── components/
│   │   ├── InsightCard.tsx
│   │   ├── InsightsGrid.tsx
│   │   ├── InterviewChat.tsx             — streaming chat UI
│   │   ├── ResearchRunner.tsx            — live scraping progress
│   │   ├── ProjectTabs.tsx
│   │   ├── Nav.tsx, Logo.tsx
│   ├── lib/
│   │   ├── claude.ts                     — Anthropic SDK + claudeJSON + streamText
│   │   ├── prompts.ts                    — all agent prompts
│   │   ├── scrapers/
│   │   │   ├── index.ts                  — parallel runner w/ progress events
│   │   │   ├── reddit.ts                 — reddit.com JSON + top comments
│   │   │   ├── web.ts                    — DDG search + readable extraction
│   │   │   ├── tiktok.ts                 — Apify (optional via APIFY_TOKEN)
│   │   │   └── types.ts
│   │   ├── supabase/
│   │   │   ├── client.ts                 — browser client
│   │   │   ├── server.ts                 — server + service-role client
│   │   │   └── middleware.ts             — session refresh + route gating
│   │   └── types.ts
│   └── middleware.ts
├── supabase/
│   ├── migrations/0001_init.sql          — tables + RLS
│   └── seed.sql                          — demo "Protein drinks for Gen X"
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

| var | what |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from your Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from your Supabase project |
| `SUPABASE_SERVICE_ROLE_KEY` | from your Supabase project (server only) |
| `ANTHROPIC_API_KEY` | from https://console.anthropic.com |
| `APIFY_TOKEN` | optional — enables TikTok scraping |
| `REDDIT_USER_AGENT` | optional — override UA used on Reddit's public JSON |

### 2. Supabase

Create a new Supabase project, then apply the migration. You have two options:

**Option A — dashboard:**
Open `supabase/migrations/0001_init.sql` and paste it into the SQL editor in
your Supabase dashboard.

**Option B — CLI:**
```bash
supabase link --project-ref <your-ref>
supabase db push
```

Auth: in **Authentication → Providers**, confirm Email is enabled. If you want
instant sign-ups without email confirmation for local dev, set
**Authentication → Settings → Confirm email** to off.

### 3. Run

```bash
npm run dev
# → http://localhost:3000
```

### 4. Demo seed (optional)

After creating at least one user, grab the `auth.users.id` and seed the
"Protein drinks for Gen X" demo project:

```bash
psql "$SUPABASE_DB_URL" -v user_id="'<your-uuid>'" -f supabase/seed.sql
```

---

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the same env vars as `.env.local` to **Settings → Environment Variables**.
4. Set Vercel's **Function Max Duration** to 300s on Pro (the research route
   can take a minute or two when sources are slow). The route already sets
   `export const maxDuration = 300;`.

No build config overrides needed — `npm run build` is the default.

---

## Data model

All tables live under the `public` schema. RLS is on, scoped to the owning
`user_id` via `projects`.

- `projects` — one per research workflow. Status: `draft | running | ready | error`.
- `research_sources` — raw scraped items (reddit posts/comments, web pages, tiktok captions).
- `insights` — extracted insights. `type ∈ {belief, goal, context, pattern}`, with `confidence`.
- `quotes` — verbatim supporting quotes per insight, with source URLs.
- `interviews` — AI customer interviews. Transcript is stored as `jsonb`.
- `reports` — generated positioning + messaging (jsonb).

See [supabase/migrations/0001_init.sql](supabase/migrations/0001_init.sql).

---

## How the agents talk to Claude

All prompts live in [src/lib/prompts.ts](src/lib/prompts.ts) and return
strict JSON (parsed defensively by `claudeJSON` in
[src/lib/claude.ts](src/lib/claude.ts)).

Models used:

- **Insight extraction**, **interview turns**, **interview summaries** — `claude-sonnet-4-6`.
- **Final report synthesis** — `claude-opus-4-7` (bolder reframes).

Prompt design principles baked in:

- *Prefer specific over generic.* The insight extractor is explicitly told that
  "users care about health" is a failure mode.
- *Real human language only.* Quotes must be verbatim with a `source_index`
  pointer into the supplied sources.
- *Surface tensions.* Contradictions and `from → to` reframes are first-class.
- *One question at a time.* The interviewer is instructed to probe, not lecture.

No proprietary research framework is exposed in the UI or prompts — we use
"Customer Beliefs / Customer Goals / Usage Contexts / Market Patterns".

---

## How research progress streams

`POST /api/projects/:id/research` returns an **NDJSON** stream — one JSON event
per line:

```
{"type":"started","source":"reddit"}
{"type":"source_done","source":"reddit","count":34}
{"type":"stage","stage":"extract","message":"synthesizing 34 items with Claude"}
{"type":"insights_ready","count":9}
{"type":"done"}
```

The client reads this with a plain `fetch` + `ReadableStream`. See
[src/components/ResearchRunner.tsx](src/components/ResearchRunner.tsx).

The interview endpoint streams raw text deltas (no NDJSON framing needed —
it's a single continuous assistant message).

---

## What's stubbed

- **TikTok** scraping requires `APIFY_TOKEN`. If unset, the TikTok source is
  skipped cleanly and the rest of the pipeline still runs.
- **Slides export** isn't implemented. Markdown export works. Notion export is
  a single POST to `/v1/pages` away if you want to wire it up.
- **Interview summarization into new insights** — the prompt supports it, but
  we don't auto-promote interview findings into the `insights` table (you
  currently re-run research to regenerate). Easy extension.

---

## Feedback / contributing

PRs welcome. Keep it simple, fast, hackable.
