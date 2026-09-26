-- Row Level Security: what each signed-in user can see and change.
-- See "Who can see what" / "Who can change what" in docs/data-model.md.
--
-- Cast:
--   Ana   friends with Bob and Carla; pending request to Dan.
--   Bob   friends with Ana only. Owns guest Roberto.
--   Carla friends with Ana and Dan. Not Bob's friend, but played m1 with him.
--   Dan   friends with Carla; no matches.
--   Guests: Jessi (Ana's), Roberto (Bob's), Xavi (Carla's, never played).
--
--   m1 logged by Ana: Ana, Bob, Carla, Jessi
--   m2 logged by Bob: Bob, Roberto
--   m3 logged by Ana, who didn't play: Bob, Jessi
begin;
create extension if not exists pgtap with schema extensions;

select plan(39);

set constraints all immediate;

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres, bypassing RLS)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'dan@example.com');

-- Give the sign-up-created player rows readable ids: f…1 = Ana's player, etc.
update public.players set id = 'f0000000-0000-0000-0000-000000000001' where user_id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000002' where user_id = '22222222-2222-2222-2222-222222222222';
update public.players set id = 'f0000000-0000-0000-0000-000000000003' where user_id = '33333333-3333-3333-3333-333333333333';
update public.players set id = 'f0000000-0000-0000-0000-000000000004' where user_id = '44444444-4444-4444-4444-444444444444';

update public.profiles set username = 'bob_plays' where id = '22222222-2222-2222-2222-222222222222';

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', now()),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'accepted', now()),
  ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 'accepted', now()),
  ('11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'pending', null);

insert into public.players (id, owner_id, name) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jessi'),
  ('b0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Roberto'),
  ('b0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Xavi');

insert into public.games (id, slug, min_players, max_players)
values ('a0000000-0000-0000-0000-000000000001', 'test-game', 2, 4);
insert into public.game_characters (id, game_id, slug)
values ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'hero');
insert into public.score_categories (id, game_id, slug, sort_order)
values ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'points', 1);

insert into public.matches (id, game_id, created_by, played_on) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-09-01'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', '2026-09-02'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-09-03');

insert into public.match_players (match_id, player_id, turn_order, character_id) values
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 1, 'c0000000-0000-0000-0000-000000000001'),
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 2, null),
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000003', 3, null),
  ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 4, null),
  ('e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', 1, null),
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 2, null),
  ('e0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000002', 1, null),
  ('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 2, null);

insert into public.match_player_scores (match_id, player_id, category_id, points) values
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 10),
  ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 7);

-- ---------------------------------------------------------------------------
-- Ana
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  'select id from public.matches order by id',
  $$ values ('e0000000-0000-0000-0000-000000000001'::uuid), ('e0000000-0000-0000-0000-000000000003'::uuid) $$,
  'Ana sees the matches she logged, including m3 where she didn''t play'
);

select results_eq(
  'select id from public.profiles order by id',
  $$ values ('11111111-1111-1111-1111-111111111111'::uuid), ('22222222-2222-2222-2222-222222222222'::uuid),
            ('33333333-3333-3333-3333-333333333333'::uuid), ('44444444-4444-4444-4444-444444444444'::uuid) $$,
  'Ana sees her own profile, her friends and Dan (pending request)'
);

select results_eq(
  'select id from public.players order by id',
  $$ values ('b0000000-0000-0000-0000-000000000001'::uuid), ('f0000000-0000-0000-0000-000000000001'::uuid),
            ('f0000000-0000-0000-0000-000000000002'::uuid), ('f0000000-0000-0000-0000-000000000003'::uuid) $$,
  'Ana sees herself, her guest Jessi and her friends, but not other people''s unshared guests'
);

select is(
  (select count(*)::integer from public.friendships),
  3,
  'Ana sees only friendships she''s part of, not Carla–Dan'
);

select is(
  (select count(*)::integer from public.match_results where match_id = 'e0000000-0000-0000-0000-000000000001'),
  4,
  'Ana sees every player''s result in m1 through match_results'
);

with updated as (
  update public.matches set played_on = '2026-09-10'
  where id = 'e0000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*)::integer from updated), 1, 'Ana can edit a match she logged');

select throws_ok(
  $$ update public.match_players set player_id = 'f0000000-0000-0000-0000-000000000004'
     where match_id = 'e0000000-0000-0000-0000-000000000001'
       and player_id = 'b0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'swapping who played is delete + insert, not an update of player_id'
);

select throws_ok(
  $$ delete from public.players where id = 'b0000000-0000-0000-0000-000000000001' $$,
  '23503', null, 'Ana can''t delete Jessi while she appears in matches'
);

-- ---------------------------------------------------------------------------
-- Bob
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq(
  'select id from public.matches order by id',
  $$ values ('e0000000-0000-0000-0000-000000000001'::uuid), ('e0000000-0000-0000-0000-000000000002'::uuid),
            ('e0000000-0000-0000-0000-000000000003'::uuid) $$,
  'Bob sees every match he played, whoever logged it'
);

select is(
  (select count(*)::integer from public.friendships),
  1,
  'Bob doesn''t see Ana''s request to Dan'
);

with updated as (
  update public.matches set played_on = '2020-01-01'
  where id = 'e0000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*)::integer from updated), 0, 'Bob can''t edit a match Ana logged');

with deleted as (
  delete from public.matches where id = 'e0000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*)::integer from deleted), 0, 'Bob can''t delete a match Ana logged');

select throws_ok(
  $$ insert into public.match_player_scores (match_id, player_id, category_id, points)
     values ('e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002',
             'd0000000-0000-0000-0000-000000000001', 99) $$,
  '42501', null, 'Bob can''t add scores to a match Ana logged'
);

with updated as (
  update public.players set name = 'Hacked'
  where id = 'b0000000-0000-0000-0000-000000000001'
  returning 1
)
select is((select count(*)::integer from updated), 0, 'Bob can''t rename Ana''s guest');

select lives_ok(
  $$ insert into public.matches (game_id, played_on)
     values ('a0000000-0000-0000-0000-000000000001', '2026-09-25') $$,
  'Bob can log a match'
);

select lives_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order)
     select id, 'f0000000-0000-0000-0000-000000000001', 1 from public.matches
     where created_by = '22222222-2222-2222-2222-222222222222' and played_on = '2026-09-25' $$,
  'Bob can add Ana, a friend'
);

select throws_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order)
     select id, 'f0000000-0000-0000-0000-000000000003', 2 from public.matches
     where created_by = '22222222-2222-2222-2222-222222222222' and played_on = '2026-09-25' $$,
  '42501', null, 'Bob can''t add Carla: they played together but aren''t friends'
);

select lives_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order)
     select id, 'b0000000-0000-0000-0000-000000000001', 2 from public.matches
     where created_by = '22222222-2222-2222-2222-222222222222' and played_on = '2026-09-25' $$,
  'Bob can add Ana''s guest Jessi, whom he has played with'
);

select throws_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order)
     select id, 'b0000000-0000-0000-0000-000000000003', 3 from public.matches
     where created_by = '22222222-2222-2222-2222-222222222222' and played_on = '2026-09-25' $$,
  '42501', null, 'Bob can''t add Carla''s guest Xavi, whom he has never played with'
);

select lives_ok(
  $$ insert into public.match_players (match_id, player_id, turn_order)
     select id, 'b0000000-0000-0000-0000-000000000002', 3 from public.matches
     where created_by = '22222222-2222-2222-2222-222222222222' and played_on = '2026-09-25' $$,
  'Bob can add his own guest'
);

select throws_ok(
  $$ insert into public.players (owner_id, name) values ('11111111-1111-1111-1111-111111111111', 'Fake') $$,
  '42501', null, 'Bob can''t create a guest owned by Ana'
);

select throws_ok(
  $$ insert into public.matches (game_id, played_on, created_by)
     values ('a0000000-0000-0000-0000-000000000001', '2026-09-25', '11111111-1111-1111-1111-111111111111') $$,
  '42501', null, 'Bob can''t log a match in Ana''s name'
);

select throws_ok(
  $$ insert into public.friendships (requester_id, addressee_id)
     values ('33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444') $$,
  '42501', null, 'Bob can''t send a friend request on Carla''s behalf'
);

insert into public.friendships (requester_id, addressee_id)
values ('22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333');

with updated as (
  update public.friendships set status = 'accepted'
  where requester_id = '22222222-2222-2222-2222-222222222222'
    and addressee_id = '33333333-3333-3333-3333-333333333333'
  returning 1
)
select is((select count(*)::integer from updated), 0, 'Bob can''t accept his own request to Carla');

-- ---------------------------------------------------------------------------
-- Carla
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

select results_eq(
  'select id from public.matches order by id',
  $$ values ('e0000000-0000-0000-0000-000000000001'::uuid) $$,
  'Carla sees only m1, the match she played'
);

select ok(
  exists (select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Carla sees Bob''s name: not friends, but they played m1 together'
);

select ok(
  exists (select 1 from public.players where id = 'b0000000-0000-0000-0000-000000000001'),
  'Carla sees Ana''s guest Jessi, whom she played with'
);

select ok(
  not exists (select 1 from public.players where id = 'b0000000-0000-0000-0000-000000000002'),
  'Carla doesn''t see Bob''s guest Roberto, whom she never played with'
);

select throws_ok(
  $$ update public.friendships set requester_id = '44444444-4444-4444-4444-444444444444'
     where requester_id = '22222222-2222-2222-2222-222222222222' $$,
  '42501', null, 'Carla can''t rewrite who sent her a request'
);

with updated as (
  update public.friendships set status = 'accepted'
  where requester_id = '22222222-2222-2222-2222-222222222222'
    and addressee_id = '33333333-3333-3333-3333-333333333333'
  returning accepted_at
)
select isnt((select accepted_at from updated), null, 'Carla accepts Bob''s request and accepted_at is set');

select is(
  (select count(*)::integer from public.score_categories
   where game_id = 'a0000000-0000-0000-0000-000000000001'),
  1,
  'signed-in users can read the game catalog'
);

select results_eq(
  $$ select id from public.find_profile_by_username(' Bob_Plays ') $$,
  $$ values ('22222222-2222-2222-2222-222222222222'::uuid) $$,
  'finding a profile matches the exact username, ignoring case and spaces'
);

select is_empty(
  $$ select * from public.find_profile_by_username('bob') $$,
  'a partial username finds nobody'
);

-- ---------------------------------------------------------------------------
-- Dan
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "44444444-4444-4444-4444-444444444444", "role": "authenticated"}';

select ok(
  exists (select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Dan sees Ana, who sent him a request'
);

select ok(
  not exists (select 1 from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  'Dan doesn''t see Bob: no friendship, no shared match'
);

select is_empty(
  'select * from public.matches',
  'Dan sees no matches'
);

-- ---------------------------------------------------------------------------
-- Signed out
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  'select * from public.matches',
  '42501', null, 'signed-out visitors can''t read matches'
);

select throws_ok(
  'select * from public.games',
  '42501', null, 'signed-out visitors can''t read the catalog'
);

select throws_ok(
  $$ select * from public.find_profile_by_username('bob_plays') $$,
  '42501', null, 'signed-out visitors can''t look up usernames'
);

select * from finish();
rollback;
