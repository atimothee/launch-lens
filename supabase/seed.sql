-- Optional demo seed. Run AFTER creating an auth user and replacing :user_id.
-- Example: psql ... -v user_id="'<uuid>'" -f seed.sql
--
-- This seeds the "Protein drinks for Gen X" demo project with hand-crafted
-- insights so the UI has something to show before running live research.

insert into projects (id, user_id, title, description, target_audience, research_question, status)
values (
  '00000000-0000-0000-0000-000000000001',
  :user_id,
  'Protein drinks for Gen X',
  'Category growth exploration for protein drinks with consumers aged 45–60.',
  'Gen X consumers (ages 45–60), moderately health-conscious, non-athletes',
  'How do we grow protein drink adoption among Gen X consumers?',
  'ready'
) on conflict (id) do nothing;

insert into insights (id, project_id, type, title, content, tension, confidence) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','belief',
 'Protein is for bodybuilders',
 'Many Gen X consumers associate protein drinks with bodybuilders and athletes, creating a psychological barrier to everyday use.',
 'Want the benefit (muscle retention, satiety) but reject the identity (gym-bro).', 0.86),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','goal',
 'Aging well, not getting ripped',
 'The underlying goal is vitality and resilience into their 50s/60s — staying strong enough to keep up, not performance maxing.',
 null, 0.82),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','context',
 'Breakfast replacement, not post-workout',
 'Usage skews toward rushed mornings and skipped-lunch moments, not the gym. "Something in me before I forget to eat."',
 null, 0.78),
('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','pattern',
 'Too artificial vs. actually healthy',
 'Repeated tension across Reddit and blogs: protein drinks are seen as processed and sweet, in conflict with the "clean eating" identity many Gen X consumers now hold.',
 'Convenience vs. purity.', 0.74)
on conflict (id) do nothing;

insert into quotes (insight_id, text, source, source_url) values
('10000000-0000-0000-0000-000000000001',
 'I am 52, I just want to keep my muscle. I am not trying to look like the guy on the label.',
 'reddit', 'https://www.reddit.com/r/nutrition/'),
('10000000-0000-0000-0000-000000000001',
 'Every protein shake I see is marketed to 25-year-old men at the gym.',
 'reddit', 'https://www.reddit.com/r/loseit/'),
('10000000-0000-0000-0000-000000000002',
 'My dad had a fall at 68. I do not want that to be me. I just want to stay strong.',
 'reddit', 'https://www.reddit.com/r/AskWomenOver40/'),
('10000000-0000-0000-0000-000000000003',
 'I grab one when I know I am going to skip lunch. It is insurance.',
 'reddit', 'https://www.reddit.com/r/nutrition/'),
('10000000-0000-0000-0000-000000000004',
 'Read the label. It is basically candy with extra steps.',
 'reddit', 'https://www.reddit.com/r/EatCheapAndHealthy/');
