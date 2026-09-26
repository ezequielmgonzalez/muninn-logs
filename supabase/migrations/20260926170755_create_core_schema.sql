-- Core schema: people, game catalog and matches. See docs/data-model.md.
--
-- RLS is enabled on every table with no policies yet, so nothing is readable
-- or writable through the API until the policies migration lands.

-- Internal functions (triggers, helpers) live outside the API-exposed schemas.
create schema private;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Chosen during onboarding, so it's null right after sign-up.
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null
    check (display_name = btrim(display_name) and char_length(display_name) between 1 and 50),
  created_at timestamptz not null default now()
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id),
  owner_id uuid references public.profiles (id),
  name text check (name = btrim(name) and char_length(name) between 1 and 50),
  created_at timestamptz not null default now(),
  -- Either a user (linked account) or a guest (owned by whoever created it).
  constraint players_user_or_guest check (
    (user_id is not null and owner_id is null and name is null)
    or (user_id is null and owner_id is not null and name is not null)
  )
);

create index players_owner_id_idx on public.players (owner_id);

create type public.friendship_status as enum ('pending', 'accepted');

create table public.friendships (
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  constraint friendships_not_self check (requester_id <> addressee_id),
  constraint friendships_accepted_at check ((status = 'accepted') = (accepted_at is not null))
);

-- One row per pair, whichever direction the request went.
create unique index friendships_pair_key
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_id_idx on public.friendships (addressee_id);

-- ---------------------------------------------------------------------------
-- Game catalog (inserted by migrations/seeds; labels live in the app's messages)
-- ---------------------------------------------------------------------------

create table public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  min_players smallint not null check (min_players >= 1),
  max_players smallint not null,
  constraint games_player_range check (max_players >= min_players)
);

create table public.game_characters (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id),
  slug text not null,
  unique (game_id, slug)
);

create table public.score_categories (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id),
  slug text not null,
  sort_order smallint not null,
  unique (game_id, slug)
);

-- ---------------------------------------------------------------------------
-- Matches
-- ---------------------------------------------------------------------------

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id),
  created_by uuid not null default auth.uid() references public.profiles (id),
  played_on date not null,
  duration_minutes integer check (duration_minutes > 0),
  -- Game-specific setup, validated by the game's Zod schema in the app.
  setup jsonb not null default '{}' check (jsonb_typeof(setup) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matches_created_by_idx on public.matches (created_by);
create index matches_game_id_idx on public.matches (game_id);

create table public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id),
  turn_order smallint not null check (turn_order >= 1),
  -- Null = played without the leaders expansion.
  character_id uuid references public.game_characters (id),
  won_tiebreak boolean not null default false,
  primary key (match_id, player_id),
  -- Deferred so an edit can swap two players' turn order or leader.
  constraint match_players_turn_order_key unique (match_id, turn_order)
    deferrable initially deferred,
  -- A leader can be played by only one player per match. Nulls don't collide.
  constraint match_players_character_key unique (match_id, character_id)
    deferrable initially deferred
);

create index match_players_player_id_idx on public.match_players (player_id);
create unique index match_players_one_tiebreak_winner
  on public.match_players (match_id) where won_tiebreak;

create table public.match_player_scores (
  match_id uuid not null,
  player_id uuid not null,
  category_id uuid not null references public.score_categories (id),
  -- Signed: negative categories (Arnak's fear) are stored negative.
  points integer not null,
  primary key (match_id, player_id, category_id),
  foreign key (match_id, player_id)
    references public.match_players (match_id, player_id) on delete cascade
);

create index match_player_scores_category_id_idx on public.match_player_scores (category_id);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- Characters and score categories must belong to the match's game.
create function private.check_same_game_as_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  match_game_id uuid;
begin
  select game_id into match_game_id from public.matches where id = new.match_id;

  if tg_table_name = 'match_players' then
    if new.character_id is not null and not exists (
      select 1 from public.game_characters
      where id = new.character_id and game_id = match_game_id
    ) then
      raise exception 'character % does not belong to the game of match %',
        new.character_id, new.match_id
        using errcode = 'check_violation';
    end if;
  elsif not exists (
    select 1 from public.score_categories
    where id = new.category_id and game_id = match_game_id
  ) then
    raise exception 'score category % does not belong to the game of match %',
      new.category_id, new.match_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger match_players_same_game
  before insert or update of match_id, character_id on public.match_players
  for each row execute function private.check_same_game_as_match();

create trigger match_player_scores_same_game
  before insert or update of match_id, category_id on public.match_player_scores
  for each row execute function private.check_same_game_as_match();

-- Keeps updated_at current, and stops a match from changing game, which would
-- orphan its characters and score categories.
create function private.before_match_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.game_id <> old.game_id then
    raise exception 'a match cannot change game'
      using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger matches_before_update
  before update on public.matches
  for each row execute function private.before_match_update();

-- Every new account gets a profile and its own player row.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Player'
    ), 50)
  );

  insert into public.players (user_id) values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- Derived results
-- ---------------------------------------------------------------------------

-- Totals and winners are computed, never stored: highest total wins, then
-- won_tiebreak. An unresolved tie for first gives every tied player rank 1.
-- security_invoker makes the view apply the caller's RLS instead of bypassing it.
create view public.match_results
with (security_invoker = true)
as
select
  match_id,
  player_id,
  total,
  rank,
  rank = 1 as is_winner
from (
  select
    mp.match_id,
    mp.player_id,
    coalesce(sum(s.points), 0)::integer as total,
    rank() over (
      partition by mp.match_id
      order by coalesce(sum(s.points), 0) desc, mp.won_tiebreak desc
    )::integer as rank
  from public.match_players mp
  left join public.match_player_scores s using (match_id, player_id)
  group by mp.match_id, mp.player_id, mp.won_tiebreak
) ranked;

-- ---------------------------------------------------------------------------
-- Row Level Security: on everywhere, policies come in the next migration.
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.friendships enable row level security;
alter table public.games enable row level security;
alter table public.game_characters enable row level security;
alter table public.score_categories enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.match_player_scores enable row level security;
