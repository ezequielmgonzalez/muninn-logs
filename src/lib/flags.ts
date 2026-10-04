import "server-only";

// Feature flags: features that ship turned off until someone turns them on,
// per environment, with an environment variable (Vercel: Settings →
// Environment Variables, then redeploy; locally: .env.local). Read on every
// request, so a flag only needs to be "true" where the server runs.

const FLAGS = {
  /** Comparar's "Cara a cara" in place of "Puntos por categoría" (design/updates/2026-10-rankings-comparar). */
  compareHeadToHead: "FEATURE_COMPARE_HEAD_TO_HEAD",
  /** "¿Sabías que…?": the crow tells facts about the group's games (src/features/facts). */
  didYouKnow: "FEATURE_DID_YOU_KNOW",
} as const;

export type Flag = keyof typeof FLAGS;

/** Whether a feature is on: only when its variable is exactly "true". */
export function isEnabled(flag: Flag): boolean {
  return process.env[FLAGS[flag]] === "true";
}
