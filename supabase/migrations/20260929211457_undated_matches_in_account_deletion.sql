-- Matches can be undated now, and Postgres sorts nulls first in descending
-- order: a deleted account's guest would go to the logger of an undated match
-- rather than of their latest dated one. Same function, with nulls last.

create or replace function public.delete_my_account()
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
    order by m.played_on desc nulls last, m.created_at desc
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
