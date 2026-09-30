"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useActionState, useMemo, useState } from "react";

import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { playedOnDate } from "@/features/matches/format";
import type { AddablePlayer } from "@/features/matches/log-match-form";
import { total } from "@/features/matches/scoring";
import type { ArnakLeader } from "@/games/arnak";

import { type ImportMatchesState, importMatches } from "./actions";
import { type ImportIssue, type ImportResult, importedNames, leaderLookup, nameKey, parseImport } from "./parse-import";
import { NEW_GUEST, type NameChoices, suggestChoices, toMatchInputs } from "./to-matches";

const idle: ImportMatchesState = { status: "idle" };

/** More than this and the list stops helping: fix these, then choose the file again. */
const SHOWN_ISSUES = 30;

/** Choose a CSV, match its names to players, check the games, import. */
export function ImportForm({
  addable,
  leaderLabels,
}: {
  addable: AddablePlayer[];
  leaderLabels: Record<ArnakLeader, string>[];
}) {
  const t = useTranslations("AdminImport");
  const tLeaders = useTranslations("Games.arnak.leaders");
  const format = useFormatter();
  const locale = useLocale();
  const [state, action, pending] = useActionState(importMatches, idle);
  const leaders = useMemo(() => leaderLookup(leaderLabels), [leaderLabels]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [choices, setChoices] = useState<NameChoices>({});

  const names = result ? importedNames(result.games) : [];
  const ready = result !== null && result.issues.length === 0;
  const { matches, issues: samePlayer } = ready
    ? toMatchInputs(result.games, choices)
    : { matches: [], issues: [] };
  const byId = new Map(addable.map((p) => [p.id, p]));

  async function choose(file: File | undefined) {
    if (!file) return setResult(null);
    const parsed = parseImport(await file.text(), leaders);
    setResult(parsed);
    setChoices(suggestChoices(importedNames(parsed.games), addable));
  }

  function issueText(issue: ImportIssue) {
    switch (issue.code) {
      case "duplicateLeader":
        return t("issues.duplicateLeader", { game: issue.game, leader: tLeaders(issue.leader) });
      default: {
        const { code, ...values } = issue;
        return t(`issues.${code}`, values as Record<string, string | number>);
      }
    }
  }

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${t.raw("templateCsv")}`)}`;

  return (
    <form action={action} className="flex flex-col gap-11">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="payload" value={JSON.stringify(matches)} />

      <section className="flex flex-col gap-5">
        <PaintedBand>{t("formatSection")}</PaintedBand>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-ink-body">
          <li>{t("formatRows")}</li>
          <li>{t("formatRequired")}</li>
          <li>{t("formatOptional")}</li>
        </ul>
        <Button asChild variant="outline" className="h-11 text-base">
          <a href={templateHref} download={t("templateFile")}>
            {t("template")}
          </a>
        </Button>
        <div className="flex flex-col gap-2">
          <Label htmlFor="import-file">{t("file")}</Label>
          <input
            id="import-file"
            type="file"
            accept=".csv,text/csv"
            className="text-base file:mr-3 file:h-11 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-transparent file:px-4"
            // Choosing the same file again (after fixing it) must read it again.
            onClick={(e) => {
              e.currentTarget.value = "";
            }}
            onChange={(e) => choose(e.target.files?.[0])}
          />
        </div>
        {result && result.issues.length > 0 && (
          <div role="alert" className="flex flex-col gap-2 text-destructive">
            <p className="type-body-strong">{t("issuesTitle")}</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
              {result.issues.slice(0, SHOWN_ISSUES).map((issue, i) => (
                <li key={i}>{issueText(issue)}</li>
              ))}
            </ul>
            {result.issues.length > SHOWN_ISSUES && (
              <p className="text-sm">{t("moreIssues", { count: result.issues.length - SHOWN_ISSUES })}</p>
            )}
          </div>
        )}
      </section>

      {ready && (
        <>
          <section className="flex flex-col gap-5">
            <PaintedBand>{t("playersSection")}</PaintedBand>
            <p className="text-ink-muted">{t("playersHint")}</p>
            <ul className="flex flex-col gap-3">
              {names.map((name) => {
                const id = `import-name-${nameKey(name)}`;
                return (
                  <li key={name} className="flex flex-col gap-2">
                    <Label htmlFor={id}>{name}</Label>
                    <select
                      id={id}
                      className="h-11 w-full rounded-md border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      value={choices[nameKey(name)] ?? NEW_GUEST}
                      onChange={(e) => setChoices((c) => ({ ...c, [nameKey(name)]: e.target.value }))}
                    >
                      <option value={NEW_GUEST}>{t("newGuest")}</option>
                      {addable.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.is_me
                            ? `${p.name} (${t("you")})`
                            : p.is_guest && p.owner_name
                              ? `${p.name} (${t("guestOf", { owner: p.owner_name })})`
                              : p.name}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex flex-col gap-5">
            <PaintedBand>{t("gamesSection", { count: result.games.length })}</PaintedBand>
            <ol className="flex flex-col">
              {result.games.map((game) => (
                <li key={game.label} className="flex flex-col gap-1 border-b py-3 last:border-b-0">
                  <span className="type-body-strong">
                    {t("game", { label: game.label })}
                    <span className="font-normal text-ink-muted">
                      {" · "}
                      {game.playedOn
                        ? format.dateTime(playedOnDate(game.playedOn), { dateStyle: "medium", timeZone: "UTC" })
                        : t("undated")}
                    </span>
                  </span>
                  <span className="text-sm text-ink-muted">
                    {game.players.map((p) => `${p.name} ${total(p.scores)}`).join(" · ")}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className="flex flex-col gap-2">
            {samePlayer.length > 0 && (
              <ul role="alert" className="flex list-disc flex-col gap-1 pl-5 text-sm text-destructive">
                {samePlayer.map((issue) => (
                  <li key={issue.game}>
                    {t("issues.samePlayer", { game: issue.game, name: byId.get(issue.playerId)?.name ?? "" })}
                  </li>
                ))}
              </ul>
            )}
            {state.status === "error" && (
              <p role="alert" className="text-sm text-destructive">
                {t(`errors.${state.error}`)}
              </p>
            )}
            <Button type="submit" className="h-11 text-base" disabled={pending || samePlayer.length > 0}>
              {t("submit", { count: matches.length })}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
