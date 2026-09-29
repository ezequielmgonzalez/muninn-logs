import { expect, test } from "@playwright/test";

// Google's sign-in consent screen links to these, so they must be public.
test("the privacy policy and terms are public and linked from every page", async ({ page }) => {
  await page.goto("/es");
  await page.getByRole("link", { name: "Privacidad" }).click();
  await expect(page).toHaveURL("/es/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Política de privacidad");
  await expect(page.getByText("muninnlogs@gmail.com").first()).toBeVisible();

  await page.getByRole("link", { name: "Términos" }).click();
  await expect(page).toHaveURL("/es/terms");
  await expect(page.getByText(/no está afiliado.*Czech Games Edition/)).toBeVisible();
});

test("the legal pages are translated", async ({ page }) => {
  await page.goto("/en/terms");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Terms of service");
  await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
});
