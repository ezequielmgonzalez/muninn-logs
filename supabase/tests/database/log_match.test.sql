-- log_match() and list_addable_players(), signed in as different users.
--
-- Cast: Ana is friends with Bob and Carla; Bob and Carla are not friends.
-- Guests: Jessi (Ana's), Xavi (Carla's). In m0, logged by Ana, Ana, Bob,
-- Carla and Jessi played together, so Bob has played with Jessi and Carla.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

set constraints all immediate;

-- ---------------------------------------------------------------------------
-- Fixtures (as postgres)
-- ---------------------------------------------------------------------------

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com');

update public.profiles set display_name = 'Ana' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Bob' where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set display_name = 'Carla' where id = '33333333-3333-3333-3333-333333333333';

update public.players set id = 'f0000000-0000-0000-0000-000000000001' where user_id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000002' where user_id = '22222222-2222-2222-2222-222222222222';
update public.players set id = 'f0000000-0000-0000-0000-000000000003' where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.friendships (requester_id, addressee_id, status, accepted_at) values
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', now()),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'accepted', now());

insert into public.players (id, owner_id, name) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jessi'),
  ('b0000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Xavi');

insert into public.matches (id, game_id, created_by, played_on)
select 'e0000000-0000-0000-0000-000000000000', id, '11111111-1111-1111-1111-111111111111', '2026-01-01'
from public.games where slug = 'arnak';

insert into public.match_players (match_id, player_id, turn_order) values
  ('e0000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000001', 1),
  ('e0000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000002', 2),
  ('e0000000-0000-0000-0000-000000000000', 'f0000000-0000-0000-0000-000000000003', 3),
  ('e0000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000001', 4);

-- ---------------------------------------------------------------------------
-- list_addable_players
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select results_eq(
  $$ select name, is_me, is_guest from public.list_addable_players() $$,
  $$ values ('Ana', true, false), ('Bob', false, false), ('Carla', false, false), ('Jessi', false, true) $$,
  'Ana can add herself, her friends and her guest, in that order'
);

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select results_eq(
  $$ select name, is_guest, owner_name from public.list_addable_players() $$,
  $$ values ('Bob', false, null::text), ('Ana', false, null), ('Jessi', true, 'Ana') $$,
  'Bob can add Ana and her guest Jessi, but not Carla: he played with her but they are not friends'
);

-- ---------------------------------------------------------------------------
-- log_match: a full match
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- Ana 10+6+9+5+14-2 = 42, Bob 8+2+3+0+11-1 = 23, Nuevo 3, Jessi 42 but loses the tie.
select isnt(
  public.log_match(
    game_slug => 'arnak',
    played_on => '2026-09-20',
    duration_minutes => 95,
    setup => '{"board_side": "snake"}',
    players => $json$[
      {"player_id": "f0000000-0000-0000-0000-000000000001", "character": "captain", "won_tiebreak": true,
       "scores": {"research": 10, "temple": 6, "idols": 9, "guardians": 5, "cards": 14, "fear": -2}},
      {"player_id": "f0000000-0000-0000-0000-000000000002", "character": "falconer",
       "scores": {"research": 8, "temple": 2, "idols": 3, "guardians": 0, "cards": 11, "fear": -1}},
      {"new_guest_name": "  Nuevo  ", "character": null,
       "scores": {"research": 1, "temple": 0, "idols": 0, "guardians": 0, "cards": 2, "fear": 0}},
      {"player_id": "b0000000-0000-0000-0000-000000000001", "character": "mystic",
       "scores": {"research": 10, "temple": 6, "idols": 9, "guardians": 5, "cards": 14, "fear": -2}}
    ]$json$
  ),
  null,
  'Ana logs a match with herself, a friend, a new guest and her guest'
);

select results_eq(
  $$ select m.duration_minutes, m.setup ->> 'board_side', m.created_by
     from public.matches m where m.played_on = '2026-09-20' $$,
  $$ values (95, 'snake', '11111111-1111-1111-1111-111111111111'::uuid) $$,
  'the match is saved with its setup, logged by Ana'
);

select results_eq(
  $$ select coalesce(pr.display_name, p.name), c.slug
     from public.match_players mp
     join public.matches m on m.id = mp.match_id
     join public.players p on p.id = mp.player_id
     left join public.profiles pr on pr.id = p.user_id
     left join public.game_characters c on c.id = mp.character_id
     where m.played_on = '2026-09-20'
     order by mp.turn_order $$,
  $$ values ('Ana', 'captain'), ('Bob', 'falconer'), ('Nuevo', null), ('Jessi', 'mystic') $$,
  'players keep the order they were sent in, with their leaders'
);

select is(
  (select owner_id from public.players where name = 'Nuevo'),
  '11111111-1111-1111-1111-111111111111'::uuid,
  'a new guest is created trimmed and owned by whoever logged the match'
);

select is(
  (select count(*)::integer from public.match_player_scores s
   join public.matches m on m.id = s.match_id where m.played_on = '2026-09-20'),
  24,
  'every player gets a score in each of the 6 categories'
);

select results_eq(
  $$ select coalesce(pr.display_name, p.name), r.total, r.is_winner
     from public.match_results r
     join public.matches m on m.id = r.match_id
     join public.players p on p.id = r.player_id
     left join public.profiles pr on pr.id = p.user_id
     where m.played_on = '2026-09-20'
     order by r.rank, 1 $$,
  $$ values ('Ana', 42, true), ('Jessi', 42, false), ('Bob', 23, false), ('Nuevo', 3, false) $$,
  'totals include negative fear, and won_tiebreak decides the tie for first'
);

-- ---------------------------------------------------------------------------
-- log_match: what it rejects
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-21', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"new_guest_name": "Pepe",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000003",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '42501', null,
  'Bob can''t add Carla: they played together but aren''t friends'
);

select ok(
  not exists (select 1 from public.matches where played_on = '2026-09-21')
  and not exists (select 1 from public.players where name = 'Pepe'),
  'a rejected match leaves nothing behind, not even its new guests'
);

select lives_ok(
  $$ select public.log_match('arnak', '2026-09-22', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "b0000000-0000-0000-0000-000000000001",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  'Bob can add Ana''s guest Jessi, whom he has played with'
);

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-23', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '22023', 'arnak needs 2 to 4 players',
  'a match needs at least the game''s minimum players'
);

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-23', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001", "scores": {"research": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '22023', 'player 1 needs a score for every arnak category',
  'every category needs a score'
);

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-23', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0, "bonus": 5}},
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '22023', 'player 1 needs a score for every arnak category',
  'a category the game doesn''t have is rejected'
);

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-23', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001", "character": "wizard",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '22023', 'unknown character "wizard" for arnak',
  'an unknown leader is rejected'
);

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-23', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001", "character": "captain",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000002", "character": "captain",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '23505', null,
  'two players can''t play the same leader'
);

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-23', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000001",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '23505', null,
  'the same player can''t be in a match twice'
);

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-23', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001", "new_guest_name": "Otro",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '22023', 'player 1 needs exactly one of player_id or new_guest_name',
  'a player is either existing or new, not both'
);

select throws_ok(
  $$ select public.log_match('chess', '2026-09-23', '[]') $$,
  '22023', 'unknown game "chess"',
  'an unknown game is rejected'
);

-- ---------------------------------------------------------------------------
-- Signed out
-- ---------------------------------------------------------------------------

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.log_match('arnak', '2026-09-24', '[]') $$,
  '42501', null,
  'signed-out visitors can''t log matches'
);

select throws_ok(
  $$ select * from public.list_addable_players() $$,
  '42501', null,
  'signed-out visitors can''t list players'
);

select * from finish();
rollback;
