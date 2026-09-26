import { type APIRequestContext, expect, type Page } from "@playwright/test";

// Mailpit catches every email the local Supabase stack sends.
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function uniqueEmail() {
  return `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export function uniqueUsername() {
  return `e2e_${Math.random().toString(36).slice(2, 12)}`;
}

/**
 * Waits for a sign-in email sent to `email` after `since` and returns its
 * 6-digit code. `since` skips codes from earlier sign-ins of the same user.
 */
export async function readSignInCode(request: APIRequestContext, email: string, since: Date) {
  let code: string | undefined;
  await expect
    .poll(
      async () => {
        const search = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${email}"` },
        });
        const { messages } = (await search.json()) as {
          messages: { ID: string; Created: string }[];
        };
        const latest = messages
          .filter((m) => new Date(m.Created) >= since)
          .sort((a, b) => b.Created.localeCompare(a.Created))[0];
        if (!latest) return undefined;
        const message = await request.get(`${MAILPIT_URL}/api/v1/message/${latest.ID}`);
        code = (await message.json()).Text.match(/\b\d{6}\b/)?.[0];
        return code;
      },
      { message: `sign-in code emailed to ${email}` },
    )
    .toBeTruthy();
  return code!;
}

/** Signs in with an emailed code, starting from the Spanish login page. */
export async function signInWithCode(page: Page, request: APIRequestContext, email: string) {
  await page.goto("/es/login");
  await page.getByLabel("Email").fill(email);
  // Mailpit timestamps have second precision; allow for clock rounding.
  const sentAt = new Date(Date.now() - 1000);
  const codeInput = page.getByLabel("Código");
  // Supabase allows one email per user per second (max_frequency), and a test
  // can sign the same user in again faster than that. Retry like a user would.
  await expect(async () => {
    await page.getByRole("button", { name: "Enviar código" }).click();
    await expect(codeInput).toBeVisible({ timeout: 1000 });
  }).toPass();
  await codeInput.fill(await readSignInCode(request, email, sentAt));
  await page.getByRole("button", { name: "Entrar" }).click();
}

/** Completes onboarding with the given username. */
export async function chooseUsername(page: Page, username: string) {
  await page.getByLabel("Nombre de usuario").fill(username);
  await page.getByRole("button", { name: "Continuar" }).click();
}

/** An error shown by a form. Excludes Next.js's route announcer, which also has role="alert". */
export function formError(page: Page) {
  return page.locator("p[role=alert]");
}
