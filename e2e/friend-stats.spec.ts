import { expect, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { befriend, sendFriendRequest } from "./helpers/friends";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

test("a friend's profile shows their stats, and comparing marks who does better", async ({
  page,
  request,
  browser,
}) => {
  await signUp(page, request, "Ana");
  const beto = await browser.newPage();
  const { username: betoUsername } = await signUp(beto, request, "Beto");
  await befriend(page, "Ana", beto, betoUsername);

  // Ana beats Beto: Ana 1 game, 1 win.
  await page.goto("/es/matches/new");
  await page.getByLabel("Agregar jugador").fill("Beto");
  await page.getByRole("button", { name: "Beto" }).click();
  await fillScores(page, "Ana", [10, 6, 9, 5, 14, 2]); // 42
  await fillScores(page, "Beto", [8, 4, 6, 5, 9, 2]); // 30
  await saveMatch(page);

  // Beto wins a game of his own: Beto 2 games, 1 win.
  await beto.goto("/es/matches/new");
  await addGuest(beto, "Jessi");
  await fillScores(beto, "Beto", [12, 6, 9, 5, 14, 0]);
  await fillScores(beto, "Jessi", [4, 2, 3, 0, 8, 1]);
  await saveMatch(beto);
  await beto.close();

  // From Ana's friends list to Beto's profile.
  await page.goto("/es/friends");
  await page.getByRole("link", { name: "Beto" }).click();
  await expect(page).toHaveURL(`/es/friends/${betoUsername}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Diario de Beto");
  await expect(page.getByText("2 expediciones registradas")).toBeVisible();
  await expect(page.getByRole("img", { name: /^50\s%\sde 2 partidas$/ })).toBeVisible();

  await page.getByRole("link", { name: "Compararme" }).click();
  await expect(page).toHaveURL(`/es/compare?with=${betoUsername}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Vos vs. Beto");

  // Win rate: Ana 100 % (better) vs Beto 50 %.
  const winRate = page.getByRole("row", { name: /^Win Rate/ });
  await expect(winRate.getByRole("cell").nth(0)).toContainText(/100\s%/);
  await expect(winRate.getByRole("cell").nth(0)).toContainText("mejor");
  await expect(winRate.getByRole("cell").nth(1)).toContainText(/50\s%/);
  await expect(winRate.getByRole("cell").nth(1)).not.toContainText("mejor");

  // Games played is context, not a contest.
  const games = page.getByRole("row", { name: /^Partidas/ });
  await expect(games.getByRole("cell").nth(0)).toHaveText("1");
  await expect(games).not.toContainText("mejor");
});

test("someone who isn't your friend has no profile or comparison for you", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  const carla = await browser.newPage();
  const { username: carlaUsername } = await signUp(carla, request, "Carla");
  await carla.close();

  // A pending request makes Carla's profile visible to Ana, but they aren't
  // friends yet: the friendship itself must be checked, not just visibility.
  await sendFriendRequest(page, carlaUsername);

  expect((await page.goto(`/es/friends/${carlaUsername}`))?.status()).toBe(404);

  // Asking to compare with her is ignored: no column, no stats.
  await page.goto(`/es/compare?with=${carlaUsername}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Comparar");
  await expect(page.getByRole("table")).toHaveCount(0);
});
