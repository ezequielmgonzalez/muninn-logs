-- LOTR Duel: its catalog, how a duel is decided (by its result, not points),
-- what log_match() accepts for it, and the draws and victories in the stats.
--
-- Ana is friends with Bob; Jessi is Ana's guest. Ana logs (winner first):
--   d1  Ana (Sauron) beats Bob (Fellowship): middle_earth
--   d2  Bob (Sauron) beats Ana (Fellowship): ring
--   d3  Ana (Sauron) and Jessi (Fellowship): a draw
--   d4  Ana (Fellowship) beats Bob (Sauron): influence
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- A duel's two sides are unique per match (deferred): check it on each statement.
set constraints all immediate;

insert into auth.users (id, email) values
  ('71111111-1111-1111-1111-111111111111', 'ana-lotr@example.com'),
  ('72222222-2222-2222-2222-222222222222', 'bob-lotr@example.com');
update public.profiles set display_name = 'Ana' where id = '71111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Bob' where id = '72222222-2222-2222-2222-222222222222';
update public.players set id = '70000000-0000-0000-0000-000000000001' where user_id = '71111111-1111-1111-1111-111111111111';
update public.players set id = '70000000-0000-0000-0000-000000000002' where user_id = '72222222-2222-2222-2222-222222222222';
insert into public.players (id, owner_id, name)
values ('70000000-0000-0000-0000-00000000000a', '71111111-1111-1111-1111-111111111111', 'Jessi');
insert into public.friendships (requester_id, addressee_id, status, accepted_at)
values ('71111111-1111-1111-1111-111111111111', '72222222-2222-2222-2222-222222222222', 'accepted', now());

-- The matches log_match() creates, by name: a statement can't see rows a function it calls inserts.
create temp table duels (name text primary key, id uuid);
grant all on duels to authenticated;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

select results_eq(
  $$ select min_players, max_players from public.games where slug = 'lotr-duel' $$,
  $$ values (2::smallint, 2::smallint) $$,
  'LOTR Duel is for exactly 2 players'
);

select set_eq(
  $$ select c.slug from public.game_characters c join public.games g on g.id = c.game_id where g.slug = 'lotr-duel' $$,
  array['sauron', 'fellowship'],
  'its two sides are its characters'
);

select is(
  (select count(*)::integer from public.score_categories c join public.games g on g.id = c.game_id where g.slug = 'lotr-duel'),
  0,
  'and it has no points'
);

-- ---------------------------------------------------------------------------
-- Logging duels, as Ana
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "71111111-1111-1111-1111-111111111111", "role": "authenticated"}';

insert into duels
select d.name, public.log_match('lotr-duel', '2026-10-01', d.players, null, d.setup, false)
from (values
  ('d1', '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
           {"player_id": "70000000-0000-0000-0000-000000000002", "character": "fellowship", "scores": {}}]'::jsonb,
         '{"result": "sauron", "victory": "middle_earth"}'::jsonb),
  ('d2', '[{"player_id": "70000000-0000-0000-0000-000000000002", "character": "sauron", "scores": {}},
           {"player_id": "70000000-0000-0000-0000-000000000001", "character": "fellowship", "scores": {}}]',
         '{"result": "sauron", "victory": "ring"}'),
  ('d3', '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
           {"player_id": "70000000-0000-0000-0000-00000000000a", "character": "fellowship", "scores": {}}]',
         '{"result": "draw"}'),
  ('d4', '[{"player_id": "70000000-0000-0000-0000-000000000002", "character": "sauron", "scores": {}},
           {"player_id": "70000000-0000-0000-0000-000000000001", "character": "fellowship", "scores": {}}]',
         '{"result": "fellowship", "victory": "influence"}')
) as d(name, players, setup);

select results_eq(
  $$ select p.name, r.rank, r.is_winner, r.total
     from public.match_results r
     join duels d on d.id = r.match_id
     join (values ('70000000-0000-0000-0000-000000000001'::uuid, 'Ana'), ('70000000-0000-0000-0000-000000000002'::uuid, 'Bob')) as p(id, name)
       on p.id = r.player_id
     where d.name = 'd1'
     order by r.rank $$,
  $$ values ('Ana', 1, true, 0), ('Bob', 2, false, 0) $$,
  'the side the result names wins, with no points at all'
);

select results_eq(
  $$ select r.rank, r.is_winner from public.match_results r join duels d on d.id = r.match_id where d.name = 'd3' $$,
  $$ values (1, false), (1, false) $$,
  'a draw: both first, neither wins'
);

-- What a duel must say.
select throws_ok(
  $$ select public.log_match('lotr-duel', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "character": "fellowship", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-00000000000a", "scores": {}}]',
       null, '{"result": "draw"}', false) $$,
  '22023', null, 'a duel is two players, never three'
);

select throws_ok(
  $$ select public.log_match('lotr-duel', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "scores": {}}]',
       null, '{"result": "draw"}', false) $$,
  '22023', 'every lotr-duel player needs a side', 'each player needs a side'
);

select throws_ok(
  $$ select public.log_match('lotr-duel', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "character": "sauron", "scores": {}}]',
       null, '{"result": "draw"}', false) $$,
  '23505', null, 'and the two sides are different'
);

select throws_ok(
  $$ select public.log_match('lotr-duel', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "character": "fellowship", "scores": {}}]',
       null, '{}', false) $$,
  '22023', 'lotr-duel needs a result: sauron, fellowship or draw', 'a duel needs a result'
);

select throws_ok(
  $$ select public.log_match('lotr-duel', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "character": "fellowship", "scores": {}}]',
       null, '{"result": "fellowship"}', false) $$,
  '22023', null, 'a win needs its victory'
);

select throws_ok(
  $$ select public.log_match('lotr-duel', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "character": "fellowship", "scores": {}}]',
       null, '{"result": "sauron", "victory": "luck"}', false) $$,
  '22023', null, 'one of the four victories'
);

select throws_ok(
  $$ select public.log_match('lotr-duel', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "character": "fellowship", "scores": {}}]',
       null, '{"result": "draw", "victory": "ring"}', false) $$,
  '22023', 'a draw has no victory', 'a draw has no victory'
);

select throws_ok(
  $$ select public.log_match('lotr-duel', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {"points": 3}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "character": "fellowship", "scores": {}}]',
       null, '{"result": "draw"}', false) $$,
  '22023', null, 'a duel has no points to score'
);

select throws_ok(
  $$ select public.log_match('arnak', '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "scores": {"research": 1, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}},
         {"player_id": "70000000-0000-0000-0000-000000000002", "scores": {"research": 0, "temple": 0, "idols": 0, "guardians": 0, "cards": 0, "fear": 0}}]',
       null, '{"result": "draw"}') $$,
  '22023', 'only duels have a result; arnak is decided by points', 'Arnak stays decided by points'
);

-- ---------------------------------------------------------------------------
-- Stats: draws, per side, and by victory
-- ---------------------------------------------------------------------------

create temp table ana_stats as select public.get_player_stats('71111111-1111-1111-1111-111111111111', 'lotr-duel') as s;

select is(
  (select jsonb_build_object('games', s -> 'games', 'wins', s -> 'wins', 'draws', s -> 'draws') from ana_stats),
  '{"games": 4, "wins": 2, "draws": 1}'::jsonb,
  'Ana: 4 duels, 2 won, 1 drawn'
);

select set_eq(
  $$ select l ->> 'slug', (l ->> 'games')::int as games, (l ->> 'wins')::int as wins, (l ->> 'draws')::int as draws
     from ana_stats, jsonb_array_elements(s -> 'leaders') as l $$,
  $$ values ('sauron', 2, 1, 1), ('fellowship', 2, 1, 0) $$,
  'per side: games, wins and draws'
);

select is(
  (select s -> 'victories' from ana_stats),
  '[{"slug": "influence", "wins": 1, "losses": 0},
    {"slug": "middle_earth", "wins": 1, "losses": 0},
    {"slug": "ring", "wins": 0, "losses": 1}]'::jsonb,
  'by victory: how she won and how she lost (a draw is neither)'
);

select is(
  (select s -> 'victories' from (select public.get_player_stats('71111111-1111-1111-1111-111111111111', 'arnak') as s) x),
  '[]'::jsonb,
  'Arnak has no victories'
);

select is(
  (select jsonb_build_object('games', s -> 'games', 'wins', s -> 'wins', 'draws', s -> 'draws')
   from (select public.get_player_stats('72222222-2222-2222-2222-222222222222', 'lotr-duel') as s) x),
  '{"games": 3, "wins": 1, "draws": 0}'::jsonb,
  'her friend Bob: 3 duels, 1 won'
);

select is(
  (select jsonb_build_object('games', s -> 'games', 'wins', s -> 'wins', 'draws', s -> 'draws')
   from (select public.get_guest_stats('70000000-0000-0000-0000-00000000000a', 'lotr-duel') as s) x),
  '{"games": 1, "wins": 0, "draws": 1}'::jsonb,
  'her guest Jessi: 1 duel, drawn'
);

-- ---------------------------------------------------------------------------
-- Editing a duel's result
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select public.update_match((select id from duels where name = 'd3'), '2026-10-01',
       '[{"player_id": "70000000-0000-0000-0000-000000000001", "character": "sauron", "scores": {}},
         {"player_id": "70000000-0000-0000-0000-00000000000a", "character": "fellowship", "scores": {}}]',
       null, '{"result": "fellowship", "victory": "races"}', false) $$,
  'Ana changes the draw into a Fellowship win'
);

select results_eq(
  $$ select r.player_id, r.is_winner from public.match_results r join duels d on d.id = r.match_id
     where d.name = 'd3' order by r.rank $$,
  $$ values ('70000000-0000-0000-0000-00000000000a'::uuid, true), ('70000000-0000-0000-0000-000000000001'::uuid, false) $$,
  'and Jessi, on the Fellowship, wins it'
);

select * from finish();
rollback;
