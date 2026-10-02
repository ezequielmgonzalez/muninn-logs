import { expect, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

// The notebook around every signed-in screen is a layout: it stays put while
// the screens change, and only their pages are sketched while they load.

test("the diary's name and the navigation stay put between screens, even while one loads", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "the insert is the desktop notebook's");
  await signUp(page, request, "Ana");
  // A slow connection: the next screen's data is held back (prefetches go through).
  await page.route("**/es/friends**", async (route) => {
    if (!route.request().headers()["next-router-prefetch"]) await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });
  await page.waitForLoadState("networkidle");
  const name = page.locator(".type-diary-name").filter({ visible: true });
  const nav = page.getByRole("navigation", { name: "Secciones" }).filter({ visible: true });
  const friends = nav.getByRole("link", { name: "Amigos", exact: true });
  const where = async () => ({ name: await name.boundingBox(), friends: await friends.boundingBox() });
  const before = await where();

  await friends.click();
  // Loading: the pages are sketched, the insert is the same.
  await expect(page.getByRole("status").filter({ hasText: "Cargando…" })).toBeAttached();
  await expect(name).toHaveText("Ana");
  expect(await page.locator("[data-notebook] .sketch").filter({ visible: true }).count()).toBeGreaterThan(0);
  expect(await nav.locator(".sketch").count()).toBe(0);
  expect(await where()).toEqual(before);

  // Amigos has no player filter, and still nothing on the insert moves.
  await expect(page.getByRole("heading", { name: "Agregar amigo" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Jugadores").filter({ visible: true })).toHaveCount(0);
  expect(await where()).toEqual(before);
});

test("the diary's count follows the matches saved and deleted", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  const count = page.getByText(/expedici(ón|ones) registradas?/).filter({ visible: true });
  await expect(count).toHaveText("0 expediciones registradas");

  await page.getByRole("link", { name: "Cargar partida" }).filter({ visible: true }).click();
  await expect(page).toHaveURL("/es/matches/new");
  await addGuest(page, "Jessi");
  await fillScores(page, "Ana", [10, 0, 0, 0, 0, 0]);
  await fillScores(page, "Jessi", [1, 0, 0, 0, 0, 0]);
  await saveMatch(page);

  const nav = page.getByRole("navigation", { name: "Secciones" }).filter({ visible: true });
  await nav.getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(page).toHaveURL("/es");
  await expect(count).toHaveText("1 expedición registrada");

  await nav.getByRole("link", { name: "Partidas", exact: true }).click();
  await page.getByRole("link", { name: /Ganó Ana/ }).click();
  await page.getByRole("button", { name: "Eliminar partida" }).click();
  await page.getByRole("button", { name: "Sí, eliminar" }).click();
  await expect(page).toHaveURL("/es/matches");
  await nav.getByRole("link", { name: "Inicio", exact: true }).click();
  await expect(count).toHaveText("0 expediciones registradas");
});

test("on a big screen the notebook grows to fill it, and fits a small one", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "the scaled scene is the desktop notebook's");
  await signUp(page, request, "Ana");
  const scene = page.locator("[data-notebook] > div").first();

  // A 1440p monitor: the 1280×1000 scene scales up to the window's height.
  await page.setViewportSize({ width: 2560, height: 1300 });
  await expect.poll(async () => (await scene.boundingBox())?.height).toBeCloseTo(1300, 0);
  // Never past the paper's own resolution (2×), however big the screen.
  await page.setViewportSize({ width: 5000, height: 3000 });
  await expect.poll(async () => (await scene.boundingBox())?.width).toBeCloseTo(2560, 0);
  // A laptop: smaller than designed, still whole.
  await page.setViewportSize({ width: 1440, height: 800 });
  await expect.poll(async () => (await scene.boundingBox())?.height).toBeCloseTo(800, 0);
});
