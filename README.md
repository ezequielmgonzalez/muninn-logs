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
