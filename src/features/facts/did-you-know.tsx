"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useState } from "react";

import { CrowMark } from "@/components/notebook/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { loadFacts } from "./actions";
import type { Fact, Person } from "./facts";

// "¿Sabías que…?": Muninn, the crow, tells a fact about the group's games in a
// speech bubble drawn in pen, and another one with "Otro dato". On desktop it
// stands at the foot of the insert; on phones, at the end of Inicio. The facts
// load once the crow is on screen, in a random order.

const DESKTOP = "(min-width: 1200px)";

export function DidYouKnow({ placement, className }: { placement: "insert" | "page"; className?: string }) {
  const t = useTranslations("Facts");
  const id = useId();
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // Both crows are in the page at once (CSS shows one): only the one on screen asks.
    if (window.matchMedia(DESKTOP).matches !== (placement === "insert")) return;
    let live = true;
    loadFacts()
      .then((list) => live && setFacts(shuffle(list)))
      .catch(() => live && setFacts([]));
    return () => {
      live = false;
    };
  }, [placement]);

  const fact = facts?.[index % facts.length];
  return (
    <section
      aria-labelledby={id}
      className={cn(
        placement === "insert" ? "relative pl-[70px]" : "flex flex-col items-start notebook:hidden",
        className,
      )}
    >
      {facts && (
        <div
          className={cn(
            "relative px-4 pt-3 pb-1.5 before:ink before:ink--pen-box before:-inset-1 before:bg-ink",
            placement === "insert" ? "absolute right-[30px] bottom-[calc(100%+14px)] left-[-32px]" : "mb-4 w-full",
          )}
        >
          <h2 id={id} className="type-overline m-0 text-ink-muted">
            {t("title")}
          </h2>
          {/* A new fact is read out; it fades in where the last one was. */}
          <p key={index} aria-live="polite" className="m-0 mt-1 animate-in text-[15px] leading-snug text-ink-body fade-in motion-reduce:animate-none">
            {fact ? <FactText fact={fact} /> : t("empty")}
          </p>
          <p className="m-0 flex min-h-11 justify-end">
            {facts.length > 1 && (
              <Button variant="link" size="sm" onClick={() => setIndex((i) => i + 1)}>
                {t("next")} →
              </Button>
            )}
          </p>
          {/* The bubble's tail, down to the crow's beak. */}
          <svg
            aria-hidden
            viewBox="0 0 24 18"
            className={cn("absolute top-full -mt-px h-[18px] w-6 text-ink", placement === "insert" ? "left-[118px]" : "left-[44px]")}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
          >
            <path d="M3 1.5C5.4 6.2 5.6 11.6 2.2 16.6C8.6 13.4 13.6 8.4 17.6 1.8" />
          </svg>
        </div>
      )}
      <CrowMark width={placement === "insert" ? 96 : 72} className={cn("text-ink", facts ? "opacity-80" : "opacity-16")} />
    </section>
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
