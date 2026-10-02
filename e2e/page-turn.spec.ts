import { expect, test } from "@playwright/test";

import { signUp } from "./helpers/auth";

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
