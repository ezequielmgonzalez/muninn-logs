# Hand-off: restyle Muninn Logs to the v3 "cuaderno de campo" design

This folder is the source of truth for the new look. It replaces any earlier `design/` folder (the v2 "diario de expedición" with SVG-filter bands and the v1 hand-drawn/hatched style). **This is a restyle, not a rewrite:** keep every route, data query, server action, validation (Zod), RLS assumption and i18n key exactly as they are. Only layout, components and styling change.

## What's here

| Path | What |
| --- | --- |
| `README.md` | The brand book: concept, notebook structure, brush technique, color, type, voice, accessibility, screen map. Read it first. |
| `tokens.json` / `tokens.css` | All tokens. `tokens.css` already has the CSS variables, the shadcn/ui variable mapping and the `.ink--*` mask classes. |
| `assets/brush/` | Brush-stroke masks (PNG, alpha = shape). Copy to `public/brush/`. |
| `assets/paper/` | Paper textures (WebP with alpha). Copy to `public/paper/`. |
| `components/*.md` | Guidelines per component (anatomy, measurements, rules, suggested API). |
| `screens/*-desktop.html`, `screens/*-mobile.html` | Static reference mockups of every screen (1280×1000 and 390 wide). Open them in a browser. Leader portraits show as a coloured initial here — use the real images from `public/leaders/`. |
| `scripts/*.py` | Generators for the masks and textures (numpy + scipy + Pillow), in case a new proportion is needed. Not part of the app build. |

## Plan (one PR per step)

1. **Foundations.** Copy assets to `public/brush/` and `public/paper/`. Load Cinzel (600, 700) and Spectral (400–700 + italic 400) with `next/font/google`. Put `tokens.css` into `globals.css` (map them into the Tailwind theme so `bg-ink`, `text-ink-muted`, `font-display`, etc. exist). Remove the old v2 styles (the torn black header, `paint-bg`/`paint-fg`, any `feDisplacementMap` filters).
2. **Primitives** (`components/notebook/`): `PaintedBand`, `BrushBar`, `InkButton` (+ the round `LoadMatchFab`), `NotebookShell` (desktop open notebook ≥ 1200px, mobile top-bound notebook below), `SideNav` (divider sheet) and `TabBar` (mobile). Restyle the shadcn primitives in place rather than adding new ones: `Input`, `Select`, `Button` (link/icon variants), `ToggleGroup` (segmented + chips with the `brush-tab` stroke when pressed), `Popover`/`Command` for the player search. Specs in `components/*.md`.
3. **Screens, one per PR**, each wrapped in `NotebookShell` with its content split into `left` / `right` pages as in the README's "Pantallas" table and the mockups in `screens/`:
   - Dashboard → `inicio-*.html`
   - Load match → `cargarpartida-*.html` (on mobile the tab bar is replaced by the save bar)
   - Stats → `estadisticas-*.html`
   - Matches → `partidas-*.html` (group by month, one painted band per month)
   - Friends → `amigos-*.html` (mobile shows "Tus amigos" before "Agregar amigo")
   - Compare → `comparar-*.html` (the nav marks Amigos as current)
4. **Clean-up.** Replace every emoji (trophy, leader icons) with the crown icon and the 20px leader portraits. Playwright screenshots of each screen at 390×844 and 1280×1000 so future changes can be checked against the mockups.

## Rules that matter most

- **Accent = brush stroke, surface = paper.** No bordered/rounded rectangles as containers, no solid black header bar.
- Brush strokes are a `div` with `background-color` + a mask class (`.ink.ink--band1`, etc.), absolutely positioned behind the text, with the insets given in the README. Never `border-radius`, `box-shadow` or `filter` on the ink layer.
- **Selected = painted**: current nav item, current tab, pressed segmented option and pressed chip all use a stroke + `band-text`, and also `aria-current` / `aria-pressed`.
- Bars alternate the four bar masks with `i % 4`; zero values get a hairline instead of a bar.
- Paper uses `filter: drop-shadow(...)`, not `box-shadow`.
- Form fields are underline-only (no boxes), 16px text on mobile.
- Numbers formatted with `Intl.NumberFormat('es-AR')` (`64,8`, `32 %`).

## Things the mockups show that may not exist yet

Build them only if the data is already available; otherwise leave the block out and list it in the PR description — don't add backend work without asking:

- Inicio: "Tus líderes" (top 3 leaders by games, from the stats query).
- Cargar partida: per-category score inputs with a computed total per player, and player-search suggestion groups ("Tus invitados", "Jugaron con vos" = other organisers' guests you shared a match with, "Crear invitado «…»").
- Partidas: pagination ("Anteriores →").
- Amigos: a "Comparar" link per friend.
- Comparar: "Puntos por categoría" grouped bars on the left page.

Ignore the round floating button visible on the right edge of the old screenshots (it's a dev overlay, not part of the app).
