"use client";

import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useActionState, useEffect, useId, useState } from "react";

import { ArrowDownIcon, ArrowUpIcon, CloseIcon, PlusIcon, SearchIcon } from "@/components/notebook/icons";
import { InkButton } from "@/components/notebook/ink-button";
import { NativeSelect } from "@/components/notebook/native-select";
import { NotebookPage } from "@/components/notebook/notebook-page";
import { PaintedBand } from "@/components/notebook/painted-band";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ARNAK_BOARD_SIDES,
  ARNAK_CATEGORY_TONES,
  ARNAK_LEADER_STYLES,
  ARNAK_LEADERS,
  ARNAK_SCORE_CATEGORIES,
  type ArnakBoardSide,
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
  boardSide: ArnakBoardSide | null;
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

export function LogMatchForm({
  addable,
  initial,
  title,
}: {
  addable: AddablePlayer[];
  initial?: InitialMatch;
  /** The left page's title: "Nueva partida" or "Editar partida". */
  title: string;
}) {
  const t = useTranslations("LogMatch");
  const locale = useLocale();
  const [state, action, pending] = useActionState(saveMatch, idle);

  const me = addable.find((p) => p.is_me);
  const [players, setPlayers] = useState<FormPlayer[]>(
    () => initial?.players ?? (me ? [fromAddable(me)] : []),
  );
  const [playedOn, setPlayedOn] = useState(initial?.playedOn ?? "");
  const [boardSide, setBoardSide] = useState<ArnakBoardSide | null>(initial?.boardSide ?? null);
  const [duration, setDuration] = useState(initial?.durationMinutes?.toString() ?? "");
  const [tiebreakKey, setTiebreakKey] = useState<string | null>(initial?.tiebreakKey ?? null);

  // New games default to today, set on the client (the server doesn't know
  // the player's time zone). Never when editing: an undated game stays undated.
  const isNew = !initial;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only default
    if (isNew) setPlayedOn((current) => current || localToday());
  }, [isNew]);

  const totals = players.map((p) => total(numericScores(p.scores)));
  // Only ask about a tie once every player has scores, not while all are 0.
  const everyoneScored = players.every((p) => ARNAK_SCORE_CATEGORIES.some((c) => p.scores[c] !== ""));
  const tiedKeys = everyoneScored ? tiedForFirst(totals).map((i) => players[i].key) : [];
  const tiebreakWinner = tiedKeys.includes(tiebreakKey ?? "") ? tiebreakKey : null;

  const payload: LogMatchInput = {
    playedOn: playedOn === "" ? null : playedOn,
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

  // "2 jugadores · va ganando Manuela con 70", above the save button.
  const summaryPlayers = t("summaryPlayers", { count: players.length });
  const best = Math.max(0, ...totals);
  const leaders = players.filter((_, i) => totals[i] === best);
  const anyScored = players.some((p) => ARNAK_SCORE_CATEGORIES.some((c) => p.scores[c] !== ""));
  const summary =
    players.length < 2
      ? t("needTwoPlayers")
      : !anyScored
        ? summaryPlayers
        : leaders.length > 1
          ? t("summaryTied", { players: summaryPlayers, points: best })
          : t("summaryLeading", { players: summaryPlayers, name: leaders[0].name, points: best });

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

  const saveArea = (
    <>
      {state.status === "error" && (
        <p role="alert" className="mb-3 text-center text-sm text-destructive">
          {t(`errors.${state.error}`)}
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
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      {initial && <input type="hidden" name="matchId" value={initial.matchId} />}

      <NotebookPage side="left">
        <PaintedBand as="h1">{title}</PaintedBand>
        <div className="mt-5.5 flex flex-col gap-5.5">
          <div>
            <Label htmlFor="played-on">{t("date")}</Label>
            <Input
              id="played-on"
              type="date"
              value={playedOn}
              max={localToday()}
              onChange={(e) => setPlayedOn(e.target.value)}
              aria-describedby="played-on-hint"
            />
            <p id="played-on-hint" className="type-caption mt-1.5 text-ink-muted">
              {t("dateHint")}
            </p>
          </div>
          <div>
            <p id="board-side" className="type-label mb-2">
              {t("boardSide")}
            </p>
            <div role="group" aria-labelledby="board-side" className="grid grid-cols-3 gap-2.5">
              {[null, ...ARNAK_BOARD_SIDES].map((side) => (
                <BrushToggle key={side ?? "none"} pressed={boardSide === side} onClick={() => setBoardSide(side)}>
                  {side ? t(side) : t("notRecorded")}
                </BrushToggle>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="duration" className="gap-0">
              {t("duration")} <span className="font-normal text-ink-muted">{t("optional")}</span>
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
                {t("durationUnit")}
              </span>
            </div>
          </div>
        </div>

        <PaintedBand variant={2} flip className="mt-8.5 mb-4.5">
          {t("playersSection")}
        </PaintedBand>
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
      </NotebookPage>

      <NotebookPage side="right">
        <PaintedBand>{t("tableSection")}</PaintedBand>
        <ol className="mt-1 flex flex-col">
          {players.map((p, i) => (
            <PlayerCard
              key={p.key}
              player={p}
              turn={i + 1}
              total={totals[i]}
              takenLeaders={new Set(players.filter((o) => o.key !== p.key).map((o) => o.leader))}
              onChange={(change) => update(p.key, change)}
              onMoveUp={i > 0 ? () => move(i, -1) : undefined}
              onMoveDown={i < players.length - 1 ? () => move(i, 1) : undefined}
              onRemove={() => setPlayers((current) => current.filter((o) => o.key !== p.key))}
            />
          ))}
        </ol>
        {players.length > 0 && <p className="type-caption mt-3 text-ink-muted">{t("fearHint")}</p>}

        {tiedKeys.length > 0 && (
          <fieldset className="mt-5.5 flex flex-col">
            <legend className="mb-2 text-ink-body">{t("tiebreakQuestion", { points: Math.max(...totals) })}</legend>
            {[...tiedKeys, null].map((key) => (
              <label key={key ?? "none"} className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="tiebreak"
                  className="size-5 accent-ink"
                  checked={tiebreakWinner === key}
                  onChange={() => setTiebreakKey(key)}
                />
                {key ? players.find((p) => p.key === key)!.name : t("tiebreakNone")}
              </label>
            ))}
          </fieldset>
        )}

        {/* Desktop: saving closes the right page. Phones have the save bar instead. */}
        <div className="mt-4.5 hidden notebook:block">{saveArea}</div>
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

/** A choice among a few, painted when pressed (design/components/FormFields.md). */
function BrushToggle({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="relative flex h-11 cursor-pointer items-center justify-center border-b-[1.5px] border-ink-body/30 text-[15px] text-ink-body outline-none focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze aria-pressed:border-transparent aria-pressed:text-band-text"
    >
      {pressed && <span aria-hidden className="ink ink--tab -inset-x-1.5 -inset-y-[3px] bg-ink" />}
      <span className="relative z-2">{children}</span>
    </button>
  );
}

/** One player at the table: turn, leader, the computed total and a score per category. */
function PlayerCard({
  player: p,
  turn,
  total,
  takenLeaders,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  player: FormPlayer;
  turn: number;
  total: number;
  takenLeaders: Set<ArnakLeader | null>;
  onChange: (change: Partial<FormPlayer>) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("LogMatch");
  const tGame = useTranslations("Games.arnak");
  const who = p.isMe
    ? t("you")
    : !p.playerId
      ? t("newGuest")
      : p.isGuest
        ? p.ownerName
          ? t("guestOf", { owner: p.ownerName })
          : t("guest")
        : null;

  return (
    <li className="border-b border-ink-body/18 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="type-overline m-0 text-ink-muted">{t("turn", { n: turn })}</p>
          <p className="m-0 truncate text-base">
            <b className="font-bold">{p.name}</b>
            {who && <span className="text-ink-muted"> · {who}</span>}
          </p>
        </div>
        {onMoveUp && (
          <Button type="button" variant="ghost" size="icon" onClick={onMoveUp} aria-label={t("moveUp", { name: p.name })}>
            <ArrowUpIcon />
          </Button>
        )}
        {onMoveDown && (
          <Button type="button" variant="ghost" size="icon" onClick={onMoveDown} aria-label={t("moveDown", { name: p.name })}>
            <ArrowDownIcon />
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={t("remove", { name: p.name })}>
          <CloseIcon />
        </Button>
      </div>
      <div className="mt-1.5 flex items-end gap-3.5">
        <NativeSelect
          className="flex-1"
          aria-label={t("leader", { name: p.name })}
          value={p.leader ?? ""}
          onChange={(e) => onChange({ leader: e.target.value === "" ? null : (e.target.value as ArnakLeader) })}
        >
          <option value="">{t("noLeader")}</option>
          {ARNAK_LEADERS.map((leader) => (
            <option key={leader} value={leader} disabled={takenLeaders.has(leader)}>
              {ARNAK_LEADER_STYLES[leader].emoji} {tGame(`leaders.${leader}`)}
            </option>
          ))}
        </NativeSelect>
        <p className="m-0 flex items-baseline gap-1.5 pb-1.5">
          <span aria-hidden className="type-caption text-ink-muted">
            {t("total")}
          </span>
          <output aria-label={t("totalFor", { name: p.name })} aria-live="polite" className="text-xl font-bold">
            {total}
          </output>
        </p>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-x-3.5 gap-y-1.5">
        {ARNAK_SCORE_CATEGORIES.map((category) => {
          const label = tGame(`scoreCategories.${category}`);
          // Fear is typed as the number of fear cards, and says so to screen readers.
          const fullLabel = category === "fear" ? t("fearCount") : label;
          return (
            <label key={category} className="min-w-0">
              <span className="flex items-center gap-[5px] text-xs text-ink-muted">
                <span
                  aria-hidden
                  className="size-[7px] shrink-0 rounded-full"
                  style={{ background: `var(--${ARNAK_CATEGORY_TONES[category]})` }}
                />
                <span className="truncate">{label}</span>
              </span>
              <Input
                className="min-h-[30px] px-0.5 pt-[3px] pb-0.5 text-[17px] font-semibold"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={3}
                placeholder="0"
                aria-label={t("scoreFor", { category: fullLabel, name: p.name })}
                value={p.scores[category]}
                onChange={(e) => onChange({ scores: { ...p.scores, [category]: e.target.value.replace(/\D/g, "") } })}
              />
            </label>
          );
        })}
      </div>
    </li>
  );
}

/** Who can be added: grouped as in the design, shown while typing. */
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

  const me = addable.find((p) => p.is_me);
  const available = addable.filter((p) => !chosen.some((c) => c.playerId === p.id));
  const options = available.filter((p) => needle !== "" && p.name.toLowerCase().includes(needle)).slice(0, 6);
  // Offer a new guest only for a new name: reuse existing guests instead of
  // duplicating them, and don't shadow someone already in this match.
  const exists = [...addable, ...chosen].some((p) => p.name.toLowerCase() === needle);
  const canCreate = needle !== "" && !exists && name.length <= 50;

  const groups = [
    { label: t("groupFriends"), players: options.filter((p) => !p.is_guest) },
    { label: t("groupYourGuests"), players: options.filter((p) => p.is_guest && p.owner_name === me?.name) },
    { label: t("groupOtherGuests"), players: options.filter((p) => p.is_guest && p.owner_name !== me?.name) },
  ].filter((g) => g.players.length > 0);

  function pick(action: () => void) {
    action();
    setQuery("");
  }

  return (
    <div>
      <Label htmlFor="player-search">{t("addPlayer")}</Label>
      <div className="relative">
        <Input
          id="player-search"
          className="pr-8"
          autoComplete="off"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          aria-describedby={hintId}
        />
        <SearchIcon className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-ink-muted" />
      </div>
      {(groups.length > 0 || canCreate) && (
        <div role="group" aria-label={t("suggestions")} className="relative z-3 mt-1 rounded-sm bg-surface-pop py-1.5 shadow-pop">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="type-overline m-0 px-4 pt-2 pb-1 text-[10px] tracking-[0.14em] text-ink-muted">{group.label}</p>
              {group.players.map((p) => (
                <SuggestionButton key={p.id} onClick={() => pick(() => onPick(p))}>
                  <Monogram name={p.name} guest={p.is_guest} />
                  {p.name}
                  {p.is_guest && p.owner_name !== me?.name && p.owner_name && (
                    <small className="type-caption text-ink-muted">· {t("guestOf", { owner: p.owner_name })}</small>
                  )}
                  {p.is_me && <small className="type-caption text-ink-muted">· {t("you")}</small>}
                </SuggestionButton>
              ))}
            </div>
          ))}
          {canCreate && (
            <>
              {groups.length > 0 && <div aria-hidden className="my-1.5 h-px bg-ink-body/14" />}
              <SuggestionButton onClick={() => pick(() => onCreateGuest(name))}>
                <span aria-hidden className="flex w-[30px] justify-center">
                  <PlusIcon />
                </span>
                {t("createGuest", { name })}
              </SuggestionButton>
            </>
          )}
        </div>
      )}
      <p id={hintId} className="type-caption mt-1.5 text-ink-muted">
        {t("addPlayerHint")}
      </p>
    </div>
  );
}

function SuggestionButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[46px] w-full cursor-pointer items-center gap-2.5 px-4 py-1.5 text-left text-[15px] text-ink-body outline-none hover:bg-accent focus-visible:bg-accent"
    >
      {children}
    </button>
  );
}

/** A name's initial in a bronze circle; dashed for guests without an account. */
function Monogram({ name, guest }: { name: string; guest: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[30px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-bronze font-display text-[13px] font-bold text-ink",
        guest && "border-dashed",
      )}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
