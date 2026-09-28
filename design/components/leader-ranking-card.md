Ranks the eight Arnak leaders by a stat the viewer picks — a painted section band with a stat selector, then a list of rows where each ranking bar is the same painted-band technique in the leader's own categorical color.

## When to use it

The pattern for "who's best at X" on a profile. Reuse the same shape for a future "compare vs. a friend" feature — only the row data changes.

## Behavior

- Changing the dropdown re-sorts the rows and re-scales each bar's width.
- `avgPlacement` is inverted before scaling (lower placement = better = longer bar), same as every other metric — never draw it raw.
- Each row's portrait sits in a bronze-framed rectangle; the bar below it uses that same leader's categorical color, so a viewer learns "gold = Baroness" once and it holds everywhere.

## Tokens used

`ink` (section band), `band-text`, `chart-1`…`chart-8` (bars), `bronze` (avatar frame), `body-strong` / `stat-lg` (names and values), families `display` (band title) and `body` (everything else).

## Data this expects

`{ name, color, img, winRate, avgPlacement, avgInvestigation, avgPoints }` per leader — `img` is a real portrait, not a placeholder; in production it's an uploaded/optimized asset per leader, not user-supplied.
