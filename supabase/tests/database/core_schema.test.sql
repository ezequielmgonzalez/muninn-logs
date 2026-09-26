-- Constraints, triggers and the match_results view from the core schema.
-- Runs as the postgres role, so RLS doesn't apply here; policies get their own tests.
begin;
create extension if not exists pgtap with schema extensions;

select plan(24);

-- Deferred unique constraints only fire at commit, and this transaction rolls back.
set constraints all immediate;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com', '{"full_name": "Ana"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{}'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com', '{}');

insert into public.games (id, slug, min_players, max_players) values
  ('a0000000-0000-0000-0000-000000000001', 'test-game', 2, 4),
  ('a0000000-0000-0000-0000-000000000002', 'other-game', 2, 4);

insert into public.game_characters (id, game_id, slug) values
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'hero'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'villain'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'stranger');

insert into public.score_categories (id, game_id, slug, sort_order) values
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'points', 1),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'penalty', 2),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'other', 1);

insert into public.players (id, owner_id, name) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jessi'),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Robert');

create temporary table ids as select
  (select id from public.players where user_id = '11111111-1111-1111-1111-111111111111') as ana,
  (select id from public.players where user_id = '22222222-2222-2222-2222-222222222222') as bob;

-- ---------------------------------------------------------------------------
-- Sign-up
-- ---------------------------------------------------------------------------

select is(
  (select display_name from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Ana',
  'sign-up creates a profile named after full_name'
);

select is(
  (select display_name from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'bob',
  'without full_name, display_name falls back to the email prefix'
);

select isnt((select ana from ids), null, 'sign-up creates the user''s player row');

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.players (name) values ('Nobody') $$,
  '23514', null, 'a guest needs an owner'
);

select throws_ok(
  $$ insert into public.players (user_id, name)
     values ('22222222-2222-2222-2222-222222222222', 'Bob') $$,
  '23514', null, 'a user player can''t also have a guest name'
);

select throws_ok(
  $$ insert into public.players (owner_id, name)
     values ('11111111-1111-1111-1111-111111111111', '  Jessi ') $$,
  '23514', null, 'guest names are stored trimmed'
);

-- ---------------------------------------------------------------------------
-- Friendships
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111') $$,
  '23514', null, 'a user can''t befriend themselves'
);

select lives_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222') $$,
  'a user can send a friend request'
);

select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111') $$,
  '23505', null, 'only one friendship row per pair, in either direction'
);

select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id, status)
     values ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted') $$,
  '23514', null, 'an accepted friendship needs accepted_at'
);

with accepted as (
  update public.friendships set status = 'accepted'
  where requester_id = '11111111-1111-1111-1111-111111111111'
  returning accepted_at
)
select isnt((select accepted_at from accepted), null, 'accepting a request sets accepted_at');

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

insert into public.matches (id, game_id, created_by, played_on) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', '2026-09-20'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   '11111111-1111-1111-1111-111111111111', '2026-09-21');

select lives_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order, character_id)
     select 'e0000000-0000-0000-0000-000000000001'::uuid, ana, 1, 'c0000000-0000-0000-0000-000000000001'::uuid from ids
     union all
     select 'e0000000-0000-0000-0000-000000000001', bob, 2, 'c0000000-0000-0000-0000-000000000002' from ids
     union all
     select 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 3, null
     union all
     select 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 4, null $$,
  'players without a leader don''t collide with each other'
);

select throws_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order, character_id)
     select 'e0000000-0000-0000-0000-000000000002'::uuid, ana, 1, 'c0000000-0000-0000-0000-000000000001'::uuid from ids
     union all
     select 'e0000000-0000-0000-0000-000000000002', bob, 2, 'c0000000-0000-0000-0000-000000000001' from ids $$,
  '23505', null, 'a leader can be played by only one player per match'
);

select throws_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order)
     select 'e0000000-0000-0000-0000-000000000002'::uuid, ana, 1 from ids
     union all
     select 'e0000000-0000-0000-0000-000000000002', bob, 1 from ids $$,
  '23505', null, 'turn order is unique per match'
);

select throws_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order, character_id)
     select 'e0000000-0000-0000-0000-000000000002', ana, 1, 'c0000000-0000-0000-0000-000000000003' from ids $$,
  '23514', null, 'a character must belong to the match''s game'
);

select throws_ok(
  $$ insert into public.match_player_scores (match_id, player_id, category_id, points)
     select 'e0000000-0000-0000-0000-000000000001', ana, 'd0000000-0000-0000-0000-000000000003', 1 from ids $$,
  '23514', null, 'a score category must belong to the match''s game'
);

select throws_ok(
  $$ update public.matches set game_id = 'a0000000-0000-0000-0000-000000000002'
     where id = 'e0000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'a match can''t change game'
);

-- ---------------------------------------------------------------------------
-- match_results
-- ---------------------------------------------------------------------------

-- Ana 10 - 2 = 8, Bob 8, Jessi 3, Robert no scores.
insert into public.match_player_scores (match_id, player_id, category_id, points)
select 'e0000000-0000-0000-0000-000000000001'::uuid, ana, 'd0000000-0000-0000-0000-000000000001'::uuid, 10 from ids
union all
select 'e0000000-0000-0000-0000-000000000001', ana, 'd0000000-0000-0000-0000-000000000002', -2 from ids
union all
select 'e0000000-0000-0000-0000-000000000001', bob, 'd0000000-0000-0000-0000-000000000001', 8 from ids
union all
select 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 3;

select is(
  (select total from public.match_results
   where match_id = 'e0000000-0000-0000-0000-000000000001' and player_id = (select ana from ids)),
  8,
  'total sums every category, negatives included'
);

select is(
  (select total from public.match_results
   where match_id = 'e0000000-0000-0000-0000-000000000001'
     and player_id = 'b0000000-0000-0000-0000-000000000002'),
  0,
  'a player with no scores totals 0'
);

select is(
  (select count(*)::integer from public.match_results
   where match_id = 'e0000000-0000-0000-0000-000000000001' and is_winner),
  2,
  'an unresolved tie for first is a shared win'
);

update public.match_players set won_tiebreak = true
where match_id = 'e0000000-0000-0000-0000-000000000001' and player_id = (select bob from ids);

select results_eq(
  $$ select player_id from public.match_results
     where match_id = 'e0000000-0000-0000-0000-000000000001' and is_winner $$,
  $$ select bob from ids $$,
  'won_tiebreak decides a tie for first'
);

select throws_ok(
  $$ update public.match_players set won_tiebreak = true
     where match_id = 'e0000000-0000-0000-0000-000000000001'
       and player_id = (select ana from ids) $$,
  '23505', null, 'only one player per match can win the tiebreak'
);

-- ---------------------------------------------------------------------------
-- Security
-- ---------------------------------------------------------------------------

select is(
  (select array_agg(c.relname::text order by c.relname)
   from pg_class c
   join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'every table in public has RLS enabled'
);

select ok(
  (select 'security_invoker=true' = any (reloptions)
   from pg_class where oid = 'public.match_results'::regclass),
  'match_results applies the caller''s RLS (security_invoker)'
);

select * from finish();
rollback;
