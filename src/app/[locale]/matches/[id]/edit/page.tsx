import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";

import { NotebookShell } from "@/components/notebook/notebook-shell";
import { type FormPlayer, LogMatchForm } from "@/features/matches/log-match-form";
import { getMatch } from "@/features/matches/queries";
import { ARNAK_SCORE_CATEGORIES } from "@/games/arnak";
import { redirect } from "@/i18n/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function EditMatchPage({ params }: PageProps<"/[locale]/matches/[id]/edit">) {
  const [profile, locale, t] = await Promise.all([
    getCurrentProfile(),
    getLocale(),
    getTranslations("LogMatch"),
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

  const players: FormPlayer[] = [...match.players]
    .sort((a, b) => a.turnOrder - b.turnOrder)
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

  return (
    // The form brings its own save bar on phones, in place of the tab bar.
    <NotebookShell bottomBar={null}>
      <LogMatchForm
        title={t("editTitle")}
        addable={addable}
        initial={{
          matchId: match.id,
          playedOn: match.playedOn ?? "",
          boardSide: match.boardSide,
          durationMinutes: match.durationMinutes,
          players,
          tiebreakKey: match.players.find((p) => p.wonTiebreak)?.playerId ?? null,
        }}
      />
    </NotebookShell>
  );
}
