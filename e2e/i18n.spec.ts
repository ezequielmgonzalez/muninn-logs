import { expect, test } from "@playwright/test";

test("redirects / to the Spanish home page by default", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL("/es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
});

test.describe("with an English browser", () => {
  test.use({ locale: "en-US" });

  test("still starts in Spanish: the browser's language doesn't pick one", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveURL("/es");
    await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
  });

  test("but English, once chosen, is remembered", async ({ page }) => {
    await page.goto("/es");
    await page.getByRole("link", { name: "English" }).click();
    await expect(page).toHaveURL("/en");

    await page.goto("/");
    await expect(page).toHaveURL("/en");
  });
});

test("switches language and remembers the choice", async ({ page }) => {
  await page.goto("/es");

  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL("/en");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

  // next-intl stores the choice in a cookie, so / now goes to English.
  await page.goto("/");
  await expect(page).toHaveURL("/en");
});
