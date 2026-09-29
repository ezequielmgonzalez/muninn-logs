-- A user's stats for one game, for their profile and for comparing with
-- friends. See docs/data-model.md ("Friends' stats without exposing their
-- matches").
--
-- security definer, because a friend's stats aggregate matches the caller
-- can't see. So the gate comes first: only the user themselves or an
-- accepted friend gets an answer, and the answer is aggregates only, never
-- the matches behind them.

create function public.get_player_stats(target_user_id uuid, game_slug text default 'arnak')
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
  research as (
    select s.match_id, s.points
    from public.match_player_scores s
    join public.score_categories c on c.id = s.category_id
    where s.player_id = v_player_id and c.slug = 'research'
  ),
  by_leader as (
    select
      gc.slug,
      count(*) as games,
      count(*) filter (where p.is_winner) as wins,
      round(avg(p.rank), 2) as avg_place,
      round(avg(p.total), 2) as avg_points,
      round(avg(research.points), 2) as avg_research
    from played p
    join public.game_characters gc on gc.id = p.character_id
    left join research using (match_id)
    group by gc.slug
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
          'slug', slug, 'games', games, 'wins', wins, 'avg_place', avg_place,
          'avg_points', avg_points, 'avg_research', avg_research
        ) order by games desc, slug)
       from by_leader),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_player_stats(uuid, text) from public, anon;
grant execute on function public.get_player_stats(uuid, text) to authenticated;
