import { expect, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";
import { fillScores, saveMatch } from "./helpers/matches";

test("a logged match shows its result to everyone who played, but only its creator can delete it", async ({
  page,
  request,
  browser,
}) => {
  await signUp(page, request, "Ana");
  const beto = await browser.newPage();
  const { username: betoUsername } = await signUp(beto, request, "Beto");
  await befriend(page, "Ana", beto, betoUsername);

  // Ana logs a match with Beto; they tie at 40 and Beto wins the tiebreak.
  await page.goto("/es/matches/new");
  await page.getByLabel("Agregar jugador").fill("Beto");
  await page.getByRole("button", { name: "Beto" }).click();
  await page.getByLabel("Líder de Beto").selectOption("falconer");
  await fillScores(page, "Ana", [10, 5, 10, 5, 12, 2]);
  await fillScores(page, "Beto", [12, 5, 8, 5, 12, 2]);
  await page.getByRole("radio", { name: "Beto" }).check();
  await saveMatch(page);

  // The match page: ranking, the tiebreak and the points per category.
  const results = page.getByRole("list").filter({ hasText: "ganó el desempate" });
  await expect(results.getByRole("listitem").first()).toContainText("Beto");
  await expect(results.getByRole("listitem").first()).toContainText("40");
  await expect(page.getByRole("row", { name: /^Investigación/ })).toContainText("10");
  await expect(page.getByRole("button", { name: "Eliminar partida" })).toBeVisible();

  // Ana's list shows it, with her place.
  await page.getByRole("link", { name: /Todas las partidas/ }).click();
  await expect(page.getByRole("link", { name: /Ganó Beto/ })).toContainText("2º de 2");

  // Beto played, so he sees it too, with his place, but can't delete it.
  await beto.goto("/es");
  await beto.getByRole("link", { name: "Partidas" }).click();
  const betoMatch = beto.getByRole("link", { name: /Ganó Beto/ });
  await expect(betoMatch).toContainText("1º de 2");
  await betoMatch.click();
  // Wait for the match page itself: the list also has a heading and no delete button.
  await expect(beto).toHaveURL(/\/es\/matches\/[0-9a-f-]{36}$/);
  await expect(beto.getByRole("heading", { name: "Resultado" })).toBeVisible();
  await expect(beto.getByRole("button", { name: "Eliminar partida" })).toHaveCount(0);

  // Ana deletes it, after confirming, and it's gone for both.
  await page.getByRole("link", { name: /Ganó Beto/ }).click();
  await page.getByRole("button", { name: "Eliminar partida" }).click();
  await page.getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(page).toHaveURL("/es/matches");
  await expect(page.getByText("Todavía no hay partidas en tu diario.")).toBeVisible();

  await beto.goto("/es/matches");
  await expect(beto.getByText("Todavía no hay partidas en tu diario.")).toBeVisible();
  await beto.close();
});

test("an unknown match is a 404", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  const response = await page.goto("/es/matches/00000000-0000-4000-8000-000000000000");
  expect(response?.status()).toBe(404);
});
