-- get_guest_stats(): a guest's numbers, for their owner and anyone who shared
-- a match with them, counting only the matches the caller can see.
--
-- Jessi is Ana's guest. Bob (Ana's friend) also played with her, in a match
-- Ana wasn't in. Carla never played with her.
--   m1  logged by Ana:  Ana 50 beats Jessi 40
--   m2  logged by Bob:  Jessi 45 (captain) beats Bob 30
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'ana-guest-stats@example.com'),
  ('a2222222-2222-2222-2222-222222222222', 'bob-guest-stats@example.com'),
  ('a3333333-3333-3333-3333-333333333333', 'carla-guest-stats@example.com');

update public.players set id = 'a0000000-0000-0000-0000-000000000001' where user_id = 'a1111111-1111-1111-1111-111111111111';
update public.players set id = 'a0000000-0000-0000-0000-000000000002' where user_id = 'a2222222-2222-2222-2222-222222222222';
insert into public.players (id, owner_id, name)
values ('a0000000-0000-0000-0000-00000000000a', 'a1111111-1111-1111-1111-111111111111', 'Jessi');

insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('a1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'accepted', now());

insert into public.matches (id, game_id, created_by, played_on)
select m.id, g.id, m.created_by, '2026-09-01'
from public.games g,
  (values ('ae000000-0000-0000-0000-000000000001'::uuid, 'a1111111-1111-1111-1111-111111111111'::uuid),
          ('ae000000-0000-0000-0000-000000000002'::uuid, 'a2222222-2222-2222-2222-222222222222'::uuid)) as m(id, created_by)
where g.slug = 'arnak';

insert into public.match_players (match_id, player_id, turn_order, character_id)
select v.match_id, v.player_id, v.turn_order, (select id from public.game_characters where slug = v.leader)
from (values
  ('ae000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 1, null),
  ('ae000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-00000000000a'::uuid, 2, null),
  ('ae000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 1, null),
  ('ae000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-00000000000a'::uuid, 2, 'captain')
) as v(match_id, player_id, turn_order, leader);

-- The whole total in cards, 0 elsewhere.
insert into public.match_player_scores (match_id, player_id, category_id, points)
select v.match_id, v.player_id, c.id, case c.slug when 'cards' then v.total else 0 end
from (values
  ('ae000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-000000000001'::uuid, 50),
  ('ae000000-0000-0000-0000-000000000001'::uuid, 'a0000000-0000-0000-0000-00000000000a'::uuid, 40),
  ('ae000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-000000000002'::uuid, 30),
  ('ae000000-0000-0000-0000-000000000002'::uuid, 'a0000000-0000-0000-0000-00000000000a'::uuid, 45)
) as v(match_id, player_id, total)
cross join public.score_categories c
where c.game_id = (select id from public.games where slug = 'arnak');

select ok(
  not has_function_privilege('anon', 'public.get_guest_stats(uuid, text, integer[])', 'execute'),
  'visitors can''t ask for a guest''s stats'
);
select ok(
  not has_function_privilege('authenticated', 'private.player_stats(uuid, uuid, integer[], boolean)', 'execute'),
  'the shared calculation is only reachable through the checked functions'
);

-- ---------------------------------------------------------------------------
-- Ana, the owner: only the match she can see (m1)
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1111111-1111-1111-1111-111111111111", "role": "authenticated"}';

create temporary table ana_sees on commit drop as
select public.get_guest_stats('a0000000-0000-0000-0000-00000000000a') as s;

select results_eq(
  $$ select (s ->> 'games')::int, (s ->> 'wins')::int, (s ->> 'avg_points')::numeric from ana_sees $$,
  $$ values (1, 0, 40.00::numeric) $$,
  'the owner sees the guest''s numbers from her own matches, not from Bob''s'
);

select results_eq(
  $$ select (public.get_guest_stats('a0000000-0000-0000-0000-00000000000a', 'arnak', array[3]) ->> 'games')::int $$,
  $$ values (0) $$,
  'the player count filters them too'
);

select throws_ok(
  $$ select public.get_guest_stats('a0000000-0000-0000-0000-000000000002') $$,
  '42501',
  null,
  'a user isn''t a guest: their stats need a friendship (get_player_stats)'
);

-- Her own and her friends' stats work as before.
select results_eq(
  $$ select (public.get_player_stats('a2222222-2222-2222-2222-222222222222') ->> 'games')::int $$,
  $$ values (1) $$,
  'get_player_stats still counts every match of a friend''s'
);

-- ---------------------------------------------------------------------------
-- Bob shared a match with Jessi without owning her: only that one (m2)
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "a2222222-2222-2222-2222-222222222222", "role": "authenticated"}';

create temporary table bob_sees on commit drop as
select public.get_guest_stats('a0000000-0000-0000-0000-00000000000a') as s;

select results_eq(
  $$ select (s ->> 'games')::int, (s ->> 'wins')::int, (s ->> 'avg_points')::numeric from bob_sees $$,
  $$ values (1, 1, 45.00::numeric) $$,
  'someone who played with the guest sees her numbers from the matches he shared'
);

select results_eq(
  $$ select l ->> 'slug', (l ->> 'games')::int from bob_sees, jsonb_array_elements(s -> 'leaders') l $$,
  $$ values ('captain', 1) $$,
  'with her leaders, like anyone''s stats'
);

-- ---------------------------------------------------------------------------
-- Carla never played with Jessi
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "a3333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select throws_ok(
  $$ select public.get_guest_stats('a0000000-0000-0000-0000-00000000000a') $$,
  '42501',
  null,
  'nobody else sees a guest''s stats'
);

select * from finish();
rollback;
