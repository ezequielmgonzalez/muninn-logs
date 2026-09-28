import { expect, test } from "@playwright/test";

import {
  chooseUsername,
  formError,
  signInWithCode,
  uniqueEmail,
  uniqueUsername,
} from "./helpers/auth";

test("a new user signs in with an emailed code, picks a username and signs out", async ({
  page,
  request,
}) => {
  const email = uniqueEmail();

  await signInWithCode(page, request, email);

  // First sign-in: onboarding, with the email prefix as the default name.
  await expect(page).toHaveURL("/es/onboarding");
  await page.getByLabel("Nombre", { exact: true }).fill("Ana");
  await chooseUsername(page, uniqueUsername());

  await expect(page).toHaveURL("/es");
  await expect(page.getByRole("heading", { name: "Diario de Ana" })).toBeVisible();

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();
});

test("a returning user skips onboarding", async ({ page, request, browser }) => {
  const email = uniqueEmail();
  await signInWithCode(page, request, email);
  await chooseUsername(page, uniqueUsername());
  await expect(page).toHaveURL("/es");

  // A fresh browser, like signing in on another device.
  const other = await browser.newPage();
  await signInWithCode(other, request, email);
  await expect(other).toHaveURL("/es");
  await expect(other.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
  await other.close();
});

test("a wrong code shows an error", async ({ page }) => {
  await page.goto("/es/login");
  await page.getByLabel("Email").fill(uniqueEmail());
  await page.getByRole("button", { name: "Enviar código" }).click();

  await page.getByLabel("Código").fill("000000");
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(formError(page)).toContainText("incorrecto o venció");
});

test("a taken username is rejected", async ({ page, request, browser }) => {
  const username = uniqueUsername();
  await signInWithCode(page, request, uniqueEmail());
  await chooseUsername(page, username);
  await expect(page).toHaveURL("/es");

  const other = await browser.newPage();
  await signInWithCode(other, request, uniqueEmail());
  await chooseUsername(other, username.toUpperCase());
  await expect(formError(other)).toContainText("ya está en uso");
  // The form keeps what was typed (React resets fields after an action).
  await expect(other.getByLabel("Nombre de usuario")).toHaveValue(username.toUpperCase());
  await other.close();
});

test("onboarding requires signing in", async ({ page }) => {
  await page.goto("/es/onboarding");
  await expect(page).toHaveURL("/es/login");
});
