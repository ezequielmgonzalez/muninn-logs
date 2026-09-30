-- Importing many past matches at once (an admin's CSV of old score pads).
--
-- `games` is a JSON array; each element has log_match()'s arguments:
--   { "game_slug", "played_on" (or null), "duration_minutes", "setup", "players" }
-- A new guest's name ("new_guest_name") creates one guest for the whole import,
-- matched case-insensitively: "Jessi" in ten games is one guest, not ten.
-- Returns how many matches were created. All or nothing: any error rolls back
-- every match and guest, and names the game (1-based) that failed.
--
-- Security invoker, like log_match(): RLS still decides who may be added. It
-- only adds the admin check, so nobody else can bulk-insert matches.
create function public.import_matches(games jsonb)
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
        coalesce(v_game.data -> 'setup', '{}')
      );
    exception when others then
      raise exception 'game %: %', v_game.game_no, sqlerrm using errcode = sqlstate;
    end;
  end loop;

  return jsonb_array_length(import_matches.games);
end;
$$;

revoke execute on function public.import_matches(jsonb) from public, anon;
grant execute on function public.import_matches(jsonb) to authenticated;
