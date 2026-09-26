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

## Testing

```bash
pnpm test        # unit tests (Vitest), next to the code as *.test.ts(x)
pnpm test:watch  # unit tests in watch mode
pnpm test:e2e    # end-to-end tests (Playwright) in e2e/, desktop + mobile
```

The first time, install the browser with `pnpm exec playwright install chromium`. `pnpm test:e2e` starts `pnpm dev` on port 3100, or reuses it if it's already running.
