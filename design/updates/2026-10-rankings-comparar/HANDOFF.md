# Update: multi-select players filter, Rankings, and head-to-head in Comparar

Three changes on top of the app as it is today. They follow the conventions already in the app (see the screens README): brush for what you read, pen for what you press, a picked option circled in pen, leaders as an emoji in a bronze frame, the left panel fixed between screens. Keep everything else as it is.

## Reference mockups

Open them in a browser from this folder (they load the textures and masks from `design/assets/`, so that folder from the v3 hand-off must still be there):

| File | What |
| --- | --- |
| `rankings.html` | Rankings, desktop |
| `rankingsmovil.html` | Rankings, phone |
| `rankingsmovilfiltros.html` | Rankings, phone, with the filters sheet open |
| `compararv2.html` | Comparar with head-to-head, desktop |
| `compararv2movil.html` | Comparar with head-to-head, phone |

The data in them is made up. The emoji for Halconero, Mecánico and Explorador are guesses: use the app's existing mapping.

## 1. "Jugadores" filter: several table sizes at once

- Replace the `Todas / 2 / 3 / 4` select with three checkboxes, **2 · 3 · 4**, drawn in pen: a hand-drawn box, and a pen tick when checked. Use real `<input type="checkbox">` inside a `<fieldset>` with the legend "Jugadores". Hide the native box visually and draw the pen box with SVG.
- The state is a set of table sizes. All three checked means no filter ("Todas"). At least one must stay checked: unchecking the last one does nothing and announces "Tiene que quedar al menos una" in an `aria-live` region.
- Keep it in the URL as `?jugadores=3,4` (omitted when all three are checked) and in a cookie, so Server Components read it and it survives reloads. Every stat and list that respects the filter today keeps doing so, now with `IN (...)`.
- When not all three are checked, every page with data shows an italic note under its first painted title: "Solo mesas de 3 y 4 jugadores" / "Solo mesas de 2 jugadores" / "Solo mesas de 2 y 4 jugadores".
- Phone: the same checkboxes at the top of the page, right-aligned, where the select is now.

## 2. Rankings (new section)

### Where it lives

- Route `/rankings` (localized like the rest). Nav item **Rankings** in the left panel, between Estadísticas and Amigos.
- Phone: no new tab (the bar is full). Estadísticas gets a two-option switch at the top, **Tus números · Rankings**, with the current one circled in pen. Each option is a link to its route.

### Left page: "Consulta"

- **Líder** (single choice): "Todos" plus the 8 leaders, each with its emoji frame, in a 2-column grid. The picked one is circled in pen. "Sin especificar" is not offered.
- **Templo**: Cualquiera / Pájaro / Serpiente (the board side).
- **Quiénes entran** (multiple): Amigos, Tus invitados, Invitados de otros. You are always included.
- **Limpiar filtros** resets to Todos, Cualquiera and all three groups.
- Filters live in the URL: `?lider=profesor&templo=serpiente&quienes=amigos,invitados,otros`.

### Right page: "Ranking"

- A sentence with the active filters: "Con el **Profesor** en el templo de la **Serpiente**". Use "Con todos los líderes" for Todos, and leave out the temple part for Cualquiera. Under it: "6 jugadores · 17 partidas", where the second number counts the distinct matches the ranking uses.
- **Ordenar por**: Win rate (default, highest first), Puntos promedio (highest first), Lugar promedio (lowest first), Partidas (most first). Ties: more games first, then name.
- **Each row**: position in Cinzel; the name plus "· amiga", "· tu invitada", "· invitado de Iñaki"; the sorted value plus "· N partidas"; and a brush bar.
  - The bar uses the leader's chart color (bronze for Todos) and its width is relative to the best value in the list (inverted for Lugar promedio).
  - A value of 0 gets a hairline instead of a bar.
  - Your row is bold with the bronze dot.
- **What a player's numbers mean**: only the matches where *that player* used the selected leader (any leader for Todos), the match's board side matches (any for Cualquiera), and the table size passes the Jugadores filter. A win is finishing 1st. Players with no matches under the filters don't appear. No minimum number of matches: the "· N partidas" next to each value is enough context.
- **Who can appear**: you, your accepted friends, your guests, and other organizers' guests only if they shared at least one match with you (the same visibility rule as the rest of the app). Do the aggregation in Postgres (a function or view that runs as the caller, so RLS applies), not in the client.
- **Empty state**: "Nadie jugó esa combinación todavía." with a "Limpiar filtros" link.

### Phone

- The filters collapse into a card: the leader's emoji frame, "Profesor · templo de la Serpiente", and "Amigos e invitados · mesas de 3 y 4".
- The card's **Cambiar filtros** link opens a bottom sheet:
  - a paper sheet (`tabbar.webp` stretched, torn top edge) over a dark scrim;
  - the same three groups of controls;
  - a pen button **Ver ranking**.
- The sheet is a `role="dialog"` with `aria-modal`, traps focus, and closes with Esc or a tap on the scrim.

## 3. Comparar: "Puntos por categoría" becomes "Cara a cara"

- Remove the grouped bars per category. The table on the right page stays as it is.
- New block **Cara a cara** on the left page, under the Comparar button (on the phone: after the controls, before the table), with the note "Quién quedó más arriba en las partidas que jugaron juntos".
- **One duel per selected friend**, always counted over the matches the two of you played together, whatever the "Partidas" select says:
  - The score line: "Vos 7 — 5 Manuela" and "12 partidas juntos". "Quedar arriba" means the better finishing position in that match.
  - A split brush bar: your color (bronze) and the friend's column color, proportional to the two counts, with a 3px gap.
- **The advantage note under each duel** uses the same averages as the table, so it follows the "Partidas" select.
  - It names the category with the biggest difference in your favour and the one with the biggest against you: "Le sacás 2,3 en Ídolos · te saca 1,7 en Investigación".
  - For Miedo, the higher (less negative) value is the better one.
  - If there is no difference in one direction, show only the other half. If you are equal everywhere: "Van parejos en todo". One decimal, `es-AR` formatting.
  - With no matches together: "Todavía no jugaron juntos." and no bar.
- **With two or more friends selected**, add "Los tres en la mesa" (or "Los cuatro…", "Los cinco…"):
  - the matches where you and every selected friend played together: how many, and the wins per person, most wins first;
  - hide it when there are none.

## Suggested PRs

1. The Jugadores filter (multi-select, URL plus cookie, the notes under titles).
2. Rankings: the query (SQL function plus tests), then the screen, then the phone sheet.
3. Comparar: head-to-head plus the advantage note, replacing the per-category bars.

Add unit tests for parsing `?jugadores`, the ranking semantics (leader per player, board side, table size), and the advantage note (Miedo direction, ties, no shared matches). Add Playwright screenshots of the new screens at 390×844 and 1280×1000.
