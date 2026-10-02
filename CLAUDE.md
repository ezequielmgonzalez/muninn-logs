@AGENTS.md

# Muninn Logs

Board game play logger with per-game stats, starting with Lost Ruins of Arnak. Product: [docs/vision.md](docs/vision.md) (Spanish). Data model and access rules: [docs/data-model.md](docs/data-model.md). Keep both in sync when a decision changes.

Stack: Next.js 16 (App Router, `src/`), TypeScript, Tailwind v4 + shadcn/ui (Radix), Supabase (Postgres, Auth, RLS), next-intl, Zod, Vitest, Playwright, pgTAP. pnpm, Node 24 (`nvm use`).

## Commands

```bash
pnpm dev                 # needs .env.local (see .env.example) and `pnpm supabase start`
pnpm lint && pnpm typecheck && pnpm test   # typecheck runs `next typegen` first
pnpm test:e2e            # Playwright; needs `pnpm supabase start`
pnpm test:db             # pgTAP in supabase/tests/database/
pnpm supabase db reset   # rebuild local DB from migrations
pnpm db:types            # regenerate src/lib/supabase/database.types.ts (commit it; CI checks)
```

## Workflow

- Never push to `main` (branch protection). Branch as `<type>/<short-name>`, open a PR with `gh`, squash-merge only after the user approves.
- Commit messages and PR titles follow Conventional Commits (commitlint enforces; the PR title becomes the squash commit on `main`).
- Do not add `Co-Authored-By` trailers or "Generated with Claude Code" footers. Commits are attributed to the user only.
- Pre-commit runs lint + unit tests. Required checks: lint/typecheck/unit/build, e2e, database tests, commit messages.

## Code conventions

- Code, identifiers and database names in English. All user-facing text goes through next-intl (`src/i18n/messages/{es,en}.json`); never hardcode strings. `es.json` is the source of truth for types; Spanish uses voseo ("Elegí", "Ingresá").
- Use `Link`, `redirect`, `useRouter` from `@/i18n/navigation`, not `next/*`. Write `return redirect(...)`: TypeScript doesn't narrow next-intl's `never` otherwise.
- Feature code lives in `src/features/<feature>/` (actions, forms, schemas, tests). `src/components/ui/` is shadcn-generated only. Game catalogs mirror the DB in `src/games/<game>.ts`.
- Server Actions validate with Zod (schemas mirror DB check constraints) and return error *codes* that forms translate. Error states echo the submitted values back: React 19 resets form fields after an action, and forms use them as `defaultValue`.
- Supabase: `@/lib/supabase/server` in Server Components/Actions/Route Handlers, `@/lib/supabase/client` in Client Components. Use `getClaims()` (verifies the JWT), not `getSession()`. `getCurrentProfile()` in `@/lib/auth` for the signed-in profile.
- Next 16: middleware is `src/proxy.ts` (Supabase session refresh, then next-intl). The root layout reads the locale with `next/root-params`.

## Design

v3, "cuaderno de campo": surfaces are paper inside a notebook, every accent is a dry-brush stroke of ink. Read `design/HANDOFF.md` (the restyle plan, one PR per step) → `design/README.md` (the brand book) → `design/components/*.md` before building UI; `design/screens/*.html` are the mockups to open in a browser. One light theme; there is no dark theme, so don't add `dark:` styles.

- Colors are Tailwind classes from `design/tokens.css`: `bg-paper`, `bg-ink`, `text-ink-body`, `text-ink-muted`, `text-band-text(-muted)`, `bronze`, `gold`, `chart-1`…`chart-8` (one per leader; which is which is in `design/tokens.json`), `player-you`, `player-2…5`. shadcn's semantic tokens map onto them (`primary` = ink, `destructive` = chart-1).
- Type: Cinzel (`font-display`) only on a brush stroke and for small labels: `type-band-md|sm`, `type-ink-button`, `type-overline`, `type-diary-name`. Everything else is Spectral (`font-sans`), numbers included: `type-stat-hero|num|lg`, `type-entry-title`, `type-label`, `type-body-strong`, `type-caption`, `type-nav`, `type-tab-label`.
- Brush strokes are a div with a background color and a mask from `public/brush/` (`ink ink--band1|band2|sweep|tab|blot|bar1…4`), absolutely positioned behind the text. Never `border-radius`, `box-shadow` or `filter` on the ink layer. The primitives live in `src/components/notebook/`: `<PaintedBand>` (`variant`, `flip`), `<BrushBar value tone index>` (bars alternate masks by `index`; zero draws a hairline), `<InkButton>` (a screen's one main action; shadcn's default `Button` is the same stroke), `<NativeSelect>`, the stroke icons, and `<NotebookShell active left right>`, which renders the insert/tab-bar navigation, so screens only fill their pages. Screens before the notebook (landing, sign-in, onboarding, legal, not found) use `<PaperSheet>`: one sheet on the map, no navigation.
- Selected = painted: current nav item, tab, pressed option and chip get a stroke plus `aria-current` / `aria-pressed`. No bordered, rounded boxes as containers; paper takes `filter: drop-shadow`, not `box-shadow`. Form fields are underline-only.
- Motion is CSS only (`src/app/globals.css`), and off under `prefers-reduced-motion`: `NotebookPage` and `PaperSheet` make their blocks rise in one after another (`enter-stagger`), strokes are painted left to right (`paint-in`, already on bands, bars, the nav and pressed options), and bars follow their `order` top to bottom. A new stroke gets `paint-in`; nothing else needs wiring.
- The desktop notebook starts at the `notebook:` breakpoint (1200px); below it, the phone notebook.
- Leaders are shown by emoji plus their chart color (`ARNAK_LEADER_STYLES` in `src/games/arnak.ts`), never with the official leader art: it isn't licensed, so it must not be committed or displayed (even where the design mentions portraits).
- One radius (4px; the leather cover is 12px). Design spacing `space-1…8` (4, 8, 12, 16, 22, 34, 46, 54px) = Tailwind `1, 2, 3, 4, 5.5, 8.5, 11.5, 13.5`. Touch targets are at least 44px; inputs keep 16px text on phones so iOS doesn't zoom.

## Database

- Every schema change is a new migration: `pnpm supabase migration new <name> < /dev/null` (without `< /dev/null` it waits for SQL on stdin). Never edit a migration that's on `main`; it's already applied to staging and production.
- Access is an explicit allow-list: default privileges are revoked, so every new table needs `grant`s for `authenticated` (column-level for updates), `enable row level security`, policies, and pgTAP tests that sign in as different users (see `rls.test.sql`). Policy helpers are `security definer` functions in the `private` schema. New functions: `revoke execute ... from public, anon`.
- Derived values (totals, winners, placement) come from views like `match_results` (`security_invoker = true`), not stored columns.
- Catalog data (games, leaders, score categories) is inserted by migrations, not `seed.sql`. Store slugs only; labels live in messages under `Games.<game>`.

## Testing

- Unit tests sit next to the code as `*.test.ts(x)`. E2E tests in `e2e/` sign in for real: codes are read from Mailpit (`e2e/helpers/auth.ts`). Use `formError(page)` for form errors: Next's route announcer also has `role="alert"`.
- When a test passes on the first run, break the code on purpose to confirm it can fail.
- While building, run only what the change touches: `pnpm vitest related <files> --run` for unit tests, and the e2e spec files of the screen or feature being changed (`CI=1 pnpm test:e2e e2e/<name>.spec.ts`, after `pnpm build`). Before opening a pull request, run the whole suite once (lint, typecheck, unit, build, full e2e): e2e tests drive the browser and import no app code, so "only changed" selection can't see that a shared component (Button, the notebook shell) broke another screen.
- Batch screenshots and fixes so each round needs one `pnpm build`, not one per tweak.
- Playwright wipes `test-results/` on every run: never keep backups or anything else you need there.
- Screenshots: `e2e/visual.spec.ts` compares each screen at 1280×1000 and 390×844 with the references in `e2e/__screenshots__/`. They only run on Linux (CI), since fonts render differently on macOS. When a change alters a screen on purpose, add the `update-screenshots` label to its pull request; the **Update screenshots** workflow uploads new references as the `screenshots` artifact. Check them, then `gh run download <run-id> -n screenshots -D e2e/__screenshots__` and commit them (the workflow can't: its commits wouldn't run the required checks).
- pgTAP tests must pass on a local database that e2e runs have filled: scope every query to the test's own fixture ids, never assume the tables are empty. And a statement can't see rows a function it calls inserts: store the result (e.g. a temp table), then check it in the next statement.

## Environments

| | Supabase | App |
| --- | --- | --- |
| Local | `pnpm supabase start` (Studio :54323, Mailpit :54324) | `pnpm dev` |
| Staging | `reabwxbptbzokwxnxmae` | Vercel preview deployments |
| Production | `niltnathzxgedevqaltz` | https://muninn-logs.vercel.app |

- Changes to `supabase/migrations/`, `supabase/config.toml` or `supabase/templates/` run `.github/workflows/deploy-db.yml`: migrations, then `supabase config push`. A pull request deploys to staging only, so its Vercel preview has its schema; merging deploys staging, then production.
- Never edit a migration after its pull request ran it on staging. If staging drifts from `main` (abandoned PR, rewritten migration), run the **Reset staging** workflow: it rebuilds staging from `main` and deletes its data.
- Auth settings (email templates, OTP length, SMTP, redirect URLs, rate limits) live in `supabase/config.toml`. Shared values sit at the top; each hosted project's `[remotes.<name>]` block overrides only what differs. Never change them in the Supabase dashboard: the next deploy overwrites it. Preview a change with `pnpm supabase config diff --project-ref <ref>` (needs `pnpm supabase login`).
- If local sign-in emails show a link instead of a 6-digit code, the local gateway lost the email templates: `pnpm supabase stop && pnpm supabase start`.
- Google sign-in is on for staging and production (OAuth client in the Google Cloud project "Muninn Logs"; the secret is the `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` repo secret; Vercel's `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true` shows the button). It's off locally and can't be e2e-tested: check it by hand on a preview.
- Only publishable keys (`sb_publishable_…`) may be `NEXT_PUBLIC_*`. Secret keys and passwords never go in client code or chat.
