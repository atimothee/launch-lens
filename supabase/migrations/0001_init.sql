-- LaunchLens core schema
-- All tables scoped by user_id via RLS on projects; children inherit via project_id.

create extension if not exists "pgcrypto";

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_audience text,
  research_question text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on projects(user_id);
create index if not exists projects_status_idx on projects(status);

create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null,
  url text,
  title text,
  excerpt text,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index if not exists research_sources_project_idx on research_sources(project_id);

create table if not exists insights (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  type text not null check (type in ('belief', 'goal', 'context', 'pattern')),
  title text not null,
  content text not null,
  tension text,
  confidence real not null default 0.5,
  created_at timestamptz not null default now()
);

create index if not exists insights_project_idx on insights(project_id);
create index if not exists insights_type_idx on insights(type);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references insights(id) on delete cascade,
  text text not null,
  source text,
  source_url text,
  created_at timestamptz not null default now()
);

create index if not exists quotes_insight_idx on quotes(insight_id);

create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  persona text,
  transcript jsonb not null default '[]'::jsonb,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interviews_project_idx on interviews(project_id);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  positioning jsonb,
  messaging jsonb,
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists reports_project_idx on reports(project_id);

-- updated_at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

drop trigger if exists interviews_updated_at on interviews;
create trigger interviews_updated_at before update on interviews
  for each row execute function set_updated_at();

-- RLS
alter table projects enable row level security;
alter table research_sources enable row level security;
alter table insights enable row level security;
alter table quotes enable row level security;
alter table interviews enable row level security;
alter table reports enable row level security;

-- Projects: owner-only
drop policy if exists "projects owner rw" on projects;
create policy "projects owner rw" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Children: allowed if user owns parent project
drop policy if exists "research_sources via project" on research_sources;
create policy "research_sources via project" on research_sources
  for all using (
    exists (select 1 from projects p where p.id = research_sources.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = research_sources.project_id and p.user_id = auth.uid())
  );

drop policy if exists "insights via project" on insights;
create policy "insights via project" on insights
  for all using (
    exists (select 1 from projects p where p.id = insights.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = insights.project_id and p.user_id = auth.uid())
  );

drop policy if exists "quotes via insight project" on quotes;
create policy "quotes via insight project" on quotes
  for all using (
    exists (
      select 1 from insights i
      join projects p on p.id = i.project_id
      where i.id = quotes.insight_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from insights i
      join projects p on p.id = i.project_id
      where i.id = quotes.insight_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "interviews via project" on interviews;
create policy "interviews via project" on interviews
  for all using (
    exists (select 1 from projects p where p.id = interviews.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = interviews.project_id and p.user_id = auth.uid())
  );

drop policy if exists "reports via project" on reports;
create policy "reports via project" on reports
  for all using (
    exists (select 1 from projects p where p.id = reports.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = reports.project_id and p.user_id = auth.uid())
  );
