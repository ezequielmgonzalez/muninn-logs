"use server";

import { listMatches } from "@/features/matches/queries";
import { getCurrentProfile } from "@/lib/auth";

import { type Fact, findFacts } from "./facts";

/**
 * The crow's facts, from the games the user can see (RLS decides which).
 * The latest 250: at four players each, their results stay within one
 * PostgREST page (1000 rows).
 */
export async function loadFacts(): Promise<Fact[]> {
  if (!(await getCurrentProfile())) return [];
  return findFacts(await listMatches(250));
}
