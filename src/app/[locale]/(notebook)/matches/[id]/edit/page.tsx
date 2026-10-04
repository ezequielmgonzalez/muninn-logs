import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { LogDuelForm } from "@/features/matches/log-duel-form";
import { type FormPlayer, LogMatchForm } from "@/features/matches/log-match-form";
import { getMatch } from "@/features/matches/queries";
import { ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function EditMatchPage({ params }: PageProps<"/[locale]/matches/[id]/edit">) {
  const [profile, locale, t, tDuel] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("LogMatch"),
    getTranslations("LogDuel"),
  ]);
  if (!profile) return redirect({ href: "/login", locale });
  if (!profile.username) return redirect({ href: "/onboarding", locale });

  const { id } = await params;
  const matchId = z.uuid().safeParse(id);
  const match = matchId.success ? await getMatch(matchId.data) : null;
  // Only whoever logged a match can edit it; to anyone else there's nothing here.
  if (!match || !match.loggedByMe) notFound();

  const supabase = await createClient();
  const { data: addable, error } = await supabase.rpc("list_addable_players");
  if (error) throw error;

  // A duel: its two players, who played Sauron, and the result.
  if (match.game === "lotr-duel") {
    return (
      <LogDuelForm
        title={tDuel("editTitle")}
        addable={addable}
        initial={{
          matchId: match.id,
          playedOn: match.playedOn ?? "",
          durationMinutes: match.durationMinutes,
          players: match.players.map((p) => ({
            key: p.playerId,
            name: p.name,
            playerId: p.playerId,
            isGuest: p.isGuest,
            isMe: p.isMe,
            ownerName: null,
          })),
          sauronKey: match.players.find((p) => p.side === "sauron")?.playerId ?? null,
          result: match.duel?.result ?? null,
          victory: match.duel?.victory ?? null,
        }}
      />
    );
  }

  const players: FormPlayer[] = [...match.players]
    // In turn order when it's known; otherwise as ranked.
    .sort((a, b) => (a.turnOrder ?? 0) - (b.turnOrder ?? 0))
    .map((p) => {
      const scores = match.scores[p.playerId];
      return {
        key: p.playerId,
        name: p.name,
        playerId: p.playerId,
        isGuest: p.isGuest,
        isMe: p.isMe,
        ownerName: null,
        leader: p.leader,
        scores: Object.fromEntries(
          ARNAK_SCORE_CATEGORIES.map((c) => {
            const points = scores?.[c] ?? 0;
            // Fear is stored negative; the form takes the number of fear cards.
            return [c, String(c === "fear" ? 0 - points : points)];
          }),
        ) as FormPlayer["scores"],
      };
    });

  // The form brings its own save bar on phones, in place of the tab bar (sections.ts).
  return (
    <LogMatchForm
      title={t("editTitle")}
      addable={addable}
      initial={{
        matchId: match.id,
        playedOn: match.playedOn ?? "",
        boardSide: match.boardSide,
        durationMinutes: match.durationMinutes,
        turnOrderKnown: match.turnOrderKnown,
        players,
        tiebreakKey: match.players.find((p) => p.wonTiebreak)?.playerId ?? null,
      }}
    />
  );
}
