-- Turning a guest record into someone's account ("claiming"): the guest's
-- matches move to the user's player and the guest disappears. One-way.
--
--   * A guest's owner asks an accepted friend "are you this guest?" (a row in
--     guest_claims); the friend accepts or declines. Nobody gets matches
--     attached without saying yes.
--   * An admin links any guest to any account directly.
--
-- Admins carry role "admin" in their app_metadata, which users can't edit.
-- Grant it per project in the SQL editor:
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
--   where email = '<email>';
-- It reaches the session on the next sign-in or token refresh.

create function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'role' = 'admin', false);
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Link requests
-- ---------------------------------------------------------------------------

create table public.guest_claims (
  id uuid primary key default gen_random_uuid(),
  -- One pending request per guest; it goes away with the guest.
  guest_id uuid not null unique references public.players (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index guest_claims_user_id_idx on public.guest_claims (user_id);

alter table public.guest_claims enable row level security;

grant select, insert (guest_id, user_id), delete on public.guest_claims to authenticated;

create policy "Requesters and recipients see link requests"
  on public.guest_claims for select to authenticated
  using ((select auth.uid()) in (requested_by, user_id));

-- Only for your own guest, and only to an accepted friend: the same trust as
-- adding someone to a match.
create policy "Guest owners ask a friend"
  on public.guest_claims for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and exists (
      select 1 from public.players p
      where p.id = guest_id and p.owner_id = (select auth.uid()) and p.user_id is null
    )
    and private.are_friends((select auth.uid()), user_id)
  );

create policy "Requesters cancel, recipients decline"
  on public.guest_claims for delete to authenticated
  using ((select auth.uid()) in (requested_by, user_id));

-- ---------------------------------------------------------------------------
-- The merge
-- ---------------------------------------------------------------------------

-- Scores follow their match_players row when its player changes, so a merge
-- is a single update instead of copying rows around.
alter table public.match_player_scores
  drop constraint match_player_scores_match_id_player_id_fkey,
  add constraint match_player_scores_match_id_player_id_fkey
    foreign key (match_id, player_id)
    references public.match_players (match_id, player_id)
    on delete cascade on update cascade;

-- Moves every match row of a guest to a user's player, keeping turn order,
-- leader, scores and tiebreak, then deletes the guest (and any pending
-- request for it). Refuses when both already appear in the same match.
-- Internal: only the functions below call it, after checking permissions.
create function private.merge_guest_into_user(target_guest_id uuid, target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_player_id uuid;
  v_moved integer;
begin
  perform 1 from public.players where id = target_guest_id and user_id is null;
  if not found then
    raise exception 'guest not found' using errcode = '22023';
  end if;

  select id into v_player_id from public.players where user_id = target_user_id;
  if not found then
    raise exception 'user not found' using errcode = '22023';
  end if;

  select count(*) into v_moved
  from public.match_players guest
  join public.match_players them
    on them.match_id = guest.match_id and them.player_id = v_player_id
  where guest.player_id = target_guest_id;
  if v_moved > 0 then
    raise exception 'the guest and the user are both in % match(es)', v_moved
      using errcode = '23505';
  end if;

  -- The guest's rows become the user's; scores follow through their foreign
  -- key (on update cascade, below). Turn order, leader and tiebreak stay.
  update public.match_players
  set player_id = v_player_id
  where player_id = target_guest_id;
  get diagnostics v_moved = row_count;

  delete from public.players where id = target_guest_id;
  return v_moved;
end;
$$;

revoke execute on function private.merge_guest_into_user(uuid, uuid) from public;

-- ---------------------------------------------------------------------------
-- What users and admins call
-- ---------------------------------------------------------------------------

-- The recipient says "yes, that's me". Returns how many matches moved.
create function public.accept_guest_claim(claim_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_claim public.guest_claims;
begin
  select * into v_claim from public.guest_claims
  where id = accept_guest_claim.claim_id and user_id = (select auth.uid());
  if not found then
    raise exception 'link request not found' using errcode = '42501';
  end if;
  return private.merge_guest_into_user(v_claim.guest_id, v_claim.user_id);
end;
$$;

-- Requests the caller received, with what they'd bring: the guest's name,
-- who asked, and how many matches (which the caller can't see yet).
create function public.list_received_guest_claims()
returns table (id uuid, guest_name text, requested_by_name text, matches integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, g.name, requester.display_name,
    (select count(*)::integer from public.match_players mp where mp.player_id = c.guest_id)
  from public.guest_claims c
  join public.players g on g.id = c.guest_id
  join public.profiles requester on requester.id = c.requested_by
  where c.user_id = (select auth.uid())
  order by c.created_at;
$$;

-- Admin: link any guest to any account, no confirmation.
create function public.admin_link_guest(guest_id uuid, user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can link guests directly' using errcode = '42501';
  end if;
  return private.merge_guest_into_user(admin_link_guest.guest_id, admin_link_guest.user_id);
end;
$$;

-- Admin: every guest, with who created it and how many matches it's in.
create function public.admin_list_guests()
returns table (id uuid, name text, owner_name text, matches integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can list every guest' using errcode = '42501';
  end if;
  return query
    select g.id, g.name, owner.display_name,
      (select count(*)::integer from public.match_players mp where mp.player_id = g.id)
    from public.players g
    join public.profiles owner on owner.id = g.owner_id
    where g.user_id is null
    order by g.name, owner.display_name;
end;
$$;

revoke execute on function public.accept_guest_claim(uuid) from public, anon;
revoke execute on function public.list_received_guest_claims() from public, anon;
revoke execute on function public.admin_link_guest(uuid, uuid) from public, anon;
revoke execute on function public.admin_list_guests() from public, anon;
grant execute on function public.accept_guest_claim(uuid) to authenticated;
grant execute on function public.list_received_guest_claims() to authenticated;
grant execute on function public.admin_link_guest(uuid, uuid) to authenticated;
grant execute on function public.admin_list_guests() to authenticated;
