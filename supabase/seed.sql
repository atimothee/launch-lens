-- Optional demo seed. Run AFTER creating an auth user and replacing :user_id.
-- Example: psql ... -v user_id="'<uuid>'" -f seed.sql
--
-- This seeds the "Reusable water bottles for commuters" demo project with hand-crafted
-- insights so the UI has something to show before running live research.

insert into projects (id, user_id, title, description, target_audience, research_question, status)
values (
  '00000000-0000-0000-0000-000000000001',
  :user_id,
  'Reusable water bottles for commuters',
  'Category exploration for reusable water bottles with everyday urban commuters.',
  'Urban commuters who bring bags to work or school',
  'What keeps commuters from carrying reusable water bottles every day?',
  'ready'
) on conflict (id) do nothing;

insert into insights (id, project_id, type, title, content, tension, confidence) values
('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','belief',
 'Reusable bottles feel inconvenient',
 'Many commuters like the sustainability idea but assume reusable bottles will leak, take up bag space, or become another chore.',
 'Want the lower-waste habit but reject anything that adds friction to the morning.', 0.86),
('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','goal',
 'Prepared without extra friction',
 'The underlying goal is having water available throughout the day without adding another item to manage, clean, or remember.',
 null, 0.82),
('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','context',
 'Transit moments decide usage',
 'Usage is won or lost during packed trains, desk transitions, and after-work errands. Portability matters more than ideals.',
 null, 0.78),
('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','pattern',
 'Sustainable vs. realistic',
 'Repeated tension across public conversations: people want lower-waste habits but resist products that create cleaning, leaking, or carrying tradeoffs.',
 'Sustainability vs. morning chaos.', 0.74)
on conflict (id) do nothing;

insert into quotes (insight_id, text, source, source_url) values
('10000000-0000-0000-0000-000000000001',
 'I like the idea, but if it leaks once in my bag, I am done.',
 'reddit', 'https://www.reddit.com/r/BuyItForLife/'),
('10000000-0000-0000-0000-000000000001',
 'I already carry a laptop, lunch, and an umbrella. The bottle has to earn its space.',
 'reddit', 'https://www.reddit.com/r/commuting/'),
('10000000-0000-0000-0000-000000000002',
 'I just want something I can throw in my work bag and forget about.',
 'reddit', 'https://www.reddit.com/r/simpleliving/'),
('10000000-0000-0000-0000-000000000003',
 'If it does not fit in the side pocket, it is not coming with me.',
 'reddit', 'https://www.reddit.com/r/onebag/'),
('10000000-0000-0000-0000-000000000004',
 'I want to use less plastic, but mornings are chaos.',
 'reddit', 'https://www.reddit.com/r/ZeroWaste/');
