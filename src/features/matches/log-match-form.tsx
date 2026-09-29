"use client";

import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useState } from "react";

import { PaintedBand } from "@/components/painted-band";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ARNAK_LEADER_STYLES,
  ARNAK_LEADERS,
  ARNAK_SCORE_CATEGORIES,
  type ArnakLeader,
  type ArnakScoreCategory,
} from "@/games/arnak";
import { cn } from "@/lib/utils";

import { type SaveMatchState, saveMatch } from "./actions";
import { type LogMatchInput, logMatchSchema } from "./schema";
import { tiedForFirst, total } from "./scoring";

/** A row of list_addable_players(). */
export type AddablePlayer = {
  id: string;
  name: string;
  is_guest: boolean;
  is_me: boolean;
  owner_name: string | null;
};

export type FormPlayer = {
  key: string;
  name: string;
  /** Set for existing players; new guests only have a name. */
  playerId?: string;
  isGuest: boolean;
  isMe: boolean;
  ownerName: string | null;
  leader: ArnakLeader | null;
  /** As typed: digits or empty (empty counts as 0). */
  scores: Record<ArnakScoreCategory, string>;
};

/** An existing match to edit, already in the form's shape. */
export type InitialMatch = {
  matchId: string;
  playedOn: string;
  boardSide: "bird" | "snake" | null;
  durationMinutes: number | null;
  players: FormPlayer[];
  tiebreakKey: string | null;
};

const MAX_PLAYERS = 4;
const idle: SaveMatchState = { status: "idle" };

const emptyScores = () =>
  Object.fromEntries(ARNAK_SCORE_CATEGORIES.map((c) => [c, ""])) as FormPlayer["scores"];

function fromAddable(p: AddablePlayer): FormPlayer {
  return {
    key: p.id,
    name: p.name,
    playerId: p.id,
    isGuest: p.is_guest,
    isMe: p.is_me,
    ownerName: p.owner_name,
    leader: null,
    scores: emptyScores(),
  };
}

function numericScores(scores: FormPlayer["scores"]) {
  return Object.fromEntries(
    ARNAK_SCORE_CATEGORIES.map((c) => [c, scores[c] === "" ? 0 : Number(scores[c])]),
  ) as Record<ArnakScoreCategory, number>;
}

/** Today in the player's own time zone: games often end after midnight UTC. */
function localToday() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function LogMatchForm({ addable, initial }: { addable: AddablePlayer[]; initial?: InitialMatch }) {
  const t = useTranslations("LogMatch");
  const tGame = useTranslations("Games.arnak");
  const locale = useLocale();
  const [state, action, pending] = useActionState(saveMatch, idle);

  const me = addable.find((p) => p.is_me);
  const [players, setPlayers] = useState<FormPlayer[]>(
    () => initial?.players ?? (me ? [fromAddable(me)] : []),
  );
  const [playedOn, setPlayedOn] = useState(initial?.playedOn ?? "");
  const [boardSide, setBoardSide] = useState<"bird" | "snake" | null>(initial?.boardSide ?? null);
  const [duration, setDuration] = useState(initial?.durationMinutes?.toString() ?? "");
  const [tiebreakKey, setTiebreakKey] = useState<string | null>(initial?.tiebreakKey ?? null);

  // Set on the client: the server doesn't know the player's time zone.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only default
    setPlayedOn((current) => current || localToday());
  }, []);

  const totals = players.map((p) => total(numericScores(p.scores)));
  // Only ask about a tie once every player has scores, not while all are 0.
  const everyoneScored = players.every((p) => ARNAK_SCORE_CATEGORIES.some((c) => p.scores[c] !== ""));
  const tiedKeys = everyoneScored ? tiedForFirst(totals).map((i) => players[i].key) : [];
  const tiebreakWinner = tiedKeys.includes(tiebreakKey ?? "") ? tiebreakKey : null;

  const payload: LogMatchInput = {
    playedOn,
    boardSide,
    durationMinutes: duration === "" ? null : Number(duration),
    players: players.map((p) => ({
      ...(p.playerId ? { playerId: p.playerId } : { newGuestName: p.name }),
      leader: p.leader,
      scores: numericScores(p.scores),
      wonTiebreak: p.key === tiebreakWinner,
    })),
  };
  const canSave = logMatchSchema.safeParse(payload).success;

  function update(key: string, change: Partial<FormPlayer>) {
    setPlayers((current) => current.map((p) => (p.key === key ? { ...p, ...change } : p)));
  }

  function move(index: number, by: -1 | 1) {
    setPlayers((current) => {
      const next = [...current];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  return (
    <form action={action} className="flex flex-col gap-11 pb-28">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {initial && <input type="hidden" name="matchId" value={initial.matchId} />}

      {/* The match details sit directly under the page title, "Nueva partida". */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="played-on">{t("date")}</Label>
          <Input
            id="played-on"
            type="date"
            className="h-11"
            value={playedOn}
            max={localToday()}
            onChange={(e) => setPlayedOn(e.target.value)}
            required
          />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t("boardSide")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {([null, "bird", "snake"] as const).map((side) => (
              <label
                key={side ?? "none"}
                className={cn(
                  "flex h-11 cursor-pointer items-center justify-center rounded-md border border-input text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                  boardSide === side && "border-primary bg-primary text-primary-foreground",
                )}
              >
                <input
                  type="radio"
                  name="board-side"
                  className="sr-only"
                  checked={boardSide === side}
                  onChange={() => setBoardSide(side)}
                />
                {side ? t(side) : t("notRecorded")}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex flex-col gap-2">
          <Label htmlFor="duration">{t("duration")}</Label>
          <Input
            id="duration"
            className="h-11"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </section>

      <section className="flex flex-col gap-5">
        <PaintedBand>{t("playersSection")}</PaintedBand>
        <ol className="flex flex-col">
          {players.map((p, i) => {
            const takenByOthers = new Set(players.filter((o) => o.key !== p.key).map((o) => o.leader));
            return (
              <li key={p.key} className="flex flex-col gap-2 border-b py-3 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm text-ink-muted">{t("turn", { n: i + 1 })}</span>
                    <span className="type-body-strong truncate">
                      {p.name}
                      <span className="font-normal text-ink-muted">
                        {p.isMe
                          ? ` · ${t("you")}`
                          : !p.playerId
                            ? ` · ${t("newGuest")}`
                            : p.isGuest
                              ? ` · ${p.ownerName ? t("guestOf", { owner: p.ownerName }) : t("guest")}`
                              : ""}
                      </span>
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="size-10"
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                      aria-label={t("moveUp", { name: p.name })}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="size-10"
                      disabled={i === players.length - 1}
                      onClick={() => move(i, 1)}
                      aria-label={t("moveDown", { name: p.name })}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="size-10"
                      onClick={() => setPlayers((current) => current.filter((o) => o.key !== p.key))}
                      aria-label={t("remove", { name: p.name })}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
                <select
                  aria-label={t("leader", { name: p.name })}
                  className="h-11 w-full rounded-md border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  value={p.leader ?? ""}
                  onChange={(e) =>
                    update(p.key, { leader: e.target.value === "" ? null : (e.target.value as ArnakLeader) })
                  }
                >
                  <option value="">{t("noLeader")}</option>
                  {ARNAK_LEADERS.map((leader) => (
                    <option key={leader} value={leader} disabled={takenByOthers.has(leader)}>
                      {ARNAK_LEADER_STYLES[leader].emoji} {tGame(`leaders.${leader}`)}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ol>
        {players.length < MAX_PLAYERS ? (
          <PlayerPicker
            addable={addable}
            chosen={players}
            onPick={(p) => setPlayers((current) => [...current, fromAddable(p)])}
            onCreateGuest={(name) =>
              setPlayers((current) => [
                ...current,
                {
                  key: crypto.randomUUID(),
                  name,
                  isGuest: true,
                  isMe: false,
                  ownerName: null,
                  leader: null,
                  scores: emptyScores(),
                },
              ])
            }
          />
        ) : (
          <p className="type-caption text-ink-muted">{t("maxPlayers")}</p>
        )}
      </section>

      {players.length > 0 && (
        <section className="flex flex-col gap-5">
          <PaintedBand>{t("pointsSection")}</PaintedBand>
          <ScoreGrid players={players} totals={totals} onChange={(key, scores) => update(key, { scores })} />
          {tiedKeys.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-ink-body">
                {t("tiebreakQuestion", { points: Math.max(...totals) })}
              </legend>
              {[...tiedKeys, null].map((key) => (
                <label key={key ?? "none"} className="flex min-h-11 items-center gap-3">
                  <input
                    type="radio"
                    name="tiebreak"
                    className="size-5 accent-primary"
                    checked={tiebreakWinner === key}
                    onChange={() => setTiebreakKey(key)}
                  />
                  {key ? players.find((p) => p.key === key)!.name : t("tiebreakNone")}
                </label>
              ))}
            </fieldset>
          )}
        </section>
      )}

      {/* Save stays in reach while scrolling through a long form on a phone. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {state.status === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {t(`errors.${state.error}`)}
            </p>
          )}
          {players.length < 2 && <p className="text-sm text-ink-muted">{t("needTwoPlayers")}</p>}
          <Button type="submit" className="h-11 text-base" disabled={!canSave || pending}>
            {t("save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

function PlayerPicker({
  addable,
  chosen,
  onPick,
  onCreateGuest,
}: {
  addable: AddablePlayer[];
  chosen: FormPlayer[];
  onPick: (player: AddablePlayer) => void;
  onCreateGuest: (name: string) => void;
}) {
  const t = useTranslations("LogMatch");
  const hintId = useId();
  const [query, setQuery] = useState("");
  const name = query.trim().replace(/\s+/g, " ");
  const needle = name.toLowerCase();

  const available = addable.filter((p) => !chosen.some((c) => c.playerId === p.id));
  const options = available.filter((p) => needle === "" || p.name.toLowerCase().includes(needle)).slice(0, 6);
  // Offer a new guest only for a new name: reuse existing guests instead of
  // duplicating them, and don't shadow someone already in this match.
  const exists = [...addable, ...chosen].some((p) => p.name.toLowerCase() === needle);

  function done() {
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="player-search">{t("addPlayer")}</Label>
      <Input
        id="player-search"
        className="h-11"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-describedby={hintId}
      />
      <p id={hintId} className="text-sm text-ink-muted">
        {t("addPlayerHint")}
      </p>
      <ul className="flex flex-col gap-1">
        {options.map((p) => (
          <li key={p.id}>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-start text-base"
              onClick={() => {
                onPick(p);
                done();
              }}
            >
              {p.name}
              {p.is_guest && (
                <span className="text-sm text-ink-muted">
                  {p.owner_name ? t("guestOf", { owner: p.owner_name }) : t("guest")}
                </span>
              )}
            </Button>
          </li>
        ))}
        {needle !== "" && !exists && name.length <= 50 && (
          <li>
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-start border-dashed text-base"
              onClick={() => {
                onCreateGuest(name);
                done();
              }}
            >
              {t("createGuest", { name })}
            </Button>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Categories as rows and players as columns, like Arnak's paper score pad. */
function ScoreGrid({
  players,
  totals,
  onChange,
}: {
  players: FormPlayer[];
  totals: number[];
  onChange: (key: string, scores: FormPlayer["scores"]) => void;
}) {
  const t = useTranslations("LogMatch");
  const tGame = useTranslations("Games.arnak");

  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th scope="col" className="w-24" />
            {players.map((p) => (
              <th scope="col" key={p.key} className="truncate px-1 pb-2 text-center text-sm font-semibold">
                {p.leader && <span aria-hidden>{ARNAK_LEADER_STYLES[p.leader].emoji} </span>}
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ARNAK_SCORE_CATEGORIES.map((category) => {
            const label = category === "fear" ? t("fearCount") : tGame(`scoreCategories.${category}`);
            return (
              <tr key={category} className="border-b">
                <th scope="row" className="py-1 pr-2 text-left text-sm font-medium">
                  {label}
                </th>
                {players.map((p) => (
                  <td key={p.key} className="p-1">
                    <Input
                      className="h-11 px-1 text-center"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={3}
                      placeholder="0"
                      aria-label={t("scoreFor", { category: label, name: p.name })}
                      value={p.scores[category]}
                      onChange={(e) =>
                        onChange(p.key, { ...p.scores, [category]: e.target.value.replace(/\D/g, "") })
                      }
                    />
                  </td>
                ))}
              </tr>
            );
          })}
          <tr>
            <th scope="row" className="pt-3 pr-2 text-left type-body-strong">
              {t("total")}
            </th>
            {totals.map((value, i) => (
              <td key={players[i].key} className="type-stat-lg pt-3 text-center" aria-live="polite">
                {value}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="type-caption mt-3 text-ink-muted">{t("fearHint")}</p>
    </div>
  );
}
