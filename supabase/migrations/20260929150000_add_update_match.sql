-- Editing a match. The players-and-scores part of log_match() moves into a
-- shared helper, so creating and editing a match validate exactly the same
-- way. Everything stays security invoker: RLS decides who may edit (only the
-- creator) and who may be added.

-- Inserts a match's players in turn order, with their leaders and scores.
-- `players` has the shape documented on log_match().
create function private.save_match_players(match_id uuid, players jsonb)
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
begin
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
    select value as data, ordinality::smallint as turn_order
    from jsonb_array_elements(save_match_players.players) with ordinality
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
      save_match_players.match_id,
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
    select save_match_players.match_id, v_player_id, c.id, (v_player.data -> 'scores' ->> c.slug)::integer
    from public.score_categories c
    where c.game_id = v_game.id;
  end loop;
end;
$$;

revoke execute on function private.save_match_players(uuid, jsonb) from public;
grant execute on function private.save_match_players(uuid, jsonb) to authenticated;

-- Same signature and behavior as before; the per-player work is now shared.
create or replace function public.log_match(
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
  v_game_id uuid;
  v_match_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'sign in to log a match' using errcode = '42501';
  end if;

  select id into v_game_id from public.games where slug = log_match.game_slug;
  if not found then
    raise exception 'unknown game "%"', log_match.game_slug using errcode = '22023';
  end if;

  insert into public.matches (game_id, played_on, duration_minutes, setup)
  values (v_game_id, log_match.played_on, log_match.duration_minutes, coalesce(log_match.setup, '{}'))
  returning id into v_match_id;

  perform private.save_match_players(v_match_id, log_match.players);
  return v_match_id;
end;
$$;

-- Replaces a match's details, players and scores in one transaction. Only its
-- creator can: for anyone else, RLS makes the match look like it isn't there.
create function public.update_match(
  match_id uuid,
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
begin
  if (select auth.uid()) is null then
    raise exception 'sign in to edit a match' using errcode = '42501';
  end if;

  update public.matches
  set played_on = update_match.played_on,
      duration_minutes = update_match.duration_minutes,
      setup = coalesce(update_match.setup, '{}')
  where id = update_match.match_id;
  if not found then
    raise exception 'match not found, or not logged by you' using errcode = '42501';
  end if;

  -- Scores go with their players (on delete cascade). New guests from the
  -- previous version stay in the owner's roster, like any other guest.
  delete from public.match_players where match_players.match_id = update_match.match_id;
  perform private.save_match_players(update_match.match_id, update_match.players);
  return update_match.match_id;
end;
$$;

revoke execute on function public.update_match(uuid, date, jsonb, integer, jsonb) from public, anon;
grant execute on function public.update_match(uuid, date, jsonb, integer, jsonb) to authenticated;
