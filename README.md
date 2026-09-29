# Muninn Logs

The memory of your game table: log board game plays with friends and guests, and see how you play. See [docs/vision.md](docs/vision.md).

## Getting started

Requires Node 20+, pnpm, and Docker (for the local Supabase stack).

```bash
pnpm install
pnpm supabase start        # local Postgres + Auth; prints the URL and publishable key
cp .env.example .env.local # paste those values in
pnpm dev
```

## Database

Schema changes are versioned SQL migrations in `supabase/migrations/`. See [docs/data-model.md](docs/data-model.md) for the model.

```bash
pnpm supabase migration new <name>  # create a migration file
pnpm supabase db reset              # rebuild the local database from all migrations
pnpm db:types                       # regenerate src/lib/supabase/database.types.ts
pnpm test:db                        # pgTAP tests in supabase/tests/
```

Commit the regenerated types with the migration; CI fails if they're stale.

### Environments

| | Supabase project | App |
| --- | --- | --- |
| Local | `pnpm supabase start` | `pnpm dev` |
| Staging | `muninn-logs-staging` | Vercel preview deployments |
| Production | `muninn-logs-prod` | https://muninn-logs.vercel.app |

A pull request that changes `supabase/migrations/`, `supabase/config.toml` or `supabase/templates/` deploys it to **staging** only, so the PR's Vercel preview runs against its schema. If staging ever drifts from `main` (an abandoned PR, a rewritten migration), run the **Reset staging** workflow, which rebuilds it from `main` and deletes its data.

Merging such a change runs **Deploy Supabase** (`.github/workflows/deploy-db.yml`): it applies pending migrations and pushes the config (Auth settings, email templates, SMTP) to staging, then to production if staging succeeded. Each hosted project's overrides are its `[remotes.<name>]` block in `config.toml`; preview them with `pnpm supabase config diff --project-ref <ref>`.

It needs the repository secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_AUTH_SMTP_PASS` (the Gmail app password), and in the `db-staging` and `db-production` GitHub environments, the `SUPABASE_PROJECT_REF` variable and `SUPABASE_DB_PASSWORD` secret.

## Testing

```bash
pnpm test        # unit tests (Vitest), next to the code as *.test.ts(x)
pnpm test:watch  # unit tests in watch mode
pnpm test:e2e    # end-to-end tests (Playwright) in e2e/, desktop + mobile
```

The first time, install the browser with `pnpm exec playwright install chromium`. `pnpm test:e2e` starts `pnpm dev` on port 3100, or reuses it if it's already running. It needs the local Supabase stack running (`pnpm supabase start`): the sign-in tests read their codes from Mailpit at http://127.0.0.1:54324.

## Authentication

Users sign in with a 6-digit code sent by email (templates in `supabase/templates/`), then choose a username. Locally, every email lands in Mailpit (http://127.0.0.1:54324) instead of a real inbox.

Google sign-in is built but off until a Google Cloud OAuth client exists: enable `[auth.external.google]` in `supabase/config.toml` and set `NEXT_PUBLIC_AUTH_GOOGLE_ENABLED=true`.
