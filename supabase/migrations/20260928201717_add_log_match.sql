-- Logging a match: who the current user may add to one, and saving a match
-- with its players and scores in a single transaction. See docs/data-model.md.
--
-- Both functions are security invoker: they run as the caller, so the grants
-- and RLS policies from add_rls_policies decide what's allowed. They add
-- orchestration and validation, never extra privileges.

-- ---------------------------------------------------------------------------
-- Who can be added
-- ---------------------------------------------------------------------------

-- Differs from who the user can *see*: a non-friend met in a shared match is
-- visible but can't be added. Ordered: the user, then friends, then guests.
create function public.list_addable_players()
returns table (
  id uuid,
  name text,
  is_guest boolean,
  is_me boolean,
  -- Who created the guest, when the caller can see them (e.g. "Jessi (Ana)").
  owner_name text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    p.id,
    coalesce(person.display_name, p.name) as name,
    p.user_id is null as is_guest,
    coalesce(p.user_id = (select auth.uid()), false) as is_me,
    owner.display_name as owner_name
  from public.players p
  left join public.profiles person on person.id = p.user_id
  left join public.profiles owner on owner.id = p.owner_id
  where private.can_add_player(p.id)
  order by is_me desc, is_guest, name;
$$;

-- ---------------------------------------------------------------------------
-- Saving a match
-- ---------------------------------------------------------------------------

-- `players` is a JSON array in turn order. Each element:
--   { "player_id": uuid }            an existing player, or
--   { "new_guest_name": text }       a guest created now, owned by the caller
--   + "character": slug | null       leader; null = played without the expansion
--   + "won_tiebreak": boolean        optional, see match_results
--   + "scores": { "<category slug>": integer, ... }  every category of the game
-- Returns the new match id. Any error rolls everything back, new guests included.
create function public.log_match(
  game_slug text,
  played_on date,
  players jsonb,
  duration_minutes integer default null,
  setup jsonb default '{}'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_game public.games;
  v_match_id uuid;
  v_player_id uuid;
  v_character_id uuid;
  v_player record;
begin
  if (select auth.uid()) is null then
    raise exception 'sign in to log a match' using errcode = '42501';
  end if;

  select * into v_game from public.games where slug = log_match.game_slug;
  if not found then
    raise exception 'unknown game "%"', log_match.game_slug using errcode = '22023';
  end if;

  if jsonb_typeof(log_match.players) is distinct from 'array'
    or jsonb_array_length(log_match.players) not between v_game.min_players and v_game.max_players
  then
    raise exception '% needs % to % players', v_game.slug, v_game.min_players, v_game.max_players
      using errcode = '22023';
  end if;

  insert into public.matches (game_id, played_on, duration_minutes, setup)
  values (v_game.id, log_match.played_on, log_match.duration_minutes, coalesce(log_match.setup, '{}'))
  returning id into v_match_id;

  for v_player in
    select value as data, ordinality::smallint as turn_order
    from jsonb_array_elements(log_match.players) with ordinality
  loop
    -- Who: an existing player or a new guest, never both.
    if (v_player.data ? 'player_id') = (v_player.data ? 'new_guest_name') then
      raise exception 'player % needs exactly one of player_id or new_guest_name', v_player.turn_order
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
      v_match_id,
      v_player_id,
      v_player.turn_order,
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
      raise exception 'player % needs a score for every % category', v_player.turn_order, v_game.slug
        using errcode = '22023';
    end if;

    insert into public.match_player_scores (match_id, player_id, category_id, points)
    select v_match_id, v_player_id, c.id, (v_player.data -> 'scores' ->> c.slug)::integer
    from public.score_categories c
    where c.game_id = v_game.id;
  end loop;

  return v_match_id;
end;
$$;

revoke execute on function public.list_addable_players() from public, anon;
revoke execute on function public.log_match(text, date, jsonb, integer, jsonb) from public, anon;
grant execute on function public.list_addable_players() to authenticated;
grant execute on function public.log_match(text, date, jsonb, integer, jsonb) to authenticated;
