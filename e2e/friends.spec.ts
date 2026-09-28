import { type Browser, expect, type Page, test } from "@playwright/test";

import { formError, signUp } from "./helpers/auth";

async function sendRequest(page: Page, username: string) {
  await page.goto("/es/friends");
  await page.getByLabel("Nombre de usuario").fill(username);
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  // Wait for the outcome, so the other user's next reload sees the request.
  await expect(page.getByRole("status").or(formError(page))).toBeVisible();
}

/** A second user in their own browser session. */
async function otherUser(browser: Browser, request: Parameters<typeof signUp>[1], name: string) {
  const page = await browser.newPage();
  const { username } = await signUp(page, request, name);
  return { page, username };
}

test("a request, once accepted, makes both users friends", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  const beto = await otherUser(browser, request, "Beto");

  await sendRequest(page, beto.username);
  await expect(page.getByRole("status")).toHaveText("Le mandaste una solicitud a Beto.");
  await expect(page.getByRole("button", { name: "Cancelar la solicitud a Beto" })).toBeVisible();

  // Beto sees the pending request from home.
  await beto.page.goto("/es");
  await beto.page.getByRole("link", { name: "Amigos (1)" }).click();
  await beto.page.getByRole("button", { name: "Aceptar a Ana" }).click();
  await expect(beto.page.getByRole("button", { name: "Eliminar a Ana de tus amigos" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Eliminar a Beto de tus amigos" })).toBeVisible();
  await beto.page.close();
});

test("adding someone who already asked you accepts their request", async ({ page, request, browser }) => {
  const ana = await signUp(page, request, "Ana");
  const beto = await otherUser(browser, request, "Beto");

  await sendRequest(page, beto.username);
  await sendRequest(beto.page, `@${ana.username}`); // a leading @ is fine too

  await expect(beto.page.getByRole("status")).toHaveText("Ahora sos amigo de Ana.");
  await expect(beto.page.getByRole("button", { name: "Eliminar a Ana de tus amigos" })).toBeVisible();
  await beto.page.close();
});

test("declining and removing end the friendship for both", async ({ page, request, browser }) => {
  await signUp(page, request, "Ana");
  const beto = await otherUser(browser, request, "Beto");

  // Beto declines Ana's first request.
  await sendRequest(page, beto.username);
  await beto.page.goto("/es/friends");
  await beto.page.getByRole("button", { name: "Rechazar a Ana" }).click();
  await expect(beto.page.getByText("Todavía no tenés amigos en Muninn Logs.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Cancelar la solicitud a Beto" })).toHaveCount(0);

  // A second request is accepted, then Ana removes Beto.
  await sendRequest(page, beto.username);
  await beto.page.reload();
  await beto.page.getByRole("button", { name: "Aceptar a Ana" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Eliminar a Beto de tus amigos" }).click();
  await expect(page.getByText("Todavía no tenés amigos en Muninn Logs.")).toBeVisible();

  await beto.page.reload();
  await expect(beto.page.getByText("Todavía no tenés amigos en Muninn Logs.")).toBeVisible();
  await beto.page.close();
});

test("explains why a request can't be sent", async ({ page, request, browser }) => {
  const ana = await signUp(page, request, "Ana");
  const beto = await otherUser(browser, request, "Beto");
  await beto.page.close();

  await sendRequest(page, "nadie_se_llama_asi");
  await expect(formError(page)).toHaveText("No encontramos a nadie con ese nombre de usuario.");
  // The form keeps what was typed after an error.
  await expect(page.getByLabel("Nombre de usuario")).toHaveValue("nadie_se_llama_asi");

  await sendRequest(page, ana.username);
  await expect(formError(page)).toHaveText("Ese sos vos.");

  await sendRequest(page, beto.username);
  await sendRequest(page, beto.username);
  await expect(formError(page)).toHaveText("Ya le mandaste una solicitud.");
});

test("friends requires signing in", async ({ page }) => {
  await page.goto("/es/friends");
  await expect(page).toHaveURL("/es/login");
});
