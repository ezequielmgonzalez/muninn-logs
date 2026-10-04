"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";

import { CloseIcon } from "@/components/notebook/icons";
import { InkButton } from "@/components/notebook/ink-button";
import { NotebookPage } from "@/components/notebook/notebook-page";
import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LOTR_SIDE_STYLES,
  LOTR_SIDES,
  LOTR_VICTORIES,
  type LotrResult,
  type LotrSide,
  type LotrVictory,
} from "@/games/lotr-duel";

import { type SaveMatchState, saveDuel } from "./actions";
import { type LogDuelInput, logDuelSchema } from "./duel-schema";
import { type AddablePlayer, localToday, PenToggle, PlayerPicker } from "./log-match-form";

/** One of the duel's two players. */
export type DuelPlayer = {
  key: string;
  name: string;
  /** Set for existing players; new guests only have a name. */
  playerId?: string;
  isGuest: boolean;
  isMe: boolean;
  ownerName: string | null;
};

/** An existing duel to edit, already in the form's shape. */
export type InitialDuel = {
  matchId: string;
  playedOn: string;
  durationMinutes: number | null;
  players: DuelPlayer[];
  /** Who played Sauron (the other played the Fellowship). */
  sauronKey: string | null;
  result: LotrResult | null;
  victory: LotrVictory | null;
};

const idle: SaveMatchState = { status: "idle" };

function fromAddable(p: AddablePlayer): DuelPlayer {
  return { key: p.id, name: p.name, playerId: p.id, isGuest: p.is_guest, isMe: p.is_me, ownerName: p.owner_name };
}

/**
 * Logs or edits a LOTR Duel: the two players and their sides on the left
 * page, the result on the right. No points: a side wins by one of the three
 * victories or by influence, or it's a draw.
 */
export function LogDuelForm({ addable, initial, title }: { addable: AddablePlayer[]; initial?: InitialDuel; title: string }) {
  const t = useTranslations("LogDuel");
  const tLog = useTranslations("LogMatch");
  const tGame = useTranslations("Games.lotr-duel");
  const locale = useLocale();
  const [state, action, pending] = useActionState(saveDuel, idle);

  const me = addable.find((p) => p.is_me);
  const [players, setPlayers] = useState<DuelPlayer[]>(() => initial?.players ?? (me ? [fromAddable(me)] : []));
  const [playedOn, setPlayedOn] = useState(initial?.playedOn ?? "");
  const [duration, setDuration] = useState(initial?.durationMinutes?.toString() ?? "");
  const [sauronKey, setSauronKey] = useState<string | null>(initial?.sauronKey ?? null);
  const [result, setResult] = useState<LotrResult | null>(initial?.result ?? null);
  const [victory, setVictory] = useState<LotrVictory | null>(initial?.victory ?? null);

  // New duels default to today, on the client (it knows the player's time zone).
  const isNew = !initial;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only default
    if (isNew) setPlayedOn((current) => current || localToday());
  }, [isNew]);

  // The sides follow the players: whoever isn't Sauron is the Fellowship.
  const sauron = players.find((p) => p.key === sauronKey) ?? null;
  const fellowship = sauron ? (players.find((p) => p.key !== sauron.key) ?? null) : null;
  const sideOf = (side: LotrSide) => (side === "sauron" ? sauron : fellowship);

  const payload = {
    playedOn: playedOn === "" ? null : playedOn,
    durationMinutes: duration === "" ? null : Number(duration),
    players: players.map((p) => ({
      ...(p.playerId ? { playerId: p.playerId } : { newGuestName: p.name }),
      side: p.key === sauronKey ? "sauron" : "fellowship",
    })),
    result,
    victory: result === "draw" ? null : victory,
  };
  const canSave = logDuelSchema.safeParse(payload).success;

  // What's missing, or what will be saved, above the save button.
  const summary =
    players.length < 2
      ? t("needOpponent")
      : !sauron
        ? t("needSides")
        : !result
          ? t("needResult")
          : result === "draw"
            ? t("summaryDraw", { a: sauron.name, b: fellowship!.name })
            : !victory
              ? t("needVictory")
              : t("summaryWin", {
                  name: sideOf(result)!.name,
                  side: tGame(`sidesShort.${result}`),
                  victory: tGame(`victories.${victory}`),
                });

  function remove(key: string) {
    setPlayers((current) => current.filter((p) => p.key !== key));
    if (sauronKey === key) setSauronKey(null);
  }

  const saveArea = (
    <>
      {state.status === "error" && (
        <p role="alert" className="mb-3 text-center text-sm text-destructive">
          {tLog(`errors.${state.error}`)}
        </p>
      )}
      <p className="type-caption mb-3 text-center text-ink-muted">{summary}</p>
      <InkButton type="submit" disabled={!canSave || pending}>
        {t("save")}
      </InkButton>
    </>
  );

  return (
    // display: contents, so the two pages sit in the notebook as if the form weren't there.
    <form action={action} className="contents">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="payload" value={JSON.stringify(payload satisfies Record<keyof LogDuelInput, unknown>)} />
      {initial && <input type="hidden" name="matchId" value={initial.matchId} />}

      <NotebookPage side="left">
        <PaintedBand as="h1">{title}</PaintedBand>
        <div className="mt-5.5 flex flex-col gap-5.5">
          <div>
            <Label htmlFor="played-on">{tLog("date")}</Label>
            <Input
              id="played-on"
              type="date"
              value={playedOn}
              max={localToday()}
              onChange={(e) => setPlayedOn(e.target.value)}
              aria-describedby="played-on-hint"
            />
            <p id="played-on-hint" className="type-caption mt-1.5 text-ink-muted">
              {tLog("dateHint")}
            </p>
          </div>
          <div>
            <Label htmlFor="duration" className="gap-1.5">
              {tLog("duration")} <span className="font-normal text-ink-muted">{tLog("optional")}</span>
            </Label>
            <div className="relative">
              <Input
                id="duration"
                className="pr-10"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={duration}
                onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
              />
              <span aria-hidden className="absolute top-1/2 right-1 -translate-y-1/2 text-sm text-ink-muted">
                {tLog("durationUnit")}
              </span>
            </div>
          </div>
        </div>

        <PaintedBand variant={2} flip className="mt-8.5 mb-3">
          {tLog("playersSection")}
        </PaintedBand>
        <ul className="mb-4 flex flex-col">
          {players.map((p) => (
            <li key={p.key} className="flex items-center gap-2 border-b border-ink-body/18 py-1.5">
              <p className="m-0 min-w-0 flex-1 truncate text-base">
                <b className="font-bold">{p.name}</b>
                <Who player={p} />
              </p>
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(p.key)} aria-label={tLog("remove", { name: p.name })}>
                <CloseIcon />
              </Button>
            </li>
          ))}
        </ul>
        {players.length < 2 ? (
          <PlayerPicker
            addable={addable}
            chosen={players}
            onPick={(p) => setPlayers((current) => [...current, fromAddable(p)])}
            onCreateGuest={(name) =>
              setPlayers((current) => [
                ...current,
                { key: crypto.randomUUID(), name, isGuest: true, isMe: false, ownerName: null },
              ])
            }
          />
        ) : (
          <div>
            <p id="sauron" className="type-label mb-2">
              {t("whoIsSauron")}
            </p>
            <div role="group" aria-labelledby="sauron" aria-describedby="sauron-hint" className="grid grid-cols-2 gap-2.5">
              {players.map((p) => (
                <PenToggle key={p.key} pressed={sauronKey === p.key} onClick={() => setSauronKey(p.key)}>
                  {p.name}
                </PenToggle>
              ))}
            </div>
            <p id="sauron-hint" className="type-caption mt-1.5 text-ink-muted">
              {fellowship ? t("fellowshipIs", { name: fellowship.name }) : t("whoIsSauronHint")}
            </p>
          </div>
        )}
      </NotebookPage>

      <NotebookPage side="right">
        <PaintedBand>{t("resultSection")}</PaintedBand>
        <div className="mt-5.5">
          <p id="winner" className="type-label mb-2">
            {t("winner")}
          </p>
          <div role="group" aria-labelledby="winner" className="grid grid-cols-1 gap-1">
            {[...LOTR_SIDES, "draw" as const].map((option) => (
              <PenToggle key={option} pressed={result === option} onClick={() => setResult(option)}>
                {option === "draw" ? (
                  tGame("draw")
                ) : (
                  <>
                    <span aria-hidden>{LOTR_SIDE_STYLES[option].emoji} </span>
                    {tGame(`sides.${option}`)}
                    {sideOf(option) && <span className="font-normal text-ink-muted"> · {sideOf(option)!.name}</span>}
                  </>
                )}
              </PenToggle>
            ))}
          </div>
        </div>

        {result && result !== "draw" && (
          <div className="mt-5.5">
            <p id="victory" className="type-label mb-2">
              {t("victory")}
            </p>
            <div role="group" aria-labelledby="victory" aria-describedby="victory-hint" className="grid grid-cols-2 gap-2.5">
              {LOTR_VICTORIES.map((option) => (
                <PenToggle key={option} pressed={victory === option} onClick={() => setVictory(option)}>
                  {tGame(`victories.${option}`)}
                </PenToggle>
              ))}
            </div>
            <p id="victory-hint" className="type-caption mt-1.5 text-ink-muted">
              {t("influenceHint")}
            </p>
          </div>
        )}
        {result === "draw" && <p className="type-caption mt-3 text-ink-muted">{t("drawHint")}</p>}

        {/* Desktop: saving closes the right page. Phones have the save bar instead. */}
        <div className="mt-8.5 hidden notebook:block">{saveArea}</div>
      </NotebookPage>

      {/* Phones: the save bar takes the tab bar's place, so logging is full-screen. */}
      <div className="fixed inset-x-0 bottom-0 z-10 notebook:hidden">
        <div
          aria-hidden
          className="absolute inset-x-[-8px] top-0 bottom-[-6px] bg-[url(/paper/tabbar.webp)] bg-size-[100%_100%] bg-no-repeat drop-shadow-[0_-6px_12px_rgba(48,30,12,0.4)]"
        />
        <div className="relative z-2 px-[34px] pt-5.5 pb-[max(1rem,env(safe-area-inset-bottom))]">{saveArea}</div>
      </div>
    </form>
  );
}

/** " · vos", " · invitado de Ana"…: who a player is, after their name. */
function Who({ player: p }: { player: DuelPlayer }) {
  const t = useTranslations("LogMatch");
  const who = p.isMe
    ? t("you")
    : !p.playerId
      ? t("newGuest")
      : p.isGuest
        ? p.ownerName
          ? t("guestOf", { owner: p.ownerName })
          : t("guest")
        : null;
  return who && <span className="text-ink-muted"> · {who}</span>;
}
