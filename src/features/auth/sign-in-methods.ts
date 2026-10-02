/**
 * How people sign in. Production is Google only; local runs, tests and
 * preview deployments also offer an emailed code (e2e tests sign in with
 * it). If Google were ever turned off, the code stays, so nobody is locked out.
 */
export function signInMethods(
  env: { vercelEnv?: string; googleEnabled?: string } = {
    vercelEnv: process.env.VERCEL_ENV,
    googleEnabled: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED,
  },
) {
  const google = env.googleEnabled === "true";
  return { google, email: env.vercelEnv !== "production" || !google };
}
