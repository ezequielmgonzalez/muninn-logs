"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { CrowMark } from "@/components/notebook/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Fact, Person } from "./facts";

// "¿Sabías que…?": Muninn, the crow, tells facts about the group's games in a
// speech bubble drawn in pen, one after another with "Otro dato". On phones
// it stands at the end of Inicio, the bubble open above it. On desktop it
// stands at the foot of the insert, where there's no room for a bubble: a
// small one at its beak opens the facts over the navigation.

const DESKTOP = "(min-width: 1200px)";

/**
 * The facts in a random order, once the crow is on screen: both are in the
 * page and CSS shows one, so each asks when the window is its size.
 */
function useFacts(placement: "insert" | "page") {
  const [facts, setFacts] = useState<Fact[] | null>(null);
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP);
    let live = true;
    let asked = false;
    const ask = () => {
      if (asked || desktop.matches !== (placement === "insert")) return;
      asked = true;
      fetch("/api/facts")
        .then((response) => (response.ok ? (response.json() as Promise<Fact[]>) : []))
        .then((list) => live && setFacts(shuffle(list)))
        .catch(() => live && setFacts([]));
    };
    ask();
    desktop.addEventListener("change", ask);
    return () => {
      live = false;
      desktop.removeEventListener("change", ask);
    };
  }, [placement]);
  return facts;
}

export function DidYouKnow({ placement, className }: { placement: "insert" | "page"; className?: string }) {
  const facts = useFacts(placement);
  return placement === "insert" ? (
    <InsertCrow facts={facts} className={className} />
  ) : (
    <PageCrow facts={facts} className={className} />
  );
}

/** Phones: the bubble open above the crow, its tail at the beak. */
function PageCrow({ facts, className }: { facts: Fact[] | null; className?: string }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className={cn("flex flex-col items-start notebook:hidden", className)}>
      {facts && (
        <div className="relative mb-4 w-full px-4 pt-3 pb-2.5 before:ink before:ink--pen-box before:-inset-1 before:bg-ink">
          <FactCard facts={facts} titleId={id} />
          <Tail className="left-[44px]" />
        </div>
      )}
      <CrowMark width={72} className={cn("text-ink", facts ? "opacity-80" : "opacity-16")} />
    </section>
  );
}

/**
 * Desktop: the crow with a small bubble at its beak, "¿Sabías que…?". It
 * opens the facts in a card above, over the navigation; Esc, a click
 * elsewhere or the bubble again closes it.
 */
function InsertCrow({ facts, className }: { facts: Fact[] | null; className?: string }) {
  const t = useTranslations("Facts");
  const id = useId();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <section ref={root} aria-labelledby={`${id}-toggle`} className={cn("relative flex items-start gap-1 pl-[38px]", className)}>
      <CrowMark width={84} className={cn("shrink-0 text-ink transition-opacity", facts ? "opacity-80" : "opacity-16")} />
      <button
        id={`${id}-toggle`}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-card`}
        disabled={!facts}
        onClick={() => setOpen((o) => !o)}
        className="relative mt-1 cursor-pointer px-3 py-2 text-left text-ink outline-none before:ink before:ink--pen-box before:-inset-0.5 before:bg-ink focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-bronze disabled:cursor-default disabled:opacity-40"
      >
        <span className="type-overline">{t("title")}</span>
      </button>
      {open && facts && (
        <div
          id={`${id}-card`}
          className="absolute bottom-[calc(100%+12px)] left-[26px] z-9 w-[234px] animate-in rounded-sm bg-surface-pop px-4 pt-3 pb-2.5 shadow-pop fade-in slide-in-from-bottom-1 motion-reduce:animate-none"
        >
          <FactCard facts={facts} titleId={`${id}-title`} />
        </div>
      )}
    </section>
  );
}

/** "¿Sabías que…?", the fact, and "Otro dato" when there's another. */
function FactCard({ facts, titleId }: { facts: Fact[]; titleId: string }) {
  const t = useTranslations("Facts");
  const [index, setIndex] = useState(0);
  const fact = facts[index % facts.length];
  return (
    <>
      <h2 id={titleId} className="type-overline m-0 text-ink-muted">
        {t("title")}
      </h2>
      {/* A new fact is read out; it fades in where the last one was. */}
      <p key={index} aria-live="polite" data-fact className="m-0 mt-1 animate-in text-[15px] leading-snug text-ink-body fade-in motion-reduce:animate-none">
        {fact ? <FactText fact={fact} /> : t("empty")}
      </p>
      {facts.length > 1 && (
        <p className="m-0 mt-1 flex justify-end">
          <Button variant="link" size="sm" onClick={() => setIndex((i) => i + 1)}>
            {t("next")} →
          </Button>
        </p>
      )}
    </>
  );
}

/** A speech bubble's tail, drawn in pen down to the crow's beak. */
function Tail({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 18"
      className={cn("absolute top-full -mt-px h-[18px] w-6 text-ink", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
    >
      <path d="M3 1.5C5.4 6.2 5.6 11.6 2.2 16.6C8.6 13.4 13.6 8.4 17.6 1.8" />
    </svg>
  );
}

function FactText({ fact }: { fact: Fact }) {
  const t = useTranslations("Facts");
  const tLeaders = useTranslations("Games.arnak.leaders");
  const tArticles = useTranslations("Rankings.articles");
  const b = (chunks: ReactNode) => <b className="font-semibold text-ink">{chunks}</b>;
  const who = (person: Person) => ({ who: person.isMe ? "me" : "other", name: person.name });
  const pair = (winner: Person, loser: Person) => ({
    winner: winner.isMe ? "me" : "other",
    winnerName: winner.name,
    loser: loser.isMe ? "me" : "other",
    loserName: loser.name,
  });
  const leader = (slug: Parameters<typeof tLeaders>[0], capital = false) => {
    const article = tArticles(slug);
    return { leader: tLeaders(slug), article: capital ? article.charAt(0).toUpperCase() + article.slice(1) : article };
  };

  switch (fact.kind) {
    case "highestScore":
    case "lowestScore":
      return t.rich(fact.kind, { b, ...who(fact.who), points: fact.points });
    case "mostWins":
      return t.rich(fact.kind, { b, ...who(fact.who), wins: fact.wins });
    case "bestAverage":
      return t.rich(fact.kind, { b, ...who(fact.who), average: fact.average });
    case "winlessAtSize":
      return t.rich(fact.kind, { b, ...who(fact.who), games: fact.games, size: fact.size });
    case "neverLeader":
      return t.rich(fact.kind, { b, ...who(fact.who), ...leader(fact.leader) });
    case "favoriteLeader":
      return t.rich(fact.kind, { b, ...who(fact.who), ...leader(fact.leader), count: fact.count, games: fact.games });
    case "leaderBest":
      return t.rich(fact.kind, { b, ...leader(fact.leader, true), wins: fact.wins, games: fact.games });
    case "leaderWinless":
      return t.rich(fact.kind, { b, ...leader(fact.leader, true), games: fact.games });
    case "winStreak":
      return t.rich(fact.kind, { b, ...who(fact.who), count: fact.count });
    case "mostPlayedWith":
      return t.rich(fact.kind, { b, name: fact.who.name, games: fact.games });
    case "rivalry":
      return t.rich(fact.kind, { b, ...pair(fact.winner, fact.loser), games: fact.games });
    case "firstSeat":
      return t.rich(fact.kind, { b, wins: fact.wins, games: fact.games });
    case "topTemple":
      return t.rich(fact.kind, { b, temple: fact.temple, games: fact.games });
    case "biggestWin":
    case "closestGame":
      return t.rich(fact.kind, { b, ...pair(fact.winner, fact.loser), diff: fact.diff });
    case "longestGame":
      return t.rich(fact.kind, { b, minutes: fact.minutes });
  }
}

/** A new order every time the crow comes back (Fisher–Yates). */
function shuffle<T>(items: T[]) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}
