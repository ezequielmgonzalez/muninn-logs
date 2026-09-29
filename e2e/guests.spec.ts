import { type Browser, expect, type Page, test } from "@playwright/test";

import { grantAdmin } from "./helpers/admin";
import { signInWithCode, signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

/** Ana logs a game with a guest; returns once it's saved. */
async function logGameWithGuest(page: Page, guest: string) {
  await page.goto("/es/matches/new");
  await addGuest(page, guest);
  await fillScores(page, "Ana", [10, 6, 9, 5, 14, 2]); // 42
  await fillScores(page, guest, [8, 4, 6, 5, 9, 2]); // 30
  await saveMatch(page);
}

async function newUser(browser: Browser, request: Parameters<typeof signUp>[1], name: string) {
  const page = await browser.newPage();
  const account = await signUp(page, request, name);
  return { page, ...account };
}

test("a guest's owner asks a friend, who accepts and gets the guest's games", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  await logGameWithGuest(page, "Beto");

  // Later, Beto signs up and becomes Ana's friend.
  const beto = await newUser(browser, request, "Beto");
  await befriend(page, "Ana", beto.page, beto.username);

  await page.getByRole("link", { name: "Tus invitados →" }).click();
  await expect(page).toHaveURL("/es/guests");
  const guest = page.getByRole("listitem").filter({ hasText: "Beto" });
  await expect(guest).toContainText("1 partida");
  await guest.getByLabel("¿Quién es Beto?").selectOption({ label: "Beto" });
  await guest.getByRole("button", { name: "Vincular" }).click();
  await expect(guest).toContainText("Esperando que Beto confirme.");

  await beto.page.goto("/es");
  await expect(beto.page.getByText("Ana dice que sos «Beto» en 1 partida. ¿Sos vos?")).toBeVisible();
  await beto.page.getByRole("button", { name: "Sí, soy yo" }).click();
  await expect(beto.page.getByRole("status")).toHaveText("Listo: sumamos 1 partida a tu diario.");
  await expect(beto.page.getByText("1 expedición registrada")).toBeVisible();

  // The guest is gone from Ana's list: it is Beto now.
  await page.reload();
  await expect(page.getByText("Todavía no creaste invitados.")).toBeVisible();
  await beto.page.close();
});

test("declining leaves the guest as it was", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  await logGameWithGuest(page, "Beto");
  const beto = await newUser(browser, request, "Beto");
  await befriend(page, "Ana", beto.page, beto.username);

  await page.goto("/es/guests");
  await page.getByLabel("¿Quién es Beto?").selectOption({ label: "Beto" });
  await page.getByRole("button", { name: "Vincular" }).click();
  await expect(page.getByText("Esperando que Beto confirme.")).toBeVisible();

  await beto.page.goto("/es");
  await beto.page.getByRole("button", { name: "No soy yo" }).click();
  await expect(beto.page.getByText("¿Sos vos?")).toHaveCount(0);
  await expect(beto.page.getByText("0 expediciones registradas")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("¿Quién es Beto?")).toBeVisible(); // no request pending
  await beto.page.close();
});

test("an admin links any guest to an account after confirming", async ({ page, request, browser }) => {
  // The admin sees every guest in the database, so this one needs a unique name.
  const guestName = `Caro ${Math.random().toString(36).slice(2, 7)}`;
  await signUp(page, request, "Ana");
  await logGameWithGuest(page, guestName);
  const caro = await newUser(browser, request, "Caro");

  // The admin role reaches the session on the next sign-in.
  const admin = await newUser(browser, request, "Admin");
  await grantAdmin(request, admin.email);
  await admin.page.context().clearCookies();
  await signInWithCode(admin.page, request, admin.email);
  await expect(admin.page).toHaveURL("/es");

  await admin.page.getByRole("link", { name: "Administrar invitados" }).click();
  const guest = admin.page.getByRole("listitem").filter({ hasText: guestName });
  await expect(guest).toContainText("de Ana");
  await guest.getByLabel(`Cuenta de ${guestName} (nombre de usuario)`).fill(caro.username);
  await guest.getByRole("button", { name: "Buscar" }).click();
  await expect(guest.getByRole("alert")).toContainText(`«${guestName}» (de Ana) pasa a ser Caro`);
  await expect(guest.getByRole("alert")).toContainText("se mueven 1 partida");
  await guest.getByRole("button", { name: "Vincular" }).click();
  await expect(admin.page.getByRole("status")).toHaveText("Listo: se movió 1 partida.");
  await expect(admin.page.getByRole("listitem").filter({ hasText: guestName })).toHaveCount(0);

  await caro.page.goto("/es");
  await expect(caro.page.getByText("1 expedición registrada")).toBeVisible();
  await caro.page.close();
  await admin.page.close();
});

test("only admins have the admin page", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await expect(page.getByRole("link", { name: "Administrar invitados" })).toHaveCount(0);
  const response = await page.goto("/es/admin/guests");
  expect(response?.status()).toBe(404);
});
