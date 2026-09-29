-- Deleting your own account without breaking other people's history:
--
--   * Matches you logged: if another account played, the first of them (by
--     turn order) becomes the logger; if only you and guests played, deleted.
--   * Your place in matches that remain becomes an anonymous guest,
--     "Jugador eliminado", owned by that match's logger. Scores stay, so
--     others' winners and stats don't change.
--   * Your guests: passed to the logger of a match they still appear in, or
--     deleted if none.
--   * Then the account: profile, friendships and link requests go with it.
--
-- Both functions are security definer: they touch rows the user can't
-- (other people's matches, auth.users). They only ever act on the caller.

create function public.account_deletion_preview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_player uuid;
  v_result jsonb;
begin
  if v_me is null then
    raise exception 'sign in to delete your account' using errcode = '42501';
  end if;
  select id into v_player from public.players where user_id = v_me;

  with logged as (
    select m.id, exists (
      select 1 from public.match_players mp
      join public.players p on p.id = mp.player_id
      where mp.match_id = m.id and p.user_id is not null and p.user_id <> v_me
    ) as shared
    from public.matches m
    where m.created_by = v_me
  ),
  deleted as (select id from logged where not shared),
  guests as (
    select g.id, exists (
      select 1 from public.match_players mp
      where mp.player_id = g.id and mp.match_id not in (select id from deleted)
    ) as still_played
    from public.players g
    where g.owner_id = v_me
  )
  select jsonb_build_object(
    'matches_deleted', (select count(*) from deleted),
    'matches_transferred', (select count(*) from logged where shared),
    'places_anonymized', (
      select count(*) from public.match_players
      where player_id = v_player and match_id not in (select id from deleted)
    ),
    'guests_transferred', (select count(*) from guests where still_played),
    'guests_deleted', (select count(*) from guests where not still_played)
  ) into v_result;

  return v_result;
end;
$$;

create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := (select auth.uid());
  v_player uuid;
  v_heir uuid;
  v_guest uuid;
  r record;
begin
  if v_me is null then
    raise exception 'sign in to delete your account' using errcode = '42501';
  end if;
  select id into v_player from public.players where user_id = v_me;

  -- 1. Matches you logged: to another account that played, or deleted.
  for r in select id from public.matches where created_by = v_me loop
    v_heir := null;
    select p.user_id into v_heir
    from public.match_players mp
    join public.players p on p.id = mp.player_id
    where mp.match_id = r.id and p.user_id is not null and p.user_id <> v_me
    order by mp.turn_order
    limit 1;

    if v_heir is null then
      delete from public.matches where id = r.id;
    else
      update public.matches set created_by = v_heir where id = r.id;
    end if;
  end loop;

  -- 2. Your place in the matches that remain: one anonymous guest per logger,
  -- owned by them. Scores follow (on update cascade).
  for r in
    select distinct m.created_by
    from public.match_players mp
    join public.matches m on m.id = mp.match_id
    where mp.player_id = v_player
  loop
    insert into public.players (owner_id, name)
    values (r.created_by, 'Jugador eliminado')
    returning id into v_guest;

    update public.match_players mp
    set player_id = v_guest
    from public.matches m
    where m.id = mp.match_id and m.created_by = r.created_by and mp.player_id = v_player;
  end loop;

  -- 3. Your guests: to the logger of their latest remaining match, or deleted.
  for r in select id from public.players where owner_id = v_me loop
    v_heir := null;
    select m.created_by into v_heir
    from public.match_players mp
    join public.matches m on m.id = mp.match_id
    where mp.player_id = r.id
    order by m.played_on desc, m.created_at desc
    limit 1;

    if v_heir is null then
      delete from public.players where id = r.id;
    else
      update public.players set owner_id = v_heir where id = r.id;
    end if;
  end loop;

  -- 4. The account. The profile, friendships and link requests cascade from
  -- auth.users; the player row is unused by now.
  delete from public.players where id = v_player;
  delete from auth.users where id = v_me;
end;
$$;

revoke execute on function public.account_deletion_preview() from public, anon;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.account_deletion_preview() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
