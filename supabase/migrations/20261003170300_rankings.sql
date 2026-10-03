-- Rankings (design/updates/2026-10-rankings-comparar, section 2): how the
-- people you play with do with a leader, on a temple side, at some table sizes.
--
-- get_rankings() runs as the caller, so RLS decides everything it sees:
-- players are you, your accepted friends, your guests and other people's
-- guests you've shared a match with (the players policy), and only matches
-- you can see count (the matches policy), for everyone, friends included.
--
-- A player's numbers come from the matches where THAT player used the
-- leader (any leader without one), on that board side (any without one), at
-- those table sizes (every size without them). A win is finishing first (a
-- shared first place counts, as everywhere else). Players with no such
-- matches don't appear. Sorting and bars are the app's: this returns the rows.

create function public.get_rankings(
  leader_slug text default null,
  board_side text default null,
  include_friends boolean default true,
  include_own_guests boolean default true,
  include_other_guests boolean default true,
  player_counts integer[] default null,
  game_slug text default 'arnak'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_caller uuid := (select auth.uid());
  v_game_id uuid;
  v_leader_id uuid;
  v_result jsonb;
begin
  if v_caller is null then
    raise exception 'sign in to see rankings' using errcode = '42501';
  end if;

  select id into v_game_id from public.games where slug = get_rankings.game_slug;
  if not found then
    raise exception 'unknown game "%"', get_rankings.game_slug using errcode = '22023';
  end if;

  if get_rankings.leader_slug is not null then
    select id into v_leader_id
    from public.game_characters
    where game_id = v_game_id and slug = get_rankings.leader_slug;
    if not found then
      raise exception 'unknown leader "%"', get_rankings.leader_slug using errcode = '22023';
    end if;
  end if;

  with people as (
    -- Who may appear, among the players RLS shows the caller.
    select
      p.id as player_id,
      case
        when p.user_id = v_caller then 'me'
        when p.user_id is not null then 'friend'
        when p.owner_id = v_caller then 'own_guest'
        else 'other_guest'
      end as kind,
      coalesce(profile.display_name, p.name) as name,
      -- Another organizer's guest: whose (null if their profile isn't visible).
      case when p.user_id is null and p.owner_id <> v_caller then owner.display_name end as owner_name
    from public.players p
    left join public.profiles profile on profile.id = p.user_id
    left join public.profiles owner on owner.id = p.owner_id
    where p.user_id = v_caller
      or (get_rankings.include_friends and p.user_id is not null and private.are_friends(v_caller, p.user_id))
      or (get_rankings.include_own_guests and p.user_id is null and p.owner_id = v_caller)
      or (get_rankings.include_other_guests and p.user_id is null and p.owner_id <> v_caller)
  ),
  played as (
    -- Each person's matches under the filters: their own leader, the match's side and size.
    select r.player_id, r.match_id, r.total, r.rank, r.is_winner
    from public.match_results r
    join public.match_players mp using (match_id, player_id)
    join public.matches m on m.id = r.match_id
    where r.player_id in (select player_id from people)
      and m.game_id = v_game_id
      and (v_leader_id is null or mp.character_id = v_leader_id)
      and (get_rankings.board_side is null or m.setup ->> 'board_side' = get_rankings.board_side)
      and (get_rankings.player_counts is null or public.player_count(m) = any(get_rankings.player_counts))
  ),
  totals as (
    select
      player_id,
      count(*) as games,
      count(*) filter (where is_winner) as wins,
      round(avg(total), 2) as avg_points,
      round(avg(rank), 2) as avg_place
    from played
    group by player_id
  )
  select jsonb_build_object(
    'matches', (select count(distinct match_id) from played),
    'players', coalesce(
      (select jsonb_agg(jsonb_build_object(
          'player_id', people.player_id,
          'kind', people.kind,
          'name', people.name,
          'owner_name', people.owner_name,
          'games', totals.games,
          'wins', totals.wins,
          'avg_points', totals.avg_points,
          'avg_place', totals.avg_place
        ) order by people.name)
       from people
       join totals using (player_id)),
      '[]'::jsonb
    )
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.get_rankings(text, text, boolean, boolean, boolean, integer[], text) from public, anon;
grant execute on function public.get_rankings(text, text, boolean, boolean, boolean, integer[], text) to authenticated;
