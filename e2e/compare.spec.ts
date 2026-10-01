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

  // The same averages as grouped bars, each named with its value for screen readers.
  await expect(page.getByRole("heading", { name: "Puntos por categoría" })).toBeVisible();
  const research = page.getByRole("listitem").filter({ has: page.getByText("Investigación", { exact: true }) });
  await expect(research).toContainText("Beto: 12");
  await expect(research).toContainText("Vos: 2");
});
