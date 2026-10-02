import { expect, test } from "@playwright/test";

import { notFoundSheet, signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

// A guest's Estadísticas: for their owner and anyone who played with them,
// with no friendship needed (a guest has no account).

test("a guest's stats open from their name, for their owner and whoever played with them", async ({
  page,
  request,
  browser,
}) => {
  await signUp(page, request, "Ana");
  const beto = await browser.newPage();
  const { username: betoUsername } = await signUp(beto, request, "Beto");
  await befriend(page, "Ana", beto, betoUsername);

  // Ana logs a game with Beto and her guest Jessi, who wins it.
  await page.goto("/es/matches/new");
  await page.getByLabel("Agregar jugador").fill("Beto");
  await page.getByRole("button", { name: "Beto" }).click();
  await addGuest(page, "Jessi");
  await page.getByLabel("Líder de Jessi").selectOption("captain");
  await fillScores(page, "Ana", [10, 0, 0, 0, 0, 0]);
  await fillScores(page, "Beto", [5, 0, 0, 0, 0, 0]);
  await fillScores(page, "Jessi", [20, 0, 0, 0, 0, 0]);
  await saveMatch(page);
  const matchUrl = page.url();

  // From the match's results, Jessi's name opens her Estadísticas.
  const results = page.getByRole("list").filter({ hasText: "Jessi" });
  await results.getByRole("link", { name: "Jessi", exact: true }).click();
  await expect(page).toHaveURL(/\/es\/guests\/[0-9a-f-]{36}$/);
  const guestUrl = page.url();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Diario de Jessi");
  await expect(page.getByText("Invitado · 1 expedición registrada")).toBeVisible();
  await expect(page.getByRole("img", { name: /^100\s%\sde 1 partida$/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Por categoría" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver las estadísticas con Capitán" })).toBeVisible();
  // She's Ana's guest: the way back is to Ana's guests, which link to her too.
  await page.getByRole("link", { name: "← Tus invitados" }).click();
  await expect(page).toHaveURL("/es/guests");
  await page.getByRole("link", { name: "Jessi", exact: true }).click();
  await expect(page).toHaveURL(guestUrl);

  // Beto played with Jessi, so he sees her numbers too, though she isn't his.
  await beto.goto(matchUrl);
  await beto.getByRole("list").filter({ hasText: "Jessi" }).getByRole("link", { name: "Jessi", exact: true }).click();
  await expect(beto).toHaveURL(guestUrl);
  await expect(beto.getByRole("img", { name: /^100\s%\sde 1 partida$/ })).toBeVisible();
  await expect(beto.getByRole("link", { name: "← Partidas" })).toBeVisible();
  await beto.close();

  // Carla never played with her: there's nothing there for her.
  const carla = await browser.newPage();
  await signUp(carla, request, "Carla");
  await carla.goto(guestUrl);
  await expect(notFoundSheet(carla)).toBeVisible();
  await carla.close();
});
