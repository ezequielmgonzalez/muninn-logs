import { findFacts } from "@/features/facts/facts";
import { listMatches } from "@/features/matches/queries";
import { getCurrentProfile } from "@/lib/auth";

/**
 * The crow's facts (DidYouKnow), from the games the user can see (RLS decides
 * which). A GET, not a Server Action: a page runs one action at a time, so
 * the crow would hold up the first thing the user does. The latest 250
 * games: at four players each, their results stay within one PostgREST page
 * (1000 rows).
 */
export async function GET() {
  if (!(await getCurrentProfile())) return Response.json([], { status: 401 });
  return Response.json(findFacts(await listMatches(250)), { headers: { "Cache-Control": "private, no-store" } });
}
