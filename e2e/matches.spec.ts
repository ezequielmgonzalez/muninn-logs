import { expect, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

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
  await expect(page.getByRole("link", { name: /Ganó Beto/ })).toContainText("Saliste 2.º de 2");

  // Beto played, so he sees it too, with his place, but can't delete it.
  await beto.goto("/es");
  await beto.getByRole("link", { name: "Ver todas las partidas" }).click();
  const betoMatch = beto.getByRole("link", { name: /Ganó Beto/ });
  await expect(betoMatch).toContainText("Saliste 1.º de 2");
  await betoMatch.click();
  // Wait for the match page itself: the list also has a heading and no delete button.
  await expect(beto).toHaveURL(/\/es\/matches\/[0-9a-f-]{36}$/);
  await expect(beto.getByRole("heading", { name: "Resultado" })).toBeVisible();
  await expect(beto.getByRole("button", { name: "Eliminar partida" })).toHaveCount(0);
  await expect(beto.getByRole("link", { name: "Editar partida" })).toHaveCount(0);
  const betoEdit = await beto.goto(`${beto.url()}/edit`);
  expect(betoEdit?.status()).toBe(404);

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
  // The app's own not-found sheet, translated, with a way back.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página no encontrada");
  await page.getByRole("link", { name: "Volver al inicio" }).click();
  await expect(page).toHaveURL("/es");
});

test("editing a match starts from its saved values and replaces them", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await page.getByLabel("Líder de Jessi").selectOption("mystic");
  await fillScores(page, "Ana", [10, 5, 10, 5, 12, 2]); // 40
  await fillScores(page, "Jessi", [8, 5, 8, 5, 12, 1]); // 37
  await saveMatch(page);
  await expect(page.getByRole("link", { name: /Todas las partidas/ })).toBeVisible();

  await page.getByRole("link", { name: "Editar partida" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Editar partida");
  // Saved values, with fear back as a number of cards.
  await expect(page.getByLabel("Investigación de Ana")).toHaveValue("10");
  await expect(page.getByLabel("Miedo (cartas) de Ana")).toHaveValue("2");
  await expect(page.getByLabel("Líder de Jessi")).toHaveValue("mystic");

  // Jessi's cards were miscounted, and Nuevo also played.
  await page.getByLabel("Cartas de Jessi").fill("20"); // 45
  await addGuest(page, "Nuevo");
  await fillScores(page, "Nuevo", [1, 0, 0, 0, 2, 0]);
  await saveMatch(page);

  const results = page.getByRole("list").filter({ hasText: "Nuevo" });
  await expect(results.getByRole("listitem")).toHaveCount(3);
  await expect(results.getByRole("listitem").first()).toContainText("Jessi");
  await expect(results.getByRole("listitem").first()).toContainText("45");
});

test("the list puts a month on each page, two at a time", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  for (const [date, guest] of [["2026-09-20", "Jessi"], ["2026-08-10", "Toto"], ["2026-07-05", "Lola"]]) {
    await page.goto("/es/matches/new");
    await page.getByLabel("Fecha").fill(date);
    await addGuest(page, guest);
    await saveMatch(page);
  }

  await page.goto("/es/matches");
  await expect(page.getByRole("heading", { name: "Septiembre 2026" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agosto 2026" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Julio 2026" })).toHaveCount(0);

  await page.getByRole("link", { name: "Anteriores →" }).click();
  await expect(page).toHaveURL("/es/matches?page=1");
  await expect(page.getByRole("heading", { name: "Julio 2026" })).toBeVisible();
  // Scoreless games are ties: each entry names both players.
  await expect(page.getByRole("link", { name: /Lola/ })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Jessi/ })).toHaveCount(0);
  await page.getByRole("link", { name: "← Más recientes" }).click();
  await expect(page).toHaveURL("/es/matches");
});
