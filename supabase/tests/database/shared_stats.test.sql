-- get_shared_stats(): comparing friends on the games they played together.
--
-- Ana is friends with Bob, Carla and Eve; Dan is a stranger. Matches:
--   m1  Ana 50 (research 10)  beats Bob 40 (research 5)
--   m2  Bob 45 beats Ana 30 (research 6) and Carla 20
--   m3  Ana 40 ties Carla 40: both win
--   m4  Bob 60 beats Carla 10, without Ana
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'shared-ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'shared-bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'shared-carla@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'shared-dan@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'shared-eve@example.com');

update public.players set id = 'f0000000-0000-0000-0000-000000000001' where user_id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000002' where user_id = '22222222-2222-2222-2222-222222222222';
update public.players set id = 'f0000000-0000-0000-0000-000000000003' where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', now()),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted', now()),
  ('11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555', 'accepted', now());

insert into public.matches (id, game_id, created_by, played_on)
select m.id, g.id, m.created_by, '2026-09-01'
from public.games g,
  (values ('e0000000-0000-0000-0000-000000000001'::uuid, '11111111-1111-1111-1111-111111111111'::uuid),
          ('e0000000-0000-0000-0000-000000000002'::uuid, '11111111-1111-1111-1111-111111111111'::uuid),
          ('e0000000-0000-0000-0000-000000000003'::uuid, '11111111-1111-1111-1111-111111111111'::uuid),
          ('e0000000-0000-0000-0000-000000000004'::uuid, '22222222-2222-2222-2222-222222222222'::uuid)) as m(id, created_by)
where g.slug = 'arnak';

insert into public.match_players (match_id, player_id, turn_order)
values
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 2),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 2),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000003', 3),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', 2),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000002', 1),
  ('e0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000003', 2);

-- Research as given, the rest of the total in cards, 0 elsewhere.
insert into public.match_player_scores (match_id, player_id, category_id, points)
select v.match_id, v.player_id, c.id,
  case c.slug when 'research' then v.research when 'cards' then v.total - v.research else 0 end
from (values
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 10, 50),
  ('e0000000-0000-0000-0000-000000000001'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 5, 40),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 6, 30),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 9, 45),
  ('e0000000-0000-0000-0000-000000000002'::uuid, 'f0000000-0000-0000-0000-000000000003'::uuid, 2, 20),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000001'::uuid, 8, 40),
  ('e0000000-0000-0000-0000-000000000003'::uuid, 'f0000000-0000-0000-0000-000000000003'::uuid, 7, 40),
  ('e0000000-0000-0000-0000-000000000004'::uuid, 'f0000000-0000-0000-0000-000000000002'::uuid, 20, 60),
  ('e0000000-0000-0000-0000-000000000004'::uuid, 'f0000000-0000-0000-0000-000000000003'::uuid, 1, 10)
) as v(match_id, player_id, research, total)
cross join public.score_categories c
where c.game_id = (select id from public.games where slug = 'arnak');

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  $$ select (p ->> 'games')::int, (p ->> 'wins')::int, (p ->> 'avg_points')::numeric, (p ->> 'avg_place')::numeric
     from jsonb_array_elements(public.get_shared_stats(array['22222222-2222-2222-2222-222222222222'::uuid]))
       with ordinality as e(p, ord)
     order by ord $$,
  $$ values (2, 1, 40.00::numeric, 1.50::numeric), (2, 1, 42.50, 1.50) $$,
  'Ana and Bob: only m1 and m2, where both played; Ana first, then Bob'
);

select results_eq(
  $$ select c ->> 'slug', (c ->> 'average')::numeric
     from jsonb_array_elements(public.get_shared_stats(array['22222222-2222-2222-2222-222222222222'::uuid])) with ordinality as e(p, ord),
       jsonb_array_elements(p -> 'categories') c
     where ord = 1 $$,
  $$ values ('research', 8.00::numeric), ('temple', 0), ('idols', 0), ('guardians', 0), ('cards', 32), ('fear', 0) $$,
  'with the average per category over those games, in score sheet order'
);

select results_eq(
  $$ select (p ->> 'games')::int, (p ->> 'wins')::int, (p ->> 'avg_points')::numeric, (p ->> 'avg_place')::numeric
     from jsonb_array_elements(public.get_shared_stats(array[
       '33333333-3333-3333-3333-333333333333'::uuid, '22222222-2222-2222-2222-222222222222'::uuid]))
       with ordinality as e(p, ord)
     order by ord $$,
  $$ values (1, 0, 30.00::numeric, 2.00::numeric), (1, 0, 20.00, 3.00), (1, 1, 45.00, 1.00) $$,
  'all three: only m2; friends in the order asked (Carla, then Bob); m4 without Ana never counts'
);

select results_eq(
  $$ select (p ->> 'games')::int, p ->> 'avg_points', jsonb_array_length(p -> 'categories')
     from jsonb_array_elements(public.get_shared_stats(array['55555555-5555-5555-5555-555555555555'::uuid]))
       with ordinality as e(p, ord)
     order by ord $$,
  $$ values (0, null::text, 6), (0, null, 6) $$,
  'a friend she never played with: zeros, no averages, every category listed'
);

-- By number of players: m1 and m3 had 2, m2 had 3.
select results_eq(
  $$ select public.player_count(m) from public.matches m
     where m.id in ('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002')
     order by m.id $$,
  $$ values (2), (3) $$,
  'player_count() counts a match''s players'
);

select results_eq(
  $$ select (p ->> 'games')::int, (p ->> 'wins')::int
     from jsonb_array_elements(public.get_shared_stats(array['22222222-2222-2222-2222-222222222222'::uuid], 'arnak', array[2]))
       with ordinality as e(p, ord)
     order by ord $$,
  $$ values (1, 1), (1, 0) $$,
  'together with Bob in 2-player games: only m1, which Ana won'
);

select results_eq(
  $$ select (p ->> 'games')::int, (p ->> 'wins')::int
     from jsonb_array_elements(public.get_shared_stats(array['22222222-2222-2222-2222-222222222222'::uuid], 'arnak', array[3]))
       with ordinality as e(p, ord)
     order by ord $$,
  $$ values (1, 0), (1, 1) $$,
  'and in 3-player games: only m2, which Bob won'
);

select results_eq(
  $$ select (s ->> 'games')::int, (s ->> 'wins')::int, jsonb_array_length(s -> 'leaders')
     from (select public.get_player_stats('11111111-1111-1111-1111-111111111111', 'arnak', array[2]) as s) own $$,
  $$ values (2, 2, 1) $$,
  'Ana''s own stats in 2-player games: m1 and m3, both won, and their one leader entry (none)'
);

select results_eq(
  $$ select (s ->> 'games')::int, s ->> 'avg_points'
     from (select public.get_player_stats('11111111-1111-1111-1111-111111111111', 'arnak', array[4]) as s) own $$,
  $$ values (0, null::text) $$,
  'no 4-player games: zeros and no averages'
);

select results_eq(
  $$ select (s ->> 'games')::int, (s ->> 'wins')::int
     from (select public.get_player_stats('11111111-1111-1111-1111-111111111111', 'arnak', array[2, 3]) as s) own $$,
  $$ values (3, 2) $$,
  'several table sizes at once: 2 and 3 players count m1, m3 and m2'
);

select results_eq(
  $$ select (p ->> 'games')::int
     from jsonb_array_elements(public.get_shared_stats(array['22222222-2222-2222-2222-222222222222'::uuid], 'arnak', array[2, 4]))
       with ordinality as e(p, ord)
     order by ord $$,
  $$ values (1), (1) $$,
  'and together: 2 or 4 players leaves only m1'
);

select throws_ok(
  $$ select public.get_shared_stats(array['44444444-4444-4444-4444-444444444444'::uuid]) $$,
  '42501', 'you can only compare with your friends',
  'Dan isn''t her friend'
);

select throws_ok(
  $$ select public.get_shared_stats(array['11111111-1111-1111-1111-111111111111'::uuid]) $$,
  '42501', 'you can only compare with your friends',
  'nor is she herself'
);

select throws_ok(
  $$ select public.get_shared_stats(array[]::uuid[]) $$,
  '22023', 'pick at least one friend',
  'at least one friend'
);

select throws_ok(
  $$ select public.get_shared_stats(array['22222222-2222-2222-2222-222222222222'::uuid], 'chess') $$,
  '22023', 'unknown game "chess"',
  'an unknown game is rejected'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.get_shared_stats(array['22222222-2222-2222-2222-222222222222'::uuid]) $$,
  '42501', null,
  'signed-out visitors get nothing'
);

select ok(
  not has_function_privilege('anon', 'public.get_shared_stats(uuid[], text, integer[])', 'execute'),
  'anon can''t even call the function'
);

select * from finish();
rollback;
