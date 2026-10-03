import { type Browser, expect, type Page, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

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

test("compares you with several friends at once, marking who does best", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  // Ana loses her only game; Beto and Carla win theirs.
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await fillScores(page, "Ana", [2, 0, 0, 0, 1, 0]);
  await fillScores(page, "Jessi", [9, 0, 0, 0, 9, 0]);
  await saveMatch(page);

  await friendWhoWins(browser, request, page, "Beto", 12);
  await friendWhoWins(browser, request, page, "Carla", 8);

  await page.goto("/es/friends");
  await page.getByRole("link", { name: "Comparar con varios amigos →" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comparar");
  await page.getByText("Beto", { exact: true }).click();
  await page.getByText("Carla", { exact: true }).click();
  await page.getByRole("button", { name: "Comparar" }).click();

  await expect(page).toHaveURL(/\/es\/compare\?with=.+&with=.+/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vos vs. Beto y Carla");
  await expect(page.getByRole("columnheader")).toHaveText(["Estadística", "Vos", "Beto", "Carla"]);

  // Win rate: Beto and Carla tie at 100 %, both marked; Ana's 0 % isn't.
  const cells = (name: RegExp) => page.getByRole("row", { name }).getByRole("cell");
  await expect(cells(/^Win Rate/).nth(0)).not.toContainText("el mejor");
  await expect(cells(/^Win Rate/).nth(1)).toContainText("el mejor");
  await expect(cells(/^Win Rate/).nth(2)).toContainText("el mejor");

  // Research: Beto's 12 alone is the best.
  await expect(cells(/^Investigación/).nth(1)).toContainText("12");
  await expect(cells(/^Investigación/).nth(1)).toContainText("el mejor");
  await expect(cells(/^Investigación/).nth(2)).not.toContainText("el mejor");

  // No grouped bars any more: Cara a cara instead. Ana never played with either of them.
  await expect(page.getByRole("heading", { name: "Puntos por categoría" })).toHaveCount(0);
  const headToHead = page.locator("[data-head-to-head]");
  await expect(headToHead.getByRole("heading", { name: "Cara a cara" })).toBeVisible();
  await expect(headToHead.getByRole("listitem")).toHaveText([/Vos — Beto\s*Todavía no jugaron juntos\./, /Vos — Carla\s*Todavía no jugaron juntos\./]);
  await expect(headToHead.locator("[data-brush-bar]")).toHaveCount(0);
  await expect(headToHead.getByText(/en la mesa/)).toHaveCount(0);
});

test("compares only the games played together, when asked", async ({ page, request, browser }) => {
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

  const games = (cell: number) => page.getByRole("row", { name: /^Partidas/ }).getByRole("cell").nth(cell);
  const duel = page.locator("[data-head-to-head]").getByRole("listitem");
  const winRate = (cell: number) => page.getByRole("row", { name: /^Win Rate/ }).getByRole("cell").nth(cell);

  // Each person's games: Beto has two, and won one.
  await page.goto(`/es/compare?with=${beto}`);
  await expect(page.getByLabel("Partidas")).toHaveValue("all");
  await expect(games(1)).toHaveText("2");
  await expect(winRate(1)).toContainText(/50\s%/);
  // Cara a cara: their one game together, which Ana finished higher in. The note uses
  // the table's averages: research 20 vs (12 + 5) / 2, cards 10 vs 7,5, the rest even.
  await expect(duel).toHaveText([/^Vos 1 — 0 Beto\s*1 partida juntos\s*Le sacás 11,5 en Investigación$/]);

  // Only the game they played together: Ana won it, Beto didn't.
  await page.getByLabel("Partidas").selectOption("together");
  await page.getByRole("button", { name: "Comparar" }).click();
  await expect(page).toHaveURL(new RegExp(`with=${beto}.*scope=together`));
  await expect(games(0)).toHaveText("1");
  await expect(games(1)).toHaveText("1");
  await expect(winRate(0)).toContainText(/100\s%/);
  await expect(winRate(1)).toContainText(/0\s%/);
  await expect(page.getByText("Solo la partida en que jugaron todos juntos.")).toBeVisible();
  // The duel doesn't change; its note follows the select (20 vs 5 now).
  await expect(duel).toHaveText([/^Vos 1 — 0 Beto\s*1 partida juntos\s*Le sacás 15,0 en Investigación$/]);

  // Carla never sat at Ana's table: nothing to compare, and why.
  await page.goto(`/es/compare?with=${carla}&scope=together`);
  await expect(page.getByRole("status")).toHaveText(
    "Todavía no jugaron todos juntos. Elegí menos amigos, o mirá todas las partidas de cada uno.",
  );
  await expect(page.getByRole("table")).toHaveCount(0);
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
