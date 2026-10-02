# Data model

How Muninn Logs stores people, games and matches, and who can see or change what. Product context lives in [vision.md](vision.md); this document is the technical contract the migrations and RLS policies implement.

## Principles

- **Generic inside, game-specific outside.** Tables work for any game. Each game is catalog data (rows identified by slugs) plus a Zod schema and translated labels in the app.
- **Store facts, derive results.** Scores are stored; totals, ranks and winners are computed. Editing a score can never leave a stale winner behind.
- **Private by default.** A match is visible only to the users who played it and the user who logged it.

## Tables

### People

**`profiles`**: one per account, created automatically when a user signs up.

| Column         | Type        | Notes                                      |
| -------------- | ----------- | ------------------------------------------ |
| `id`           | uuid, PK    | = `auth.users.id`                          |
| `username`     | text        | Unique, lowercase. Used to find friends    |
| `display_name` | text        |                                            |
| `created_at`   | timestamptz |                                            |

**`friendships`**: one row per pair of users.

| Column         | Type        | Notes                             |
| -------------- | ----------- | --------------------------------- |
| `requester_id` | uuid        | → `profiles`                      |
| `addressee_id` | uuid        | → `profiles`                      |
| `status`       | enum        | `pending` \| `accepted`           |
| `created_at`   | timestamptz |                                   |
| `accepted_at`  | timestamptz | Null while pending                |

- `requester_id <> addressee_id`.
- Unique on the unordered pair (`least(a, b)`, `greatest(a, b)`), so A→B and B→A can't both exist.
- Declining or unfriending deletes the row.

**`players`**: anyone who can appear in a match. Users and guests share this table.

| Column       | Type        | Notes                                              |
| ------------ | ----------- | -------------------------------------------------- |
| `id`         | uuid, PK    |                                                    |
| `user_id`    | uuid        | Unique → `profiles`. Null for guests               |
| `owner_id`   | uuid        | → `profiles`, the guest's creator. Null for users  |
| `name`       | text        | Guests only. Users show their profile's name       |
| `created_at` | timestamptz |                                                    |

- Check: a row is either a user (`user_id` set, `owner_id` and `name` null) or a guest (`user_id` null, `owner_id` and `name` set).
- Every profile gets its player row automatically on sign-up.
- **Why one table:** match rows reference a single `player_id`, and stats queries are identical for users and guests. Claiming a guest (see "Claiming a guest") moves the guest's `match_players` rows to the user's player and deletes the guest.

### Game catalog

Catalog rows are inserted by migrations/seeds, never by users. They store slugs only; display names live in the translation files (`es.json`: `research` → "Investigación").

**`games`**: `id`, `slug` (unique, e.g. `arnak`), `min_players`, `max_players`.

**`game_characters`**: `id`, `game_id`, `slug`. Unique (`game_id`, `slug`). For Arnak, the leaders (`falconeer`, …).

**`score_categories`**: `id`, `game_id`, `slug`, `sort_order`. Unique (`game_id`, `slug`). For Arnak: `research`, `temple`, `idols`, `guardians`, `cards`, `fear`, to be checked against the official score sheet before seeding.

### Matches

**`matches`**

| Column             | Type        | Notes                                                 |
| ------------------ | ----------- | ----------------------------------------------------- |
| `id`               | uuid, PK    |                                                       |
| `game_id`          | uuid        | → `games`                                             |
| `created_by`       | uuid        | → `profiles`. Doesn't have to be a participant        |
| `played_on`        | date        | Required                                              |
| `duration_minutes` | integer     | Optional, > 0                                         |
| `setup`            | jsonb       | Game-specific setup, validated by the game's Zod schema. Arnak: `{"board_side": "bird" \| "snake" \| "waterfall" \| "tree" \| "monkey" \| "lizard"}` (optional; `ARNAK_BOARD_SIDES` in `src/games/arnak.ts`) |
| `created_at`       | timestamptz |                                                       |
| `updated_at`       | timestamptz |                                                       |

**`match_players`**

| Column         | Type     | Notes                                                        |
| -------------- | -------- | ------------------------------------------------------------ |
| `match_id`     | uuid     | → `matches`, cascade delete. PK with `player_id`             |
| `player_id`    | uuid     | → `players`                                                  |
| `turn_order`   | smallint | 1..N, unique per match; or null for every player when the match's turn order is unknown (e.g. copied from an old score pad). Stats by turn order must only count matches where it's known |
| `character_id` | uuid     | → `game_characters`. **Optional**: null = played without the leaders expansion |
| `won_tiebreak` | boolean  | Default false. See [Winner](#winner)                         |

- Unique (`match_id`, `character_id`): a leader can be played by only one player per match. Nulls don't collide, so any number of players can have no leader.
- At most one `won_tiebreak = true` per match (partial unique index).
- The character must belong to the match's game (enforced in the database).

**`match_player_scores`**: one row per player per category.

| Column        | Type    | Notes                                              |
| ------------- | ------- | -------------------------------------------------- |
| `match_id`    | uuid    | PK with `player_id`, `category_id`. → `match_players` |
| `player_id`   | uuid    |                                                    |
| `category_id` | uuid    | → `score_categories`, of the match's game          |
| `points`      | integer | Signed: fear is stored negative, so total = sum    |

**Why rows instead of a jsonb column:** "average per category" and comparisons are plain `GROUP BY`s, and foreign keys guarantee every category exists.

### Winner

Totals and the winner are never stored. A view computes them per player per match:

```sql
total  = sum(points)
rank   = rank() over (partition by match_id order by total desc, won_tiebreak desc)
winner = rank = 1
```

- Highest total wins.
- If several players tie for first, the form asks who won the tiebreak (for Arnak: furthest on the research track) and sets `won_tiebreak` on that player.
- If a first-place tie is left unresolved, every tied player has rank 1: a shared win.
- `won_tiebreak` only matters among players tied for first; on anyone else it has no effect on the ranking.

The view must be created with `security_invoker = true`, so it applies the RLS of the person querying it instead of bypassing it.

## Who can see what

Enforced with grants and Row Level Security in `supabase/migrations/*_add_rls_policies.sql`, tested in `supabase/tests/database/rls.test.sql`.

A user's **visible matches** are the ones they logged or played in. **Shared a match with a player** means that player appears in one of the user's visible matches, so it includes matches the user logged without playing.

| Data                     | Visible to                                                                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| A match and its players and scores | Its creator and every participant with an account                                     |
| A user's name            | Themselves, their friends, and anyone who shared a match with them                            |
| A user's stats           | Themselves and their accepted friends, as **aggregates only** (see below)                     |
| A guest and their stats  | Its owner and anyone who shared a match with that guest; stats count only those shared matches |
| Friendships              | The two users involved                                                                        |

**Friends' stats without exposing their matches.** Matches stay private even from friends, but comparing yourself with a friend needs their overall numbers. `get_player_stats(user_id, game_slug)` (`security definer`) first checks that the caller is that user or an accepted friend (otherwise 42501), then returns aggregates only: games, wins (a shared first place counts), average points and place, the average per score category, and per leader (with one more entry, `slug` null, for matches played without a leader) its games, wins and average place plus the average, lowest and highest total and per category. Match rows themselves stay behind RLS.

**Finding people.** There is no public user list. A friend request starts from an exact username lookup: `find_profile_by_username()` returns at most one profile, ignoring case and surrounding spaces, and only to signed-in users.

## Who can change what

| Action                                   | Allowed for                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Create, edit, delete a match (and its players/scores) | Only its creator                                                                  |
| Add a user to a match                    | The match creator, if the user is themselves or an accepted friend                             |
| Add a guest to a match                   | The match creator, if they own the guest or have shared a match with it                        |
| Create, rename a guest                   | Only its owner                                                                                |
| Delete a guest                           | Only its owner, and only if the guest isn't in any match                                      |
| Send a friend request                    | Any user, to someone found by username                                                        |
| Accept a friend request                  | The addressee                                                                                 |
| Decline, cancel, unfriend                | Either user (deletes the row). Existing matches are unaffected                               |

## Saving a match

A match, its players and their scores are saved by one database function, `log_match()`, in a single transaction: a failure never leaves a half-saved match or an orphan guest. It runs as the caller (`security invoker`), so the grants and RLS policies above still decide who may be added; the function only adds validation:

- The game's player count (`min_players`..`max_players`), which spans rows and so can't be a table constraint.
- Each player is an existing player or a new guest (created on the spot, owned by the caller), never both.
- Leaders by slug, from the match's game.
- A score for exactly every category of the game.

`list_addable_players()` returns who the caller may add, which is narrower than who they can see: a non-friend met in a shared match is visible, but not addable.

## Importing matches

Admins can load many past matches at once from a CSV (`/admin/import`), e.g. games transcribed from old score pads. The file is parsed in the browser (`src/features/import/`), one row per player per game, with Spanish or English headers and `,` or `;`. Every problem is listed by row or by game before anything is saved, and each name in the file is matched to an addable player or becomes a new guest.

`import_matches(games)` saves them in one transaction: each element has `log_match()`'s arguments, and a new guest's name creates one guest for the whole import (compared case-insensitively), not one per game. It's `security invoker` like `log_match()`, so RLS still decides who may be added; it only adds the admin check. Any error rolls back every match and guest, naming the game that failed.

## Claiming a guest

When a guest turns out to be someone with an account, their record can become that account ("Jessi" becomes @jessi): the guest's match rows move to the user's player, scores and all, and the guest disappears. One-way. Two ways in:

- **Between friends:** a guest's owner asks an accepted friend "are you this guest?" (`guest_claims`), and only that friend can accept (`accept_guest_claim()`) or decline. Same trust as adding someone to a match: nobody gets matches attached without saying yes.
- **Admins** link any guest to any account directly (`admin_link_guest()`), and can list every guest (`admin_list_guests()`).

A link is refused when the guest and the user already appear in the same match (the same person recorded twice), naming how many.

**Admins** carry role `admin` in `auth.users.raw_app_meta_data`, which users can't edit. It's granted by hand in each project's SQL editor, never in code or migrations (the repo is public):

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'
where email = '<email>';
```

It reaches the session on the next sign-in or token refresh.

## Out of scope for now

- What happens to matches when a user deletes their account.
- Letting a participant dispute or leave a match someone else logged. Requiring friendship to add a user is the MVP safeguard.
