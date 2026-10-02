import { expect, test } from "@playwright/test";

import { formError, signUp, uniqueUsername } from "./helpers/auth";
import { sendFriendRequest } from "./helpers/friends";

test("editing the profile changes the name and the username friends search for", async ({
  page,
  request,
  browser,
}) => {
  const { username: oldUsername } = await signUp(page, request, "Ana");
  const beto = await browser.newPage();
  const { username: takenUsername } = await signUp(beto, request, "Beto");

  await page.getByRole("link", { name: "Editar perfil" }).click();
  await expect(page).toHaveURL("/es/profile/edit");
  // Starts from the current values.
  await expect(page.getByLabel("Nombre de usuario")).toHaveValue(oldUsername);
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue("Ana");

  // Someone else's username is refused, and what was typed stays.
  await page.getByLabel("Nombre de usuario").fill(takenUsername);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(formError(page)).toContainText("ya está en uso");
  await expect(page.getByLabel("Nombre de usuario")).toHaveValue(takenUsername);

  const newUsername = uniqueUsername();
  await page.getByLabel("Nombre de usuario").fill(newUsername);
  await page.getByLabel("Nombre", { exact: true }).fill("Ana María");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page).toHaveURL("/es?profileSaved=1");
  await expect(page.getByRole("status")).toHaveText("Perfil actualizado.");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Diario de Ana María");
  // The notebook's own "Diario de" too, though it stayed put through the edit.
  await expect(page.locator(".type-diary-name").filter({ visible: true })).toHaveText("Ana María");

  // Friends now find her by the new username, and not by the old one.
  await sendFriendRequest(beto, oldUsername);
  await expect(formError(beto)).toHaveText("No encontramos a nadie con ese nombre de usuario.");
  await sendFriendRequest(beto, newUsername);
  await expect(beto.getByRole("status")).toHaveText("Le mandaste una solicitud a Ana María.");
  await beto.close();
});

test("editing the profile requires signing in", async ({ page }) => {
  await page.goto("/es/profile/edit");
  await expect(page).toHaveURL("/es/login");
});
