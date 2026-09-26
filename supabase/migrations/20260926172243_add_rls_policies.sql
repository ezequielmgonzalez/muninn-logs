-- Access rules from docs/data-model.md ("Who can see what", "Who can change what").
--
-- Two layers:
--   1. Grants: which tables and columns each role can touch at all. Column
--      grants stop, e.g., an addressee from rewriting who sent a friend request.
--   2. RLS policies: which rows a signed-in user can reach.
--
-- "Visible match" = a match the user created or plays in. "Shared a match with
-- a player" = that player appears in one of the user's visible matches.

-- ---------------------------------------------------------------------------
-- Grants: explicit allow-list. Supabase grants everything to anon and
-- authenticated by default; start from nothing instead.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.profiles, public.players, public.friendships,
  public.games, public.game_characters, public.score_categories,
  public.matches, public.match_players, public.match_player_scores,
  public.match_results
to authenticated;

grant update (username, display_name) on public.profiles to authenticated;

grant insert (owner_id, name), update (name), delete on public.players to authenticated;

grant insert (requester_id, addressee_id), update (status), delete
  on public.friendships to authenticated;

-- created_by isn't insertable: it always defaults to auth.uid().
grant insert (game_id, played_on, duration_minutes, setup),
  update (played_on, duration_minutes, setup), delete
  on public.matches to authenticated;

-- To move a player to another match or swap who played, delete and re-insert.
grant insert (match_id, player_id, turn_order, character_id, won_tiebreak),
  update (turn_order, character_id, won_tiebreak), delete
  on public.match_players to authenticated;

grant insert (match_id, player_id, category_id, points), update (points), delete
  on public.match_player_scores to authenticated;

-- ---------------------------------------------------------------------------
-- Policy helpers
--
-- security definer so they can read tables without triggering those tables'
-- own policies (a match_players policy querying match_players would recurse).
-- They live in the private schema, which the API doesn't expose.
-- ---------------------------------------------------------------------------

create function private.current_player_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.players where user_id = (select auth.uid());
$$;

create function private.are_friends(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships
    where status = 'accepted'
      and least(requester_id, addressee_id) = least(user_a, user_b)
      and greatest(requester_id, addressee_id) = greatest(user_a, user_b)
  );
$$;

create function private.is_match_creator(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.matches
    where id = target_match_id and created_by = (select auth.uid())
  );
$$;

create function private.can_see_match(target_match_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_match_creator(target_match_id)
    or exists (
      select 1 from public.match_players
      where match_id = target_match_id
        and player_id = private.current_player_id()
    );
$$;

create function private.shares_match_with(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.match_players
    where player_id = target_player_id
      and private.can_see_match(match_id)
  );
$$;

-- Who the current user may put in a match they're logging.
create function private.can_add_player(target_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.players p
    where p.id = target_player_id
      and (
        -- Themselves, or a friend.
        p.user_id = (select auth.uid())
        or (p.user_id is not null and private.are_friends((select auth.uid()), p.user_id))
        -- A guest they created, or one they've shared a match with.
        or p.owner_id = (select auth.uid())
        or (p.user_id is null and private.shares_match_with(p.id))
      )
  );
$$;

revoke execute on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function
  private.current_player_id(),
  private.are_friends(uuid, uuid),
  private.is_match_creator(uuid),
  private.can_see_match(uuid),
  private.shares_match_with(uuid),
  private.can_add_player(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create policy "Users see themselves, friends, pending requests and match co-players"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where (f.requester_id = (select auth.uid()) and f.addressee_id = profiles.id)
         or (f.addressee_id = (select auth.uid()) and f.requester_id = profiles.id)
    )
    or exists (
      select 1 from public.players p
      where p.user_id = profiles.id and private.shares_match_with(p.id)
    )
  );

create policy "Users edit their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Players
-- ---------------------------------------------------------------------------

create policy "Users see themselves, their guests, friends and match co-players"
  on public.players for select to authenticated
  using (
    user_id = (select auth.uid())
    or owner_id = (select auth.uid())
    or (user_id is not null and private.are_friends((select auth.uid()), user_id))
    or private.shares_match_with(id)
  );

create policy "Users create guests they own"
  on public.players for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Guest owners rename their guests"
  on public.players for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- A guest who appears in any match can't be deleted (foreign key).
create policy "Guest owners delete their guests"
  on public.players for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Friendships
-- ---------------------------------------------------------------------------

create policy "Users see their own friendships and requests"
  on public.friendships for select to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "Users send friend requests"
  on public.friendships for insert to authenticated
  with check (requester_id = (select auth.uid()) and status = 'pending');

create policy "Addressees accept pending requests"
  on public.friendships for update to authenticated
  using (addressee_id = (select auth.uid()) and status = 'pending')
  with check (addressee_id = (select auth.uid()) and status = 'accepted');

create policy "Either user declines, cancels or unfriends"
  on public.friendships for delete to authenticated
  using ((select auth.uid()) in (requester_id, addressee_id));

-- The server sets accepted_at, so clients can't backdate it.
create function private.before_friendship_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    new.accepted_at := now();
  end if;
  return new;
end;
$$;

create trigger friendships_before_update
  before update on public.friendships
  for each row execute function private.before_friendship_update();

-- ---------------------------------------------------------------------------
-- Game catalog: read-only
-- ---------------------------------------------------------------------------

create policy "Signed-in users read games"
  on public.games for select to authenticated using (true);

create policy "Signed-in users read game characters"
  on public.game_characters for select to authenticated using (true);

create policy "Signed-in users read score categories"
  on public.score_categories for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Matches: visible to creator and participants, changed only by the creator
-- ---------------------------------------------------------------------------

create policy "Creators and participants see matches"
  on public.matches for select to authenticated
  using (created_by = (select auth.uid()) or private.can_see_match(id));

create policy "Users log matches as themselves"
  on public.matches for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy "Creators edit their matches"
  on public.matches for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create policy "Creators delete their matches"
  on public.matches for delete to authenticated
  using (created_by = (select auth.uid()));

create policy "Creators and participants see match players"
  on public.match_players for select to authenticated
  using (private.can_see_match(match_id));

create policy "Creators add players they're allowed to add"
  on public.match_players for insert to authenticated
  with check (private.is_match_creator(match_id) and private.can_add_player(player_id));

create policy "Creators edit match players"
  on public.match_players for update to authenticated
  using (private.is_match_creator(match_id))
  with check (private.is_match_creator(match_id));

create policy "Creators remove match players"
  on public.match_players for delete to authenticated
  using (private.is_match_creator(match_id));

create policy "Creators and participants see scores"
  on public.match_player_scores for select to authenticated
  using (private.can_see_match(match_id));

create policy "Creators add scores"
  on public.match_player_scores for insert to authenticated
  with check (private.is_match_creator(match_id));

create policy "Creators edit scores"
  on public.match_player_scores for update to authenticated
  using (private.is_match_creator(match_id))
  with check (private.is_match_creator(match_id));

create policy "Creators delete scores"
  on public.match_player_scores for delete to authenticated
  using (private.is_match_creator(match_id));

-- ---------------------------------------------------------------------------
-- Finding people: exact username only, never a list
-- ---------------------------------------------------------------------------

create function public.find_profile_by_username(search_username text)
returns table (id uuid, username text, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name
  from public.profiles p
  where p.username = lower(btrim(search_username))
    and (select auth.uid()) is not null;
$$;

revoke execute on function public.find_profile_by_username(text) from public, anon;
grant execute on function public.find_profile_by_username(text) to authenticated;
