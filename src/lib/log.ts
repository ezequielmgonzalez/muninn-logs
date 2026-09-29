/**
 * Logs an error the user only sees as "something went wrong", so its real
 * cause shows up in the server logs (Vercel → Logs). Only the error's code and
 * message are logged, never form data, which may hold emails or names.
 */
export function logUnexpected(context: string, error: { code?: string; message?: string }) {
  console.error(`[${context}] unexpected error`, { code: error.code, message: error.message });
}
