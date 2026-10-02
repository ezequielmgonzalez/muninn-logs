-- Richer stats per leader, for ranking leaders by any number and for each
-- leader's own page: games, wins and average place as before, plus the
-- average, lowest and highest total and the same for every category. Matches
-- played without a leader get their own entry, with slug null.
--
-- Same signature and the same gate (only the player and their friends); the
-- leaders' avg_points and avg_research are replaced by total.average and the
-- research entry of categories.

create or replace function public.get_player_stats(target_user_id uuid, game_slug text default 'arnak')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_game_id uuid;
  v_player_id uuid;
  v_result jsonb;
begin
  if v_caller is null
    or (target_user_id <> v_caller and not private.are_friends(v_caller, target_user_id))
  then
    raise exception 'stats are only visible to the player and their friends'
      using errcode = '42501';
  end if;

  select id into v_game_id from public.games where slug = get_player_stats.game_slug;
  if not found then
    raise exception 'unknown game "%"', get_player_stats.game_slug using errcode = '22023';
  end if;

  select id into v_player_id from public.players where user_id = target_user_id;

  with played as (
    -- Every match of this game the player played in, with their result.
    select
      r.match_id,
      r.total,
      r.rank,
      r.is_winner,
      mp.character_id
    from public.match_results r
    join public.match_players mp using (match_id, player_id)
    join public.matches m on m.id = r.match_id
    where r.player_id = v_player_id and m.game_id = v_game_id
  ),
  category_averages as (
    select c.slug, c.sort_order, round(avg(s.points), 2) as average
    from public.score_categories c
    left join public.match_player_scores s
      on s.category_id = c.id
      and s.player_id = v_player_id
      and s.match_id in (select match_id from played)
    where c.game_id = v_game_id
    group by c.slug, c.sort_order
  ),
  scores as (
    -- Each of the player's scores in those matches, by category.
    select s.match_id, c.slug, c.sort_order, s.points
    from public.match_player_scores s
    join public.score_categories c on c.id = s.category_id
    where s.player_id = v_player_id and s.match_id in (select match_id from played)
  ),
  by_leader as (
    -- Per leader, and once more for the matches played without one.
    select
      p.character_id,
      gc.slug,
      count(*) as games,
      count(*) filter (where p.is_winner) as wins,
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
  )
  select jsonb_build_object(
    'games', (select count(*) from played),
    'wins', (select count(*) filter (where is_winner) from played),
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
    )
  ) into v_result;

  return v_result;
end;
$$;

