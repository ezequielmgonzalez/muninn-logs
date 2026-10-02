-- update_match(): only the creator can replace a match's details, players
-- and scores, all at once. Cast: Ana and Bob are friends; Ana logs the match.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

set constraints all immediate;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com');

update public.profiles set display_name = 'Ana' where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Bob' where id = '22222222-2222-2222-2222-222222222222';
update public.players set id = 'f0000000-0000-0000-0000-000000000001' where user_id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000002' where user_id = '22222222-2222-2222-2222-222222222222';

insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', now());

insert into public.players (id, owner_id, name)
values ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Jessi');

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

-- The match as first logged: Ana 20, Jessi 10, played 2026-09-01.
select public.log_match('arnak', '2026-09-01', $json$[
  {"player_id": "f0000000-0000-0000-0000-000000000001",
   "scores": {"research": 20, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
  {"player_id": "b0000000-0000-0000-0000-000000000001",
   "scores": {"research": 10, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
]$json$);

create temporary table the_match as select id from public.matches where played_on = '2026-09-01';
grant select on the_match to authenticated;

-- Ana corrects it: another date, Bob joins and goes first, Jessi is replaced
-- by a new guest, and the scores change.
select lives_ok(
  $$ select public.update_match(
       match_id => (select id from the_match),
       played_on => '2026-09-02',
       duration_minutes => 80,
       setup => '{"board_side": "bird"}',
       players => $json$[
         {"player_id": "f0000000-0000-0000-0000-000000000002", "character": "captain",
          "scores": {"research": 5, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
         {"player_id": "f0000000-0000-0000-0000-000000000001", "character": "mystic",
          "scores": {"research": 30, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": -2}},
         {"new_guest_name": "Nuevo",
          "scores": {"research": 1, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
       ]$json$) $$,
  'Ana edits a match she logged'
);

select results_eq(
  $$ select played_on, duration_minutes, setup ->> 'board_side' from public.matches
     where id = (select id from the_match) $$,
  $$ values ('2026-09-02'::date, 80, 'bird') $$,
  'the match details are replaced'
);

select results_eq(
  $$ select coalesce(pr.display_name, p.name), c.slug
     from public.match_players mp
     join public.players p on p.id = mp.player_id
     left join public.profiles pr on pr.id = p.user_id
     left join public.game_characters c on c.id = mp.character_id
     where mp.match_id = (select id from the_match)
     order by mp.turn_order $$,
  $$ values ('Bob', 'captain'), ('Ana', 'mystic'), ('Nuevo', null) $$,
  'the players are replaced, in their new turn order'
);

select is(
  (select count(*)::integer from public.match_player_scores where match_id = (select id from the_match)),
  18,
  'only the new players'' scores remain'
);

select results_eq(
  $$ select coalesce(pr.display_name, p.name), r.total, r.is_winner
     from public.match_results r
     join public.players p on p.id = r.player_id
     left join public.profiles pr on pr.id = p.user_id
     where r.match_id = (select id from the_match)
     order by r.rank $$,
  $$ values ('Ana', 28, true), ('Bob', 5, false), ('Nuevo', 1, false) $$,
  'results reflect the new scores'
);

select ok(
  exists (select 1 from public.players where name = 'Jessi'),
  'a guest removed from the match stays in the owner''s roster'
);

select throws_ok(
  $$ select public.update_match((select id from the_match), '2026-09-03', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '22023', 'arnak needs 2 to 4 players',
  'an edit is validated like a new match'
);

select throws_ok(
  $$ select public.update_match('00000000-0000-4000-8000-000000000000', '2026-09-03', '[]') $$,
  '42501', 'match not found, or not logged by you',
  'an unknown match can''t be edited'
);

-- The turn order turns out to be unknown, then known again.
select public.update_match((select id from the_match), '2026-09-02', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001",
        "scores": {"research": 5, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 6, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$, turn_order_known => false);

select results_eq(
  $$ select turn_order from public.match_players where match_id = (select id from the_match) $$,
  $$ values (null::smallint), (null::smallint) $$,
  'an edit can mark the turn order unknown'
);

select public.update_match((select id from the_match), '2026-09-02', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000001",
        "scores": {"research": 5, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 6, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$);

select results_eq(
  $$ select turn_order from public.match_players where match_id = (select id from the_match) order by turn_order $$,
  $$ values (1::smallint), (2::smallint) $$,
  'and known again: the list''s order is the turn order'
);

-- Bob played in the match but didn't log it.
set local request.jwt.claims = '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

select throws_ok(
  $$ select public.update_match((select id from the_match), '2020-01-01', $json$[
       {"player_id": "f0000000-0000-0000-0000-000000000002",
        "scores": {"research": 99, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
       {"player_id": "f0000000-0000-0000-0000-000000000001",
        "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}
     ]$json$) $$,
  '42501', 'match not found, or not logged by you',
  'Bob played in the match but can''t edit it: only its creator can'
);

set local role anon;
set local request.jwt.claims = '{"role": "anon"}';

select throws_ok(
  $$ select public.update_match('00000000-0000-4000-8000-000000000000', '2026-09-03', '[]') $$,
  '42501', null,
  'signed-out visitors can''t edit matches'
);

select * from finish();
rollback;
