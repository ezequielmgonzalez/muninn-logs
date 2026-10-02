-- Guests' stats: a guest's Estadísticas, for their owner and anyone who shared
-- a match with them (no friendship: a guest has no account), counting only
-- the matches the viewer can see (docs/data-model.md, "Access rules").
--
-- The calculation moves into private.player_stats(), shared by
-- get_player_stats() (yours and your friends', unchanged) and the new
-- get_guest_stats().

create function private.player_stats(
  target_player_id uuid,
  game_id uuid,
  player_count integer,
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
      mp.character_id
    from public.match_results r
    join public.match_players mp using (match_id, player_id)
    join public.matches m on m.id = r.match_id
    where r.player_id = player_stats.target_player_id and m.game_id = player_stats.game_id
      -- Only matches of that many players, when asked.
      and (player_stats.player_count is null or public.player_count(m) = player_stats.player_count)
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
  );
$$;

revoke execute on function private.player_stats(uuid, uuid, integer, boolean) from public, anon, authenticated;

-- Same signature and rules as before: yourself, or an accepted friend.
create or replace function public.get_player_stats(target_user_id uuid, game_slug text default 'arnak', player_count integer default null)
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
  return private.player_stats(v_player_id, v_game_id, get_player_stats.player_count, false);
end;
$$;

create function public.get_guest_stats(guest_id uuid, game_slug text default 'arnak', player_count integer default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_game_id uuid;
begin
  if v_caller is null or not exists (
    select 1 from public.players p
    where p.id = get_guest_stats.guest_id
      and p.user_id is null
      and (p.owner_id = v_caller or private.shares_match_with(p.id))
  ) then
    raise exception 'a guest''s stats are only visible to their owner and players who shared a match with them'
      using errcode = '42501';
  end if;

  select id into v_game_id from public.games where slug = get_guest_stats.game_slug;
  if not found then
    raise exception 'unknown game "%"', get_guest_stats.game_slug using errcode = '22023';
  end if;

  -- Only the matches the caller can see: their own, or ones they played.
  return private.player_stats(get_guest_stats.guest_id, v_game_id, get_guest_stats.player_count, true);
end;
$$;

revoke execute on function public.get_guest_stats(uuid, text, integer) from public, anon;
grant execute on function public.get_guest_stats(uuid, text, integer) to authenticated;
