-- Filtering stats and lists by the number of players: 2, 3 or 4 (Arnak's
-- formats), or all of them.
--
-- public.player_count(matches) is a computed field: how many players a match
-- had. The app's match lists filter on it (PostgREST lets a function of a
-- table's row be selected and filtered like a column), and the stats
-- functions use it. It counts under the caller's RLS, which shows a match's
-- players whenever it shows the match.
--
-- get_player_stats() and get_shared_stats() take a new last argument,
-- player_count (default null: every match). A new argument changes the
-- signature, so both are dropped and recreated, with the same gates and grants.

create function public.player_count(public.matches)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*)::integer from public.match_players where match_id = $1.id
$$;

revoke execute on function public.player_count(public.matches) from public, anon;
grant execute on function public.player_count(public.matches) to authenticated;

drop function public.get_player_stats(uuid, text);
drop function public.get_shared_stats(uuid[], text);

create function public.get_player_stats(target_user_id uuid, game_slug text default 'arnak', player_count integer default null)
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
      -- Only matches of that many players, when asked.
      and (get_player_stats.player_count is null or public.player_count(m) = get_player_stats.player_count)
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

revoke execute on function public.get_player_stats(uuid, text, integer) from public, anon;
grant execute on function public.get_player_stats(uuid, text, integer) to authenticated;

create function public.get_shared_stats(friend_ids uuid[], game_slug text default 'arnak', player_count integer default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_game_id uuid;
  v_users uuid[];
  v_result jsonb;
begin
  if v_caller is null then
    raise exception 'sign in to compare' using errcode = '42501';
  end if;
  if get_shared_stats.friend_ids is null or cardinality(get_shared_stats.friend_ids) = 0 then
    raise exception 'pick at least one friend' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(get_shared_stats.friend_ids) as f(user_id)
    where f.user_id = v_caller or not private.are_friends(v_caller, f.user_id)
  ) then
    raise exception 'you can only compare with your friends' using errcode = '42501';
  end if;

  select id into v_game_id from public.games where slug = get_shared_stats.game_slug;
  if not found then
    raise exception 'unknown game "%"', get_shared_stats.game_slug using errcode = '22023';
  end if;

  v_users := array[v_caller] || get_shared_stats.friend_ids;

  with people as (
    select u.ord, p.id as player_id
    from unnest(v_users) with ordinality as u(user_id, ord)
    join public.players p on p.user_id = u.user_id
  ),
  shared as (
    -- Matches of this game with every one of them in it.
    select mp.match_id
    from public.match_players mp
    join people on people.player_id = mp.player_id
    join public.matches m on m.id = mp.match_id
    where m.game_id = v_game_id
      and (get_shared_stats.player_count is null or public.player_count(m) = get_shared_stats.player_count)
    group by mp.match_id
    having count(distinct people.player_id) = cardinality(v_users)
  ),
  results as (
    select people.ord, r.total, r.rank, r.is_winner
    from public.match_results r
    join people on people.player_id = r.player_id
    where r.match_id in (select match_id from shared)
  ),
  category_averages as (
    select people.ord, c.slug, c.sort_order, round(avg(s.points), 2) as average
    from people
    cross join public.score_categories c
    left join public.match_player_scores s
      on s.category_id = c.id
      and s.player_id = people.player_id
      and s.match_id in (select match_id from shared)
    where c.game_id = v_game_id
    group by people.ord, c.slug, c.sort_order
  )
  select jsonb_agg(jsonb_build_object(
      'games', (select count(*) from results r where r.ord = people.ord),
      'wins', (select count(*) filter (where r.is_winner) from results r where r.ord = people.ord),
      'avg_points', (select round(avg(r.total), 2) from results r where r.ord = people.ord),
      'avg_place', (select round(avg(r.rank), 2) from results r where r.ord = people.ord),
      'categories', (
        select jsonb_agg(jsonb_build_object('slug', ca.slug, 'average', ca.average) order by ca.sort_order)
        from category_averages ca
        where ca.ord = people.ord
      )
    ) order by people.ord)
  from people
  into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_shared_stats(uuid[], text, integer) from public, anon;
grant execute on function public.get_shared_stats(uuid[], text, integer) to authenticated;
