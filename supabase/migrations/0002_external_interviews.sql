-- External interviews: public share links, respondent demographics,
-- richer interview state, structured report sections.

create extension if not exists "pgcrypto";

-- 1. interview_links: unguessable tokens that grant public interview access.
create table if not exists interview_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  token text not null unique,
  label text,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists interview_links_project_idx on interview_links(project_id);
create index if not exists interview_links_token_idx on interview_links(token);

-- 2. interview_respondents: demographics collected before the interview starts.
create table if not exists interview_respondents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  interview_id uuid,  -- set after the interview row is created
  name text,
  age_range text,
  gender text,
  location text,
  occupation text,
  segment_relevance text,
  usage_frequency text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists interview_respondents_project_idx on interview_respondents(project_id);
create index if not exists interview_respondents_interview_idx on interview_respondents(interview_id);

-- 3. interviews: add status + mode + respondent linkage + duration + completion time.
--    We also add an optional link_id so we can attribute completions to a share link.
alter table interviews
  add column if not exists respondent_id uuid references interview_respondents(id) on delete set null,
  add column if not exists link_id uuid references interview_links(id) on delete set null,
  add column if not exists status text not null default 'in_progress',
  add column if not exists mode text not null default 'text',
  add column if not exists duration_seconds integer,
  add column if not exists completed_at timestamptz,
  add column if not exists started_at timestamptz not null default now();

-- Backfill status for any pre-existing rows.
update interviews set status = coalesce(status, 'completed') where status is null;

-- Constrain status + mode to known values.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'interviews_status_check'
  ) then
    alter table interviews
      add constraint interviews_status_check
      check (status in ('in_progress', 'completed', 'partial', 'abandoned'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'interviews_mode_check'
  ) then
    alter table interviews
      add constraint interviews_mode_check
      check (mode in ('text', 'voice'));
  end if;
end $$;

create index if not exists interviews_status_idx on interviews(status);
create index if not exists interviews_respondent_idx on interviews(respondent_id);
create index if not exists interviews_link_idx on interviews(link_id);

-- Now that interviews has respondent_id, close the loop on respondents.
alter table interview_respondents
  add constraint interview_respondents_interview_fk
    foreign key (interview_id) references interviews(id) on delete cascade
    deferrable initially deferred;

-- 4. interview_messages: per-turn messages stored normalized.
--    The jsonb transcript on `interviews` is still maintained for convenience
--    (fast list reads, summary prompt input). interview_messages is the
--    canonical per-turn log with timestamps.
create table if not exists interview_messages (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  role text not null check (role in ('interviewer', 'respondent', 'system')),
  content text not null,
  stage text,  -- optional: which of the 8 moderator stages this turn belongs to
  created_at timestamptz not null default now()
);
create index if not exists interview_messages_interview_idx on interview_messages(interview_id);
create index if not exists interview_messages_created_idx on interview_messages(interview_id, created_at);

-- 5. reports: add structured sections per the new pipeline.
alter table reports
  add column if not exists secondary_findings jsonb,
  add column if not exists primary_findings jsonb,
  add column if not exists strategic_opportunities jsonb;

-- RLS
alter table interview_links enable row level security;
alter table interview_respondents enable row level security;
alter table interview_messages enable row level security;

-- Project owner can CRUD share links for their project.
drop policy if exists "interview_links via project" on interview_links;
create policy "interview_links via project" on interview_links
  for all using (
    exists (select 1 from projects p where p.id = interview_links.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = interview_links.project_id and p.user_id = auth.uid())
  );

-- Respondents: owner-readable via the project. Public writes happen through
-- the service-role client on /api/public/* routes (RLS bypassed), so we don't
-- need to allow anon inserts here.
drop policy if exists "interview_respondents via project" on interview_respondents;
create policy "interview_respondents via project" on interview_respondents
  for all using (
    exists (select 1 from projects p where p.id = interview_respondents.project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = interview_respondents.project_id and p.user_id = auth.uid())
  );

-- Messages: owner-readable via the owning interview's project.
drop policy if exists "interview_messages via project" on interview_messages;
create policy "interview_messages via project" on interview_messages
  for all using (
    exists (
      select 1 from interviews iv
      join projects p on p.id = iv.project_id
      where iv.id = interview_messages.interview_id and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from interviews iv
      join projects p on p.id = iv.project_id
      where iv.id = interview_messages.interview_id and p.user_id = auth.uid()
    )
  );
