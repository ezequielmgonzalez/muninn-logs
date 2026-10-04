-- get_rankings(): who appears, and what counts for each of them.
--
-- Ana is friends with Bob; Carla played with Ana but isn't her friend. Jessi
-- is Ana's guest, Jero and Kiki are Bob's. Matches (winner first):
--   m1  Ana's, snake, 3 players:  Ana 50 (professor), Jessi 40 (captain), Jero 30 (mystic)
--   m2  Ana's, bird,  2 players:  Bob 45 (professor), Ana 30 (captain)
--   m3  Bob's, snake, 2 players:  Bob 60 (professor), Jero 20 (captain)    -- Ana isn't in it
--   m4  Ana's, snake, 2 players:  Carla 50 (captain), Ana 35 (professor)
--   m5  Bob's, bird,  2 players:  Bob 40 (captain), Kiki 10 (mystic)       -- nor in this one
--   m6  Ana's, no temple, no leaders, turn order unknown: Ana 44, Jessi 20
-- Turn order is the order listed (Ana went first in m1, second in m2 and m4).
begin;
create extension if not exists pgtap with schema extensions;

select plan(18);

insert into auth.users (id, email) values
  ('c1111111-1111-1111-1111-111111111111', 'ana-rankings@example.com'),
  ('c2222222-2222-2222-2222-222222222222', 'bob-rankings@example.com'),
  ('c3333333-3333-3333-3333-333333333333', 'carla-rankings@example.com');
update public.profiles set display_name = 'Ana' where id = 'c1111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Bob' where id = 'c2222222-2222-2222-2222-222222222222';
update public.profiles set display_name = 'Carla' where id = 'c3333333-3333-3333-3333-333333333333';

update public.players set id = 'c0000000-0000-0000-0000-000000000001' where user_id = 'c1111111-1111-1111-1111-111111111111';
update public.players set id = 'c0000000-0000-0000-0000-000000000002' where user_id = 'c2222222-2222-2222-2222-222222222222';
update public.players set id = 'c0000000-0000-0000-0000-000000000003' where user_id = 'c3333333-3333-3333-3333-333333333333';
insert into public.players (id, owner_id, name) values
  ('c0000000-0000-0000-0000-00000000000a', 'c1111111-1111-1111-1111-111111111111', 'Jessi'),
  ('c0000000-0000-0000-0000-00000000000b', 'c2222222-2222-2222-2222-222222222222', 'Jero'),
  ('c0000000-0000-0000-0000-00000000000c', 'c2222222-2222-2222-2222-222222222222', 'Kiki');

insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('c1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222', 'accepted', now());

insert into public.matches (id, game_id, created_by, played_on, setup)
select m.id, g.id, m.created_by, '2026-09-01', jsonb_build_object('board_side', m.side)
from public.games g,
  (values ('ce000000-0000-0000-0000-000000000001'::uuid, 'c1111111-1111-1111-1111-111111111111'::uuid, 'snake'),
          ('ce000000-0000-0000-0000-000000000002'::uuid, 'c1111111-1111-1111-1111-111111111111'::uuid, 'bird'),
          ('ce000000-0000-0000-0000-000000000003'::uuid, 'c2222222-2222-2222-2222-222222222222'::uuid, 'snake'),
          ('ce000000-0000-0000-0000-000000000004'::uuid, 'c1111111-1111-1111-1111-111111111111'::uuid, 'snake'),
          ('ce000000-0000-0000-0000-000000000005'::uuid, 'c2222222-2222-2222-2222-222222222222'::uuid, 'bird'),
          ('ce000000-0000-0000-0000-000000000006'::uuid, 'c1111111-1111-1111-1111-111111111111'::uuid, null)) as m(id, created_by, side)
where g.slug = 'arnak';

insert into public.match_players (match_id, player_id, turn_order, character_id)
select v.match_id, v.player_id, v.turn_order, (select id from public.game_characters where slug = v.leader)
from (values
  ('ce000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 1, 'professor'),
  ('ce000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-00000000000a'::uuid, 2, 'captain'),
  ('ce000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-00000000000b'::uuid, 3, 'mystic'),
  ('ce000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 1, 'professor'),
  ('ce000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 2, 'captain'),
  ('ce000000-0000-0000-0000-000000000003'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 1, 'professor'),
  ('ce000000-0000-0000-0000-000000000003'::uuid, 'c0000000-0000-0000-0000-00000000000b'::uuid, 2, 'captain'),
  ('ce000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000003'::uuid, 1, 'captain'),
  ('ce000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 2, 'professor'),
  ('ce000000-0000-0000-0000-000000000005'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 1, 'captain'),
  ('ce000000-0000-0000-0000-000000000005'::uuid, 'c0000000-0000-0000-0000-00000000000c'::uuid, 2, 'mystic'),
  ('ce000000-0000-0000-0000-000000000006'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, null, null),
  ('ce000000-0000-0000-0000-000000000006'::uuid, 'c0000000-0000-0000-0000-00000000000a'::uuid, null, null)
) as v(match_id, player_id, turn_order, leader);

-- The whole total in cards, 0 elsewhere.
insert into public.match_player_scores (match_id, player_id, category_id, points)
select v.match_id, v.player_id, c.id, case c.slug when 'cards' then v.total else 0 end
from (values
  ('ce000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 50),
  ('ce000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-00000000000a'::uuid, 40),
  ('ce000000-0000-0000-0000-000000000001'::uuid, 'c0000000-0000-0000-0000-00000000000b'::uuid, 30),
  ('ce000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 45),
  ('ce000000-0000-0000-0000-000000000002'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 30),
  ('ce000000-0000-0000-0000-000000000003'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 60),
  ('ce000000-0000-0000-0000-000000000003'::uuid, 'c0000000-0000-0000-0000-00000000000b'::uuid, 20),
  ('ce000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000003'::uuid, 50),
  ('ce000000-0000-0000-0000-000000000004'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 35),
  ('ce000000-0000-0000-0000-000000000005'::uuid, 'c0000000-0000-0000-0000-000000000002'::uuid, 40),
  ('ce000000-0000-0000-0000-000000000005'::uuid, 'c0000000-0000-0000-0000-00000000000c'::uuid, 10),
  ('ce000000-0000-0000-0000-000000000006'::uuid, 'c0000000-0000-0000-0000-000000000001'::uuid, 44),
  ('ce000000-0000-0000-0000-000000000006'::uuid, 'c0000000-0000-0000-0000-00000000000a'::uuid, 20)
) as v(match_id, player_id, total)
cross join public.score_categories c
where c.game_id = (select id from public.games where slug = 'arnak');

select ok(
  not has_function_privilege('anon', 'public.get_rankings(text, text, boolean, boolean, boolean, integer[], text, boolean, boolean, integer)', 'execute'),
  'visitors can''t see rankings'
);

set local role authenticated;
set local request.jwt.claims = '{"sub": "c1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- Rows as (name, kind, owner, games, wins), by name.
create temporary table everyone on commit drop as select public.get_rankings() as r;
select results_eq(
  $$ select p ->> 'name', p ->> 'kind', p ->> 'owner_name', (p ->> 'games')::int, (p ->> 'wins')::int
     from everyone, jsonb_array_elements(r -> 'players') p order by 1 $$,
  $$ values ('Ana', 'me', null, 4, 2),
            ('Bob', 'friend', null, 1, 1),
            ('Jero', 'other_guest', 'Bob', 1, 0),
            ('Jessi', 'own_guest', null, 2, 0) $$,
  'everyone Ana may see, over the matches she can see: not Bob''s games without her, not Carla (no friend), not Kiki (never met)'
);
select is((select (r ->> 'matches')::int from everyone), 4, 'and the distinct matches it uses: m1, m2, m4, m6');

create temporary table professor on commit drop as select public.get_rankings('professor') as r;
select results_eq(
  $$ select p ->> 'name', (p ->> 'games')::int, (p ->> 'wins')::int
     from professor, jsonb_array_elements(r -> 'players') p order by 1 $$,
  $$ values ('Ana', 2, 1), ('Bob', 1, 1) $$,
  'a leader counts each player''s own matches with it: Ana''s m1 and m4, Bob''s m2; Jessi and Jero never used it'
);
select is((select (r ->> 'matches')::int from professor), 3, 'the matches any of them played with the Professor');

create temporary table professor_snake on commit drop as select public.get_rankings('professor', 'snake') as r;
select results_eq(
  $$ select p ->> 'name', (p ->> 'games')::int, (p ->> 'avg_points')::numeric
     from professor_snake, jsonb_array_elements(r -> 'players') p order by 1 $$,
  $$ values ('Ana', 2, 42.50::numeric) $$,
  'and the temple: Bob''s Professor game was on the bird side'
);

create temporary table three_players on commit drop as
select public.get_rankings(player_counts => array[3]) as r;
select results_eq(
  $$ select p ->> 'name', (p ->> 'avg_place')::numeric
     from three_players, jsonb_array_elements(r -> 'players') p order by 1 $$,
  $$ values ('Ana', 1.00::numeric), ('Jero', 3.00::numeric), ('Jessi', 2.00::numeric) $$,
  'table sizes: only m1 had 3 players'
);

select results_eq(
  $$ select array_agg(p ->> 'name' order by p ->> 'name')
     from jsonb_array_elements(public.get_rankings(include_friends => false) -> 'players') p $$,
  $$ values (array['Ana', 'Jero', 'Jessi']) $$,
  'without friends'
);
select results_eq(
  $$ select array_agg(p ->> 'name' order by p ->> 'name')
     from jsonb_array_elements(public.get_rankings(include_own_guests => false, include_other_guests => false) -> 'players') p $$,
  $$ values (array['Ana', 'Bob']) $$,
  'without guests: you always stay'
);

select results_eq(
  $$ select p ->> 'name', (p ->> 'max_total')::int, (p ->> 'min_total')::int
     from everyone, jsonb_array_elements(r -> 'players') p where p ->> 'kind' = 'me' $$,
  $$ values ('Ana', 50, 30) $$,
  'each player''s highest and lowest total under the filters'
);

-- Games with nothing recorded: no leader, no temple.
select results_eq(
  $$ select p ->> 'name', (p ->> 'games')::int, (p ->> 'wins')::int
     from jsonb_array_elements(public.get_rankings(no_leader => true) -> 'players') p order by 1 $$,
  $$ values ('Ana', 1, 1), ('Jessi', 1, 0) $$,
  'without a leader: each player''s games where they had none recorded (m6)'
);
select results_eq(
  $$ select array_agg(p ->> 'name' order by p ->> 'name')
     from jsonb_array_elements(public.get_rankings(no_board_side => true) -> 'players') p $$,
  $$ values (array['Ana', 'Jessi']) $$,
  'without a temple: the matches with no side recorded (m6)'
);

-- Seats: where each player started; unknown turn orders never count.
select results_eq(
  $$ select p ->> 'name', (p ->> 'games')::int, (p ->> 'wins')::int
     from jsonb_array_elements(public.get_rankings(seat => 1) -> 'players') p order by 1 $$,
  $$ values ('Ana', 1, 1), ('Bob', 1, 1) $$,
  'starting first: Ana''s m1, Bob''s m2 (m6 has no turn order)'
);
select results_eq(
  $$ select p ->> 'name', (p ->> 'games')::int
     from jsonb_array_elements(public.get_rankings(seat => 2) -> 'players') p order by 1 $$,
  $$ values ('Ana', 2), ('Jessi', 1) $$,
  'starting second: Ana''s m2 and m4, Jessi''s m1'
);
select throws_ok(
  $$ select public.get_rankings(seat => 5) $$,
  '22023',
  null,
  'a seat is 1 to 4'
);

select results_eq(
  $$ select jsonb_array_length(r -> 'players'), (r ->> 'matches')::int
     from (select public.get_rankings('mechanic') as r) x $$,
  $$ values (0, 0) $$,
  'nobody played that combination: no rows'
);

select throws_ok(
  $$ select public.get_rankings('nobody') $$,
  '22023',
  null,
  'an unknown leader is refused'
);

-- The same function from Bobs side: what he can see.
set local request.jwt.claims = '{"sub": "c2222222-2222-2222-2222-222222222222", "role": "authenticated"}';
select results_eq(
  $$ select p ->> 'name', (p ->> 'games')::int
     from jsonb_array_elements(public.get_rankings() -> 'players') p order by 1 $$,
  $$ values ('Ana', 1), ('Bob', 3), ('Jero', 1), ('Kiki', 1) $$,
  'Bob''s view: the matches he logged or played (m2, m3, m5); Ana''s m1 isn''t one, so Jessi isn''t there and Jero counts once'
);

select * from finish();
rollback;
