import { getFormatter, getTranslations } from "next-intl/server";

import { BrushBar, PaintedBand, PLAYER_TONES } from "@/components/notebook/painted-band";

import type { Advantage, duel, wholeTable } from "./head-to-head";

type Duel = ReturnType<typeof duel>;

/**
 * "Cara a cara": one duel per friend, "Vos 7 — 5 Manuela" over the games you
 * played together, with a split bar (yours in bronze, theirs in their column's
 * color) and where each of you leads by the table's averages. With two or more
 * friends, "Los tres en la mesa": the games all of you played, and who won them.
 */
export async function HeadToHead({
  names,
  duels,
  notes,
  table,
}: {
  /** You first, then each friend, as in the table's columns. */
  names: string[];
  duels: Duel[];
  notes: (Advantage | null)[];
  /** Everyone at once, when there are two or more friends. */
  table: ReturnType<typeof wholeTable> | null;
}) {
  const [t, tGame, format] = await Promise.all([
    getTranslations("Compare"),
    getTranslations("Games.arnak.scoreCategories"),
    getFormatter(),
  ]);
  const decimal = (n: number) => format.number(n, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const note = (advantage: Advantage | null) => {
    if (!advantage) return null;
    if (advantage.kind === "even") return t("even");
    const { ahead, behind } = advantage;
    const lead = ahead && t("ahead", { diff: decimal(ahead.diff), category: tGame(ahead.slug) });
    const trail = behind && t(lead ? "behind" : "behindOnly", { diff: decimal(behind.diff), category: tGame(behind.slug) });
    return [lead, trail].filter(Boolean).join(" · ");
  };

  // Everyone at the table, most wins first (you before a friend with as many).
  const standings = table
    ? names.map((name, i) => ({ name, i, wins: table.wins[i] })).sort((a, b) => b.wins - a.wins || a.i - b.i)
    : [];

  return (
    <section data-head-to-head>
      <PaintedBand variant={2} flip>
        {t("headToHead")}
      </PaintedBand>
      <p className="type-caption m-0 mt-3 text-center text-ink-muted">{t("headToHeadNote")}</p>
      <ul className="m-0 mt-4 flex list-none flex-col p-0">
        {duels.map((d, i) => (
          <li key={i} className="border-b border-ink-body/14 py-4 last:border-b-0">
            <p className="m-0 flex items-baseline justify-between gap-3">
              <span className="text-[17px]">
                {d.together === 0 ? (
                  <>
                    {names[0]} — {names[i + 1]}
                  </>
                ) : (
                  t.rich("score", {
                    mine: d.mine,
                    theirs: d.theirs,
                    name: names[i + 1],
                    b: (chunks) => <b className="font-semibold">{chunks}</b>,
                  })
                )}
              </span>
              {d.together > 0 && <span className="type-caption shrink-0 text-ink-muted">{t("together", { count: d.together })}</span>}
            </p>
            {d.together === 0 ? (
              <p className="type-caption m-0 mt-1.5 text-ink-muted">{t("notTogether")}</p>
            ) : (
              <>
                {/* Split in proportion to the two counts (even halves when every game was a tie), 3px apart. */}
                <div aria-hidden className="mt-2 flex gap-[3px]">
                  {[
                    { share: d.mine || (d.theirs ? 0 : 1), tone: PLAYER_TONES[0] },
                    { share: d.theirs || (d.mine ? 0 : 1), tone: PLAYER_TONES[i + 1] },
                  ]
                    .filter((side) => side.share > 0)
                    .map((side, s) => (
                      <div key={s} className="min-w-0" style={{ flexGrow: side.share, flexBasis: 0 }}>
                        <BrushBar value={1} tone={side.tone} index={i * 2 + s} order={i} />
                      </div>
                    ))}
                </div>
                {notes[i] && <p className="type-caption m-0 mt-1.5 text-ink-muted">{note(notes[i])}</p>}
              </>
            )}
          </li>
        ))}
      </ul>
      {table && table.matches > 0 && (
        <div className="mt-2 border-t border-ink-body/14 pt-4">
          <p className="m-0 flex items-baseline justify-between gap-3">
            <span className="font-semibold">{t("wholeTable", { count: names.length })}</span>
            <span className="type-caption text-ink-muted">{t("wholeTableGames", { count: table.matches })}</span>
          </p>
          <p className="m-0 mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[15px]">
            {standings.map(({ name, i, wins }, place) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: `var(--${PLAYER_TONES[i]})` }} />
                <span className={i === 0 ? "font-semibold" : undefined}>
                  {t(place === 0 ? "wonFirst" : "won", { name, count: wins })}
                </span>
              </span>
            ))}
          </p>
        </div>
      )}
    </section>
  );
}
