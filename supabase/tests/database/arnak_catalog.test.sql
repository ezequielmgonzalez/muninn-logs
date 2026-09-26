-- The Arnak catalog seeded by migration. Slugs must match src/games/arnak.ts.
begin;
create extension if not exists pgtap with schema extensions;

select plan(3);

select results_eq(
  $$ select min_players, max_players from public.games where slug = 'arnak' $$,
  $$ values (2::smallint, 4::smallint) $$,
  'Arnak is seeded for 2–4 players'
);

select set_eq(
  $$ select c.slug from public.game_characters c
     join public.games g on g.id = c.game_id where g.slug = 'arnak' $$,
  array['captain', 'falconer', 'baroness', 'professor', 'explorer', 'mystic', 'mechanic', 'journalist'],
  'Arnak has the 8 leaders from both expansions'
);

select results_eq(
  $$ select s.slug from public.score_categories s
     join public.games g on g.id = s.game_id where g.slug = 'arnak'
     order by s.sort_order $$,
  array['research', 'temple', 'idols', 'guardians', 'cards', 'fear'],
  'Arnak has its 6 scoring categories in score sheet order'
);

select * from finish();
rollback;
