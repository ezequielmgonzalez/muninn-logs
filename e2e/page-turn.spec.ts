import { expect, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { addGuest, saveMatch } from "./helpers/matches";

// Moving between sections turns the diary's page (PageTurnProvider): a copy
// of the page turns over, and the new screen comes in once it lands.

test("going to another section turns the page, then shows the new one", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const nav = page.getByRole("navigation", { name: "Secciones" }).filter({ visible: true });

  await nav.getByRole("link", { name: "Amigos" }).click();
  // The turning page is an overlay that outlives the navigation.
  await expect(page.locator(".page-flap")).toHaveCount(1);
  await expect(page).toHaveURL("/es/friends");
  await expect(page.locator(".page-flap")).toHaveCount(0);

  // Nothing stays hidden or waiting once it has landed.
  await expect(page.locator("[data-turned-away]")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-turning");
  await expect(page.getByRole("heading", { name: "Agregar amigo" })).toBeVisible();

  // And back: an earlier section turns the page the other way.
  await nav.getByRole("link", { name: "Inicio" }).click();
  await expect(page.locator(".page-flap")).toHaveCount(1);
  await expect(page).toHaveURL("/es");
  await expect(page.locator(".page-flap")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tu resumen" })).toBeVisible();
});

test("under reduced motion, sections change without a turning page", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.emulateMedia({ reducedMotion: "reduce" });
  const nav = page.getByRole("navigation", { name: "Secciones" }).filter({ visible: true });

  await nav.getByRole("link", { name: "Amigos" }).click();
  await expect(page).toHaveURL("/es/friends");
  expect(await page.locator(".page-flap").count()).toBe(0);
  await expect(page.getByRole("heading", { name: "Agregar amigo" })).toBeVisible();
});

test("a clicked section is painted at once, before its screen arrives", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  // Hold the next screen back, so the click's effect shows before it.
  await page.route("**/es/friends**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });
  await page.goto("/es");
  const nav = page.getByRole("navigation", { name: "Secciones" }).filter({ visible: true });
  const stroke = (name: string) =>
    nav.getByRole("link", { name, exact: true }).locator("[data-nav-stroke]").evaluate((el) => getComputedStyle(el).display);

  await nav.getByRole("link", { name: "Amigos", exact: true }).click();
  await expect(page).toHaveURL("/es");
  expect(await stroke("Amigos")).toBe("block");
  expect(await stroke("Inicio")).toBe("none");

  await expect(page).toHaveURL("/es/friends", { timeout: 10_000 });
  await expect(nav.getByRole("link", { name: "Amigos", exact: true })).toHaveAttribute("aria-current", "page");
});

test("links inside a screen turn the page too", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await saveMatch(page);
  await page.goto("/es");
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.getByRole("link", { name: "Ver todas las partidas →" }).click();
  await expect(page.locator(".page-flap")).toHaveCount(1);
  await expect(page).toHaveURL("/es/matches");
  await expect(page.locator(".page-flap")).toHaveCount(0);
  await expect(page.locator("[data-turned-away], [data-pending]")).toHaveCount(0);
});

test("the turning page is decoration: the screen is never there twice", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const nav = page.getByRole("navigation", { name: "Secciones" }).filter({ visible: true });
  await nav.getByRole("link", { name: "Amigos" }).click();
  await expect(page.locator(".page-flap")).toHaveCount(1);
  await expect(page.locator(".page-flap")).toHaveAttribute("aria-hidden", "true");
  // While it turns, a heading may still be on the uncovered page, but never also in the copy.
  expect(await page.getByRole("heading", { name: "Tu resumen" }).count()).toBeLessThanOrEqual(1);
  expect(await page.getByRole("heading", { level: 1 }).count()).toBeLessThanOrEqual(1);
});

test("the turning page's text is painted, not written, so it's never found twice", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const nav = page.getByRole("navigation", { name: "Secciones" }).filter({ visible: true });
  await nav.getByRole("link", { name: "Amigos" }).click();
  const flap = page.locator(".page-flap");
  await expect(flap).toHaveCount(1);
  // It looks like the page (its words are drawn), but holds no text to find or read.
  expect(await flap.evaluate((el) => el.querySelectorAll("[data-text]").length)).toBeGreaterThan(0);
  expect(await flap.evaluate((el) => el.textContent?.trim())).toBe("");
});
