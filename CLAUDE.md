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

"Diario de expedición": aged paper, section titles painted in ink. Read `design/README.md` → `SUMMARY.md` → `brand.md` before building UI; the HTML files there are references to open in a browser. One light theme ("Pergamino"); there is no dark theme, so don't add `dark:` styles.

- Colors are Tailwind classes from the brand tokens: `bg-ink`, `text-ink-body`, `text-ink-muted`, `text-band-text(-muted)`, `bronze`, `chart-1`…`chart-8` (which leader/category gets which chart color is in `design/tokens.json`). shadcn's semantic tokens map onto them (`primary` = ink, `destructive` = chart-1), so shadcn components are already on-brand.
- Type: `type-band-lg|md|sm` (Cinzel, uppercase, only for text on a painted band), `type-stat-hero|lg`, `type-body-strong`, `type-caption`. Everything else is Spectral (`font-sans`), numbers included.
- Section titles and page mastheads are `<PaintedBand>` (`size="section" | "page"`); value bars are `<PaintedBar value tone>`. Never hand-roll the paint layers or add `border-radius` to a band; the SVG filters they need come from `<Paper />` in the root layout.
- Leaders are shown by emoji plus their chart color (`ARNAK_LEADER_STYLES` in `src/games/arnak.ts`), never with the official leader art: it isn't licensed, so it must not be committed or displayed.
- One radius (4px). Design spacing `space-1…8` = Tailwind `1, 2, 3, 4, 5, 7, 11, 14`. Form controls and primary buttons are `h-11` (44px touch targets); inputs keep 16px text on phones so iOS doesn't zoom.

## Database

- Every schema change is a new migration: `pnpm supabase migration new <name> < /dev/null` (without `< /dev/null` it waits for SQL on stdin). Never edit a migration that's on `main`; it's already applied to staging and production.
- Access is an explicit allow-list: default privileges are revoked, so every new table needs `grant`s for `authenticated` (column-level for updates), `enable row level security`, policies, and pgTAP tests that sign in as different users (see `rls.test.sql`). Policy helpers are `security definer` functions in the `private` schema. New functions: `revoke execute ... from public, anon`.
- Derived values (totals, winners, placement) come from views like `match_results` (`security_invoker = true`), not stored columns.
- Catalog data (games, leaders, score categories) is inserted by migrations, not `seed.sql`. Store slugs only; labels live in messages under `Games.<game>`.

## Testing

- Unit tests sit next to the code as `*.test.ts(x)`. E2E tests in `e2e/` sign in for real: codes are read from Mailpit (`e2e/helpers/auth.ts`). Use `formError(page)` for form errors: Next's route announcer also has `role="alert"`.
- When a test passes on the first run, break the code on purpose to confirm it can fail.

## Environments

| | Supabase | App |
| --- | --- | --- |
| Local | `pnpm supabase start` (Studio :54323, Mailpit :54324) | `pnpm dev` |
| Staging | `reabwxbptbzokwxnxmae` | Vercel preview deployments |
| Production | `niltnathzxgedevqaltz` | https://muninn-logs.vercel.app |

- Merging a migration to `main` runs `.github/workflows/deploy-db.yml`: staging, then production.
- If local sign-in emails show a link instead of a 6-digit code, the local gateway lost the email templates: `pnpm supabase stop && pnpm supabase start`.
- Auth settings on the hosted projects (Gmail SMTP, email templates with `{{ .Token }}`, OTP length 6, redirect URLs) are set by hand in each dashboard for now; change both projects together. Google sign-in is built but off (`NEXT_PUBLIC_AUTH_GOOGLE_ENABLED`).
- Only publishable keys (`sb_publishable_…`) may be `NEXT_PUBLIC_*`. Secret keys and passwords never go in client code or chat.
