import { type Browser, expect, type Page, test } from "@playwright/test";

import { signUp } from "../helpers/auth";
import { befriend } from "../helpers/friends";
import { addGuest, fillScores, saveMatch } from "../helpers/matches";

// Comparar's "Cara a cara", behind FEATURE_COMPARE_HEAD_TO_HEAD (on for this
// server: playwright.config.ts). Without the flag Comparar keeps its grouped
// bars (compare.spec.ts).

async function friendWhoWins(browser: Browser, request: Parameters<typeof signUp>[1], ana: Page, name: string, research: number) {
  const page = await browser.newPage();
  const { username } = await signUp(page, request, name);
  await befriend(ana, "Ana", page, username);
  // One game each against a guest, with a different research score.
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await fillScores(page, name, [research, 0, 0, 0, 10, 0]);
  await fillScores(page, "Jessi", [1, 0, 0, 0, 1, 0]);
  await saveMatch(page);
  await page.close();
  return username;
}

test("Cara a cara replaces the grouped bars; friends you never played with say so", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  const beto = await friendWhoWins(browser, request, page, "Beto", 12);
  const carla = await friendWhoWins(browser, request, page, "Carla", 8);

  await page.goto(`/es/compare?with=${beto}&with=${carla}`);
  await expect(page.getByRole("heading", { name: "Puntos por categoría" })).toHaveCount(0);
  const headToHead = page.locator("[data-head-to-head]");
  await expect(headToHead.getByRole("heading", { name: "Cara a cara" })).toBeVisible();
  await expect(headToHead.getByRole("listitem")).toHaveText([/Vos — Beto\s*Todavía no jugaron juntos\./, /Vos — Carla\s*Todavía no jugaron juntos\./]);
  await expect(headToHead.locator("[data-brush-bar]")).toHaveCount(0);
  await expect(headToHead.getByText(/en la mesa/)).toHaveCount(0);
});

test("each duel counts the games played together; its note follows the Partidas select", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  // Beto wins a game of his own, then loses the one he plays with Ana.
  const beto = await friendWhoWins(browser, request, page, "Beto", 12);
  const carla = await friendWhoWins(browser, request, page, "Carla", 8);
  await page.goto("/es/matches/new");
  await page.getByLabel("Agregar jugador").fill("Beto");
  await page.getByRole("button", { name: /^Beto/ }).click();
  await fillScores(page, "Ana", [20, 0, 0, 0, 10, 0]);
  await fillScores(page, "Beto", [5, 0, 0, 0, 5, 0]);
  await saveMatch(page);
  const duel = page.locator("[data-head-to-head]").getByRole("listitem");

  // Their one game together, which Ana finished higher in. The note uses the table's
  // averages: research 20 vs (12 + 5) / 2, cards 10 vs 7,5, the rest even.
  await page.goto(`/es/compare?with=${beto}`);
  await expect(duel).toHaveText([/^Vos 1 — 0 Beto\s*1 partida juntos\s*Le sacás 11,5 en Investigación$/]);

  // Only the games together: the duel doesn't change; its note does (20 vs 5).
  await page.getByLabel("Partidas").selectOption("together");
  await page.getByRole("button", { name: "Comparar" }).click();
  await expect(page).toHaveURL(new RegExp(`with=${beto}.*scope=together`));
  await expect(duel).toHaveText([/^Vos 1 — 0 Beto\s*1 partida juntos\s*Le sacás 15,0 en Investigación$/]);

  // Carla never sat at Ana's table.
  await page.goto(`/es/compare?with=${carla}&scope=together`);
  await expect(duel).toHaveText([/Todavía no jugaron juntos\./]);
});

test("with two or more friends, the games all of you played and who won them", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  const beto = await friendWhoWins(browser, request, page, "Beto", 12);
  const carla = await friendWhoWins(browser, request, page, "Carla", 8);
  // All three at one table: Carla wins, Ana second, Beto third.
  await page.goto("/es/matches/new");
  for (const name of ["Beto", "Carla"]) {
    await page.getByLabel("Agregar jugador").fill(name);
    await page.getByRole("button", { name: new RegExp(`^${name}`) }).click();
  }
  await fillScores(page, "Ana", [10, 0, 0, 0, 0, 0]);
  await fillScores(page, "Beto", [5, 0, 0, 0, 0, 0]);
  await fillScores(page, "Carla", [15, 0, 0, 0, 0, 0]);
  await saveMatch(page);

  await page.goto(`/es/compare?with=${beto}&with=${carla}`);
  const headToHead = page.locator("[data-head-to-head]");
  await expect(headToHead.getByRole("listitem").nth(0)).toContainText("Vos 1 — 0 Beto");
  await expect(headToHead.getByRole("listitem").nth(1)).toContainText("Vos 0 — 1 Carla");
  await expect(headToHead.getByText("Los tres en la mesa")).toBeVisible();
  await expect(headToHead).toContainText(/1 partida\s*Carla ganó 1\s*Vos 0\s*Beto 0/);
});
