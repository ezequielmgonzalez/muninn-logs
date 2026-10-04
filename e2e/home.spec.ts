import { expect, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

test("home is a dashboard: a summary and the latest games", async ({ page, request }) => {
  await signUp(page, request, "Ana");

  // Nothing played yet.
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Diario de Ana");
  await expect(page.getByText("0 expediciones registradas").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("Todavía no hay partidas en tu diario.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Últimas partidas" })).toHaveCount(0);

  await page.getByRole("link", { name: "Cargar partida" }).click();
  await addGuest(page, "Jessi");
  await fillScores(page, "Ana", [10, 6, 9, 5, 14, 2]);
  await fillScores(page, "Jessi", [5, 2, 3, 0, 10, 0]);
  await saveMatch(page);

  await page.goto("/es");
  await expect(page.getByText("1 expedición registrada").filter({ visible: true })).toBeVisible();
  const summary = page.getByRole("definition");
  await expect(summary.nth(0)).toHaveText(/^100\s%$/); // Win Rate
  await expect(summary.nth(1)).toHaveText("1"); // Lugar promedio
  await expect(summary.nth(2)).toHaveText("1"); // Partidas

  await expect(page.getByRole("heading", { name: "Últimas partidas" })).toBeVisible();
  await page.getByRole("link", { name: /Ganó Ana/ }).click();
  await expect(page).toHaveURL(/\/es\/matches\/[0-9a-f-]{36}$/);
});

test("without FEATURE_DID_YOU_KNOW, the crow is a faint mark and tells nothing", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Diario de Ana");
  await expect(page.getByRole("region", { name: "¿Sabías que…?" })).toHaveCount(0);
  // Signed in, and still nothing: the facts are off (on: e2e/flagged/did-you-know.spec.ts).
  expect((await page.request.get("/api/facts")).status()).toBe(404);
});
