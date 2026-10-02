-- Turn order becomes optional. Games copied from old score pads rarely say
-- who went first, and listing their rows in some order would invent one. A
-- match's turn order is either known for every player or for none: then every
-- match_players.turn_order is null. Stats by turn order must only count
-- matches where it's known.
--
-- log_match(), update_match() and their shared helper take a new last
-- argument, turn_order_known (default true, the old behavior); adding an
-- argument changes a function's signature, so they're dropped and recreated.
-- import_matches() passes each game's "turn_order_known" through.

alter table public.match_players alter column turn_order drop not null;

drop function public.log_match(text, date, jsonb, integer, jsonb);
drop function public.update_match(uuid, date, jsonb, integer, jsonb);
drop function private.save_match_players(uuid, jsonb);

-- Inserts a match's players with their leaders and scores. `players` has the
-- shape documented on log_match(); its order is the turn order when known.
create function private.save_match_players(match_id uuid, players jsonb, turn_order_known boolean)
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
end;
$$;

revoke execute on function private.save_match_players(uuid, jsonb, boolean) from public;
grant execute on function private.save_match_players(uuid, jsonb, boolean) to authenticated;

create function public.log_match(
  game_slug text,
  played_on date,
  players jsonb,
  duration_minutes integer default null,
  setup jsonb default '{}',
  turn_order_known boolean default true
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

  perform private.save_match_players(v_match_id, log_match.players, log_match.turn_order_known);
  return v_match_id;
end;
$$;

revoke execute on function public.log_match(text, date, jsonb, integer, jsonb, boolean) from public, anon;
grant execute on function public.log_match(text, date, jsonb, integer, jsonb, boolean) to authenticated;

-- Replaces a match's details, players and scores in one transaction. Only its
-- creator can: for anyone else, RLS makes the match look like it isn't there.
create function public.update_match(
  match_id uuid,
  played_on date,
  players jsonb,
  duration_minutes integer default null,
  setup jsonb default '{}',
  turn_order_known boolean default true
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
  perform private.save_match_players(update_match.match_id, update_match.players, update_match.turn_order_known);
  return update_match.match_id;
end;
$$;

revoke execute on function public.update_match(uuid, date, jsonb, integer, jsonb, boolean) from public, anon;
grant execute on function public.update_match(uuid, date, jsonb, integer, jsonb, boolean) to authenticated;

-- Each game may say "turn_order_known": false (its rows' order isn't the turns').
create or replace function public.import_matches(games jsonb)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_guests jsonb := '{}';
  v_name text;
  v_guest_id uuid;
  v_game record;
  v_players jsonb;
begin
  if not private.is_admin() then
    raise exception 'only admins can import matches' using errcode = '42501';
  end if;
  if jsonb_typeof(import_matches.games) is distinct from 'array' then
    raise exception 'games must be an array' using errcode = '22023';
  end if;

  -- One guest per distinct name, spelled as it first appears.
  for v_name in
    select distinct on (lower(btrim(p ->> 'new_guest_name'))) btrim(p ->> 'new_guest_name')
    from jsonb_array_elements(import_matches.games) with ordinality as g(game, game_no),
      jsonb_array_elements(g.game -> 'players') with ordinality as ps(p, turn)
    where p ? 'new_guest_name'
    order by lower(btrim(p ->> 'new_guest_name')), g.game_no, ps.turn
  loop
    insert into public.players (owner_id, name)
    values ((select auth.uid()), v_name)
    returning id into v_guest_id;
    v_guests := v_guests || jsonb_build_object(lower(v_name), v_guest_id);
  end loop;

  for v_game in
    select value as data, ordinality as game_no
    from jsonb_array_elements(import_matches.games) with ordinality
  loop
    -- The same players, in the same order, with new guests by their id.
    select jsonb_agg(
      case when p ? 'new_guest_name'
        then (p - 'new_guest_name') || jsonb_build_object('player_id', v_guests -> lower(btrim(p ->> 'new_guest_name')))
        else p
      end
      order by turn
    )
    into v_players
    from jsonb_array_elements(v_game.data -> 'players') with ordinality as ps(p, turn);

    begin
      perform public.log_match(
        v_game.data ->> 'game_slug',
        (v_game.data ->> 'played_on')::date,
        v_players,
        (v_game.data ->> 'duration_minutes')::integer,
        coalesce(v_game.data -> 'setup', '{}'),
        coalesce((v_game.data ->> 'turn_order_known')::boolean, true)
      );
    exception when others then
      raise exception 'game %: %', v_game.game_no, sqlerrm using errcode = sqlstate;
    end;
  end loop;

  return jsonb_array_length(import_matches.games);
end;
$$;

