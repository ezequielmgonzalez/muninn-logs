-- The Lord of the Rings: Duel for Middle-earth ("LOTR Duel"), a second game.
--
-- Two players, one per side: Sauron or the Fellowship (its characters; the
-- app shows them like Arnak's leaders). No points: a game is won by one of
-- three victories (middle_earth: supremacy over Middle-earth, ring: the
-- Ring's race, races: the support of the races) or, when none happened, by
-- having more influence over Middle-earth at the end (influence); otherwise
-- it's a draw. The match's setup records it:
--   {"result": "sauron" | "fellowship" | "draw", "victory": "middle_earth" | "ring" | "races" | "influence"}
-- (a draw has no victory). Keep in sync with src/games/lotr-duel.ts.
--
-- No new tables or columns:
-- - match_results reads a duel's result in place of points: the winning side
--   is rank 1 and the winner, the other rank 2; in a draw both are rank 1 and
--   neither wins.
-- - save_match_players() checks a duel's sides and result (and that no other
--   game has one).
-- - private.player_stats() adds draws (overall and per side) and the wins and
--   losses by victory, so get_player_stats() and get_guest_stats() tell them.

insert into public.games (slug, min_players, max_players)
values ('lotr-duel', 2, 2);

insert into public.game_characters (game_id, slug)
select g.id, side
from public.games g, unnest(array['sauron', 'fellowship']) as side
where g.slug = 'lotr-duel';

-- Same columns, in the same order: points decide, unless the match has a result.
create or replace view public.match_results
with (security_invoker = true)
as
select
  match_id,
  player_id,
  total,
  rank,
  case when result is null then rank = 1 else side is not distinct from result end as is_winner
from (
  select
    mp.match_id,
    mp.player_id,
    coalesce(sum(s.points), 0)::integer as total,
    (case
      when m.setup ? 'result' then case when m.setup ->> 'result' in ('draw', gc.slug) then 1 else 2 end
      else rank() over (
        partition by mp.match_id
        order by coalesce(sum(s.points), 0) desc, mp.won_tiebreak desc
      )
    end)::integer as rank,
    m.setup ->> 'result' as result,
    gc.slug as side
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  left join public.game_characters gc on gc.id = mp.character_id
  left join public.match_player_scores s using (match_id, player_id)
  group by mp.match_id, mp.player_id, mp.won_tiebreak, m.setup, gc.slug
) ranked;

-- Unchanged but for the duel's checks at the end.
create or replace function private.save_match_players(match_id uuid, players jsonb, turn_order_known boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_game public.games;
  v_player_id uuid;
  v_character_id uuid;
  v_player record;
  v_setup jsonb;
begin
  if save_match_players.turn_order_known is null then
    raise exception 'turn_order_known must be true or false' using errcode = '22023';
  end if;

  select g.* into v_game
  from public.games g
  join public.matches m on m.game_id = g.id
  where m.id = save_match_players.match_id;

  if jsonb_typeof(save_match_players.players) is distinct from 'array'
    or jsonb_array_length(save_match_players.players) not between v_game.min_players and v_game.max_players
  then
    raise exception '% needs % to % players', v_game.slug, v_game.min_players, v_game.max_players
      using errcode = '22023';
  end if;

  for v_player in
    select value as data, ordinality::smallint as position
    from jsonb_array_elements(save_match_players.players) with ordinality
  loop
    -- Who: an existing player or a new guest, never both.
    if (v_player.data ? 'player_id') = (v_player.data ? 'new_guest_name') then
      raise exception 'player % needs exactly one of player_id or new_guest_name', v_player.position
        using errcode = '22023';
    end if;

    if v_player.data ? 'new_guest_name' then
      insert into public.players (owner_id, name)
      values ((select auth.uid()), btrim(v_player.data ->> 'new_guest_name'))
      returning id into v_player_id;
    else
      v_player_id := (v_player.data ->> 'player_id')::uuid;
    end if;

    -- Leader, by slug.
    v_character_id := null;
    if nullif(v_player.data ->> 'character', '') is not null then
      select id into v_character_id
      from public.game_characters
      where game_id = v_game.id and slug = v_player.data ->> 'character';
      if not found then
        raise exception 'unknown character "%" for %', v_player.data ->> 'character', v_game.slug
          using errcode = '22023';
      end if;
    end if;

    -- RLS checks here that the caller may add this player.
    insert into public.match_players (match_id, player_id, turn_order, character_id, won_tiebreak)
    values (
      save_match_players.match_id,
      v_player_id,
      -- Unknown order: every player's turn is null, never a made-up one.
      case when save_match_players.turn_order_known then v_player.position end,
      v_character_id,
      coalesce((v_player.data ->> 'won_tiebreak')::boolean, false)
    );

    -- Scores: exactly the game's categories, no more, no fewer.
    if jsonb_typeof(v_player.data -> 'scores') is distinct from 'object'
      or (select count(*) from jsonb_object_keys(v_player.data -> 'scores'))
         <> (select count(*) from public.score_categories where game_id = v_game.id)
      or exists (
        select 1
        from jsonb_object_keys(v_player.data -> 'scores') as key
        where not exists (
          select 1 from public.score_categories
          where game_id = v_game.id and slug = key
        )
      )
    then
      raise exception 'player % needs a score for every % category', v_player.position, v_game.slug
        using errcode = '22023';
    end if;

    insert into public.match_player_scores (match_id, player_id, category_id, points)
    select save_match_players.match_id, v_player_id, c.id, (v_player.data -> 'scores' ->> c.slug)::integer
    from public.score_categories c
    where c.game_id = v_game.id;
  end loop;

  -- A duel is decided by its result, not by points: each player takes a side,
  -- and the result names the side that won and how (or a draw). Only duels
  -- have a result: match_results reads it in place of the points.
  select m.setup into v_setup from public.matches m where m.id = save_match_players.match_id;
  if v_game.slug = 'lotr-duel' then
    if exists (
      select 1 from public.match_players mp
      where mp.match_id = save_match_players.match_id and mp.character_id is null
    ) then
      raise exception 'every % player needs a side', v_game.slug using errcode = '22023';
    end if;
    if v_setup ->> 'result' = 'draw' then
      if v_setup ? 'victory' then
        raise exception 'a draw has no victory' using errcode = '22023';
      end if;
    elsif v_setup ->> 'result' in ('sauron', 'fellowship') then
      if coalesce(v_setup ->> 'victory', '') not in ('middle_earth', 'ring', 'races', 'influence') then
        raise exception 'a % win needs its victory: middle_earth, ring, races or influence', v_setup ->> 'result'
          using errcode = '22023';
      end if;
    else
      raise exception '% needs a result: sauron, fellowship or draw', v_game.slug using errcode = '22023';
    end if;
  elsif v_setup ? 'result' then
    raise exception 'only duels have a result; % is decided by points', v_game.slug using errcode = '22023';
  end if;
end;
$$;

revoke execute on function private.save_match_players(uuid, jsonb, boolean) from public;
grant execute on function private.save_match_players(uuid, jsonb, boolean) to authenticated;

-- Unchanged but for draws and victories.
create or replace function private.player_stats(
  target_player_id uuid,
  game_id uuid,
  player_counts integer[],
  only_visible boolean
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with played as (
    -- Every match of this game the player played in, with their result.
    select
      r.match_id,
      r.total,
      r.rank,
      r.is_winner,
      mp.character_id,
      -- Duels: a draw, and how the game was won (null for games decided by points).
      coalesce(m.setup ->> 'result' = 'draw', false) as is_draw,
      m.setup ->> 'victory' as victory
    from public.match_results r
    join public.match_players mp using (match_id, player_id)
    join public.matches m on m.id = r.match_id
    where r.player_id = player_stats.target_player_id and m.game_id = player_stats.game_id
      -- Only matches of those table sizes, when asked.
      and (player_stats.player_counts is null or public.player_count(m) = any(player_stats.player_counts))
      -- And, when asked, only those the caller can see themselves.
      and (not player_stats.only_visible or private.can_see_match(r.match_id))
  ),
  category_averages as (
    select c.slug, c.sort_order, round(avg(s.points), 2) as average
    from public.score_categories c
    left join public.match_player_scores s
      on s.category_id = c.id
      and s.player_id = player_stats.target_player_id
      and s.match_id in (select match_id from played)
    where c.game_id = player_stats.game_id
    group by c.slug, c.sort_order
  ),
  scores as (
    -- Each of the player's scores in those matches, by category.
    select s.match_id, c.slug, c.sort_order, s.points
    from public.match_player_scores s
    join public.score_categories c on c.id = s.category_id
    where s.player_id = player_stats.target_player_id and s.match_id in (select match_id from played)
  ),
  by_leader as (
    -- Per leader, and once more for the matches played without one.
    select
      p.character_id,
      gc.slug,
      count(*) as games,
      count(*) filter (where p.is_winner) as wins,
      count(*) filter (where p.is_draw) as draws,
      round(avg(p.rank), 2) as avg_place,
      round(avg(p.total), 2) as avg_total,
      min(p.total) as min_total,
      max(p.total) as max_total
    from played p
    left join public.game_characters gc on gc.id = p.character_id
    group by p.character_id, gc.slug
  ),
  leader_categories as (
    select p.character_id, s.slug, s.sort_order,
      round(avg(s.points), 2) as average, min(s.points) as min, max(s.points) as max
    from played p
    join scores s using (match_id)
    group by p.character_id, s.slug, s.sort_order
  ),
  by_victory as (
    -- Duels: the player's wins and losses by how the game was won.
    select victory, count(*) filter (where is_winner) as wins, count(*) filter (where not is_winner) as losses
    from played
    where victory is not null
    group by victory
  )
  select jsonb_build_object(
    'games', (select count(*) from played),
    'wins', (select count(*) filter (where is_winner) from played),
    'draws', (select count(*) filter (where is_draw) from played),
    'avg_points', (select round(avg(total), 2) from played),
    'avg_place', (select round(avg(rank), 2) from played),
    'categories', coalesce(
      (select jsonb_agg(jsonb_build_object('slug', slug, 'average', average) order by sort_order)
       from category_averages),
      '[]'::jsonb
    ),
    'leaders', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'slug', bl.slug,
          'games', bl.games,
          'wins', bl.wins,
          'draws', bl.draws,
          'avg_place', bl.avg_place,
          'total', jsonb_build_object('average', bl.avg_total, 'min', bl.min_total, 'max', bl.max_total),
          'categories', (
            select jsonb_agg(jsonb_build_object('slug', lc.slug, 'average', lc.average, 'min', lc.min, 'max', lc.max)
              order by lc.sort_order)
            from leader_categories lc
            where lc.character_id is not distinct from bl.character_id
          )
        ) order by bl.games desc, bl.slug nulls last)
       from by_leader bl),
      '[]'::jsonb
    ),
    'victories', coalesce(
      (select jsonb_agg(jsonb_build_object('slug', victory, 'wins', wins, 'losses', losses) order by victory)
       from by_victory),
      '[]'::jsonb
    )
  );
$$;

revoke execute on function private.player_stats(uuid, uuid, integer[], boolean) from public, anon, authenticated;
