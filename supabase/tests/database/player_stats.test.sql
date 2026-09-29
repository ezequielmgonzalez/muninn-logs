-- get_player_stats(): the numbers, and who may see them.
--
-- Ana and Bob are friends. Carla played with Ana but isn't her friend. Dan has
-- never played. Ana's three matches:
--   m1  Ana 50 (captain, research 10)  beats Bob 40 (falconer)
--   m2  Ana 30 (captain, research 6)   loses to Bob 45
--   m3  Ana 40 (mystic, research 8)    ties Carla 40, unresolved: both win
-- So Ana: 3 games, 2 wins, 40 points on average, place (1 + 2 + 1) / 3.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'dan@example.com');

update public.players set id = 'f0000000-0000-0000-0000-000000000001' where user_id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000002' where user_id = '22222222-2222-2222-2222-222222222222';
update public.players set id = 'f0000000-0000-0000-0000-000000000003' where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', now());

insert into public.matches (id, game_id, created_by, played_on)
select m.id, g.id, '11111111-1111-1111-1111-111111111111', m.played_on
from public.games g,
  (values ('e0000000-0000-0000-0000-000000000001'::uuid, '2026-09-01'::date),
          ('e0000000-0000-0000-0000-000000000002'::uuid, '2026-09-02'::date),
          ('e0000000-0000-0000-0000-000000000003'::uuid, '2026-09-03'::date)) as m(id, played_on)
where g.slug = 'arnak';

insert into public.match_players (match_id, player_id, turn_order, character_id)
select v.match_id, v.player_id, v.turn_order, (select id from public.game_characters where slug = v.leader)
from (values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 1, 'captain'),
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 2, 'falconer'),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 1, 'captain'),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 2, null),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 1, 'mystic'),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000003'::uuid, 2, null)
) as v(match_id, player_id, turn_order, leader);

-- Research as given, the rest of the total in cards, 0 elsewhere.
insert into public.match_player_scores (match_id, player_id, category_id, points)
select v.match_id, v.player_id, c.id,
  case c.slug when 'research' then v.research when 'cards' then v.total - v.research else 0 end
from (values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 10, 50),
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 5, 40),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 6, 30),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 9, 45),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 8, 40),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000003'::uuid, 7, 40)
) as v(match_id, player_id, research, total)
cross join public.score_categories c
where c.game_id = (select id from public.games where slug = 'arnak');

-- ---------------------------------------------------------------------------
-- Ana's own stats
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

create temporary table ana_stats on commit drop as
select public.get_player_stats('11111111-1111-1111-1111-111111111111') as s;

select results_eq(
  $$ select (s ->> 'games')::int, (s ->> 'wins')::int, (s ->> 'avg_points')::numeric, (s ->> 'avg_place')::numeric
     from ana_stats $$,
  $$ values (3, 2, 40.00::numeric, 1.33::numeric) $$,
  'games, wins (a shared first place counts), average points and average place'
);

select results_eq(
  $$ select c ->> 'slug', (c ->> 'average')::numeric
     from ana_stats, jsonb_array_elements(s -> 'categories') c $$,
  $$ values ('research', 8.00::numeric), ('temple', 0), ('idols', 0), ('guardians', 0), ('cards', 32), ('fear', 0) $$,
  'the average per category, in score sheet order'
);

select results_eq(
  $$ select l ->> 'slug', (l ->> 'games')::int, (l ->> 'wins')::int, (l ->> 'avg_place')::numeric,
            (l ->> 'avg_points')::numeric, (l ->> 'avg_research')::numeric
     from ana_stats, jsonb_array_elements(s -> 'leaders') l $$,
  $$ values ('captain', 2, 1, 1.50::numeric, 40.00::numeric, 8.00::numeric),
            ('mystic', 1, 1, 1.00, 40.00, 8.00) $$,
  'per leader she played, most played first'
);

select is(
  public.get_player_stats('11111111-1111-1111-1111-111111111111') ->> 'games',
  '3',
  'the same numbers on every call'
);

select throws_ok(
  $$ select public.get_player_stats('11111111-1111-1111-1111-111111111111', 'chess') $$,
  '22023', 'unknown game "chess"',
  'an unknown game is rejected'
);

-- ---------------------------------------------------------------------------
-- Who may see them
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select is(
  public.get_player_stats('11111111-1111-1111-1111-111111111111') ->> 'games',
  '3',
  'Bob, her friend, sees Ana''s totals, including m3 which he didn''t play'
);

select results_eq(
  $$ select (s ->> 'games')::int, (s ->> 'wins')::int
     from (select public.get_player_stats('22222222-2222-2222-2222-222222222222') as s) own $$,
  $$ values (2, 1) $$,
  'Bob''s own stats count only his matches'
);

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select throws_ok(
  $$ select public.get_player_stats('11111111-1111-1111-1111-111111111111') $$,
  '42501', 'stats are only visible to the player and their friends',
  'Carla played with Ana, but isn''t her friend: no stats'
);

set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';

select results_eq(
  $$ select (s ->> 'games')::int, s ->> 'avg_place', jsonb_array_length(s -> 'leaders'),
            jsonb_array_length(s -> 'categories')
     from (select public.get_player_stats('44444444-4444-4444-4444-444444444444') as s) own $$,
  $$ values (0, null::text, 0, 6) $$,
  'someone who never played gets zeros, no averages, and every category listed'
);

select throws_ok(
  $$ select public.get_player_stats('11111111-1111-1111-1111-111111111111') $$,
  '42501', null,
  'a stranger gets no stats'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.get_player_stats('11111111-1111-1111-1111-111111111111') $$,
  '42501', null,
  'signed-out visitors get no stats'
);

select ok(
  not has_function_privilege('anon', 'public.get_player_stats(uuid, text)', 'execute'),
  'anon can''t even call the function'
);

select * from finish();
rollback;
