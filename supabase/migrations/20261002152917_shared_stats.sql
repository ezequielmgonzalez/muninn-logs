-- Comparing friends on the games they played together: the caller's and each
-- friend's stats, counting only matches of this game where the caller and
-- every one of the friends all played. One entry per person, the caller
-- first, then the friends in the order given, in the shape of
-- get_player_stats() without leaders: games, wins, avg_points, avg_place and
-- the average per category.
--
-- security invoker: every match counted includes the caller, so RLS already
-- lets them see it. Only accepted friends can be compared (otherwise 42501).

create function public.get_shared_stats(friend_ids uuid[], game_slug text default 'arnak')
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

revoke execute on function public.get_shared_stats(uuid[], text) from public, anon;
grant execute on function public.get_shared_stats(uuid[], text) to authenticated;
