-- Lost Ruins of Arnak catalog: the game, its leaders and its scoring categories.
--
-- Catalog rows live in migrations, not seed.sql, because every environment
-- (production included) needs them. Only slugs are stored; display names are
-- in the app's messages (Games.arnak.*). Keep these lists in sync with
-- src/games/arnak.ts.

with arnak as (
  -- Solo mode is out of scope, so 2–4 players.
  insert into public.games (slug, min_players, max_players)
  values ('arnak', 2, 4)
  returning id
),
leaders as (
  insert into public.game_characters (game_id, slug)
  select arnak.id, leader
  from arnak,
    unnest(array[
      -- Expedition Leaders
      'captain', 'falconer', 'baroness', 'professor', 'explorer', 'mystic',
      -- The Missing Expedition
      'mechanic', 'journalist'
    ]) as leader
)
insert into public.score_categories (game_id, slug, sort_order)
select arnak.id, category.slug, category.sort_order
from arnak,
  -- Idols include points for empty idol slots; fear is stored negative.
  unnest(array['research', 'temple', 'idols', 'guardians', 'cards', 'fear'])
    with ordinality as category(slug, sort_order);
