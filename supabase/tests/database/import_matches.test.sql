-- import_matches(): an admin loads many past matches at once.
--
-- Ana is an admin and friends with Bob; Carla is nobody's friend. Guest names
-- are unique to this test, since e2e runs may have left other guests around.
begin;
create extension if not exists pgtap with schema extensions;

select plan(10);

set constraints all immediate;

insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'ana@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com'),
  ('33333333-3333-3333-3333-333333333333', 'carla@example.com');
update public.players set id = 'f0000000-0000-0000-0000-000000000001' where user_id = '11111111-1111-1111-1111-111111111111';
update public.players set id = 'f0000000-0000-0000-0000-000000000002' where user_id = '22222222-2222-2222-2222-222222222222';
update public.players set id = 'f0000000-0000-0000-0000-000000000003' where user_id = '33333333-3333-3333-3333-333333333333';

insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted', now());

-- Every category at 0 but research, to keep the fixtures short.
create function pg_temp.scores(research integer) returns jsonb language sql as $$
  select jsonb_build_object('research', research, 'temple', 0, 'idols', 0, 'guardians', 0, 'cards', 0, 'fear', 0)
$$;

-- Two games: "Imp Jessi" plays both (spelled differently), "Imp Toto" one.
create temporary table two_games as
select jsonb_build_array(
  jsonb_build_object(
    'game_slug', 'arnak', 'played_on', '2025-03-01', 'setup', '{"board_side": "snake"}'::jsonb,
    'players', jsonb_build_array(
      jsonb_build_object('player_id', 'f0000000-0000-0000-0000-000000000001', 'character', 'mystic', 'scores', pg_temp.scores(30)),
      jsonb_build_object('player_id', 'f0000000-0000-0000-0000-000000000002', 'character', null, 'scores', pg_temp.scores(20)),
      jsonb_build_object('new_guest_name', 'Imp Jessi', 'character', null, 'scores', pg_temp.scores(10))
    )
  ),
  jsonb_build_object(
    'game_slug', 'arnak', 'played_on', null,
    'players', jsonb_build_array(
      jsonb_build_object('new_guest_name', ' imp jessi ', 'character', null, 'scores', pg_temp.scores(5), 'won_tiebreak', true),
      jsonb_build_object('new_guest_name', 'Imp Toto', 'character', null, 'scores', pg_temp.scores(5)),
      jsonb_build_object('player_id', 'f0000000-0000-0000-0000-000000000001', 'character', null, 'scores', pg_temp.scores(1))
    )
  )
) as games;
grant select on two_games to authenticated;

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Only admins
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

select throws_ok(
  $$ select public.import_matches((select games from two_games)) $$,
  '42501', 'only admins can import matches',
  'without the admin role, there''s no import'
);

-- ---------------------------------------------------------------------------
-- Importing
-- ---------------------------------------------------------------------------

set local request.jwt.claims = '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated", "app_metadata": {"role": "admin"}}';

-- Stored first, checked in the next statements (which see its inserts).
create temporary table imported as
select public.import_matches((select games from two_games)) as count;

select is((select count from imported), 2, 'an admin imports two matches at once');

select results_eq(
  $$ select name, owner_id from public.players where name ilike 'imp %' order by name $$,
  $$ values ('Imp Jessi', '11111111-1111-1111-1111-111111111111'::uuid),
            ('Imp Toto', '11111111-1111-1111-1111-111111111111'::uuid) $$,
  'each new guest is created once for the whole import, owned by the admin'
);

select is(
  (select count(*)::integer from public.match_players mp
   join public.players p on p.id = mp.player_id where p.name = 'Imp Jessi'),
  2,
  'and plays in every game that names them, however it''s spelled'
);

select results_eq(
  $$ select m.played_on, m.setup ->> 'board_side', c.slug
     from public.matches m
     join public.match_players mp on mp.match_id = m.id and mp.player_id = 'f0000000-0000-0000-0000-000000000001'
     left join public.game_characters c on c.id = mp.character_id
     where m.id in (select match_id from public.match_players where player_id in (select id from public.players where name ilike 'imp %'))
     order by m.played_on nulls last $$,
  $$ values ('2025-03-01'::date, 'snake', 'mystic'), (null::date, null::text, null::text) $$,
  'dates (or none), board sides and leaders are kept'
);

select results_eq(
  $$ select coalesce(p.name, 'Ana'), mp.turn_order, r.total, r.is_winner
     from public.match_results r
     join public.match_players mp using (match_id, player_id)
     join public.players p on p.id = r.player_id
     where r.match_id = (select mp2.match_id from public.match_players mp2
                         join public.players p2 on p2.id = mp2.player_id where p2.name = 'Imp Toto')
     order by mp.turn_order $$,
  $$ values ('Imp Jessi', 1::smallint, 5, true), ('Imp Toto', 2::smallint, 5, false), ('Ana', 3::smallint, 1, false) $$,
  'turn order, totals and tiebreak wins are kept'
);

-- ---------------------------------------------------------------------------
-- All or nothing
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select public.import_matches(jsonb_build_array(
       (select games -> 0 from two_games),
       jsonb_build_object('game_slug', 'arnak', 'played_on', null, 'players', jsonb_build_array(
         jsonb_build_object('new_guest_name', 'Imp Solo', 'character', null, 'scores', pg_temp.scores(1)))))) $$,
  '22023', 'game 2: arnak needs 2 to 4 players',
  'an invalid game fails the import, naming which one'
);

select is(
  (select count(*)::integer from public.players where name ilike 'imp %'),
  2,
  'and nothing from it is saved: no new guests…'
);

select is(
  (select count(*)::integer from public.match_players where player_id = 'f0000000-0000-0000-0000-000000000002'),
  1,
  '…and no new matches'
);

select throws_ok(
  $$ select public.import_matches(jsonb_build_array(jsonb_build_object(
       'game_slug', 'arnak', 'played_on', null, 'players', jsonb_build_array(
         jsonb_build_object('player_id', 'f0000000-0000-0000-0000-000000000001', 'character', null, 'scores', pg_temp.scores(1)),
         jsonb_build_object('player_id', 'f0000000-0000-0000-0000-000000000003', 'character', null, 'scores', pg_temp.scores(2)))))) $$,
  '42501', null,
  'admins still only add who they could add by hand: Carla isn''t Ana''s friend'
);

select * from finish();
rollback;
