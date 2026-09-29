import { expect, type Page } from "@playwright/test";

import { formError } from "./auth";

export async function sendFriendRequest(page: Page, username: string) {
  await page.goto("/es/friends");
  await page.getByLabel("Nombre de usuario").fill(username);
  await page.getByRole("button", { name: "Enviar solicitud" }).click();
  // Wait for the outcome, so the other user's next reload sees the request.
  await expect(page.getByRole("status").or(formError(page))).toBeVisible();
}

/** Makes two signed-in users friends: `from` asks, `to` accepts. */
export async function befriend(from: Page, fromName: string, to: Page, toUsername: string) {
  await sendFriendRequest(from, toUsername);
  await to.goto("/es/friends");
  await to.getByRole("button", { name: `Aceptar a ${fromName}` }).click();
  await expect(to.getByRole("button", { name: `Eliminar a ${fromName} de tus amigos` })).toBeVisible();
}
