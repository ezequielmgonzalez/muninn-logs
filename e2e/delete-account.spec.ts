import { expect, test } from "@playwright/test";

import { signInWithCode, signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

test("deleting your account keeps other people's games, anonymously", async ({ page, request, browser }) => {
  const ana = await signUp(page, request, "Ana");
  const bob = await browser.newPage();
  const { username: bobUsername } = await signUp(bob, request, "Bob");
  await befriend(page, "Ana", bob, bobUsername);

  // A game with Bob (it will pass to him) and one with only a guest (deleted).
  await page.goto("/es/matches/new");
  await page.getByLabel("Agregar jugador").fill("Bob");
  await page.getByRole("button", { name: "Bob" }).click();
  await fillScores(page, "Ana", [10, 6, 9, 5, 14, 2]); // 42
  await fillScores(page, "Bob", [8, 4, 6, 5, 9, 2]); // 30
  await saveMatch(page);
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await saveMatch(page);

  await page.goto("/es/profile/edit");
  await page.getByRole("link", { name: "Eliminar cuenta" }).click();
  await expect(page).toHaveURL("/es/account/delete");

  // Exactly what will happen to this account.
  const consequences = page.getByRole("listitem");
  await expect(consequences).toHaveCount(5);
  await expect(consequences.nth(1)).toHaveText("1 partida que cargaste se borra: en ella solo jugaron invitados.");
  await expect(consequences.nth(2)).toHaveText(/^1 partida que cargaste pasa a otro jugador/);
  await expect(consequences.nth(3)).toHaveText(/^En 1 partida, tu lugar queda como «Jugador eliminado»/);
  await expect(consequences.nth(4)).toHaveText("1 invitado tuyo se borra.");

  // The button only unlocks with the exact username.
  const submit = page.getByRole("button", { name: "Eliminar mi cuenta" });
  await expect(submit).toBeDisabled();
  await page.getByLabel(/Escribí tu nombre de usuario/).fill("otra_persona");
  await expect(submit).toBeDisabled();
  await page.getByLabel(/Escribí tu nombre de usuario/).fill(ana.username);
  await submit.click();

  await expect(page).toHaveURL("/es?accountDeleted=1");
  await expect(page.getByRole("status")).toHaveText("Tu cuenta se eliminó.");
  await expect(page.getByRole("link", { name: "Iniciar sesión" })).toBeVisible();

  // Bob keeps the game, now his to edit, with Ana anonymized.
  await bob.goto("/es/matches");
  await bob.getByRole("link", { name: /Ganó Jugador eliminado/ }).click();
  await expect(bob.getByRole("list").filter({ hasText: "Jugador eliminado" })).toContainText("42");
  await expect(bob.getByRole("link", { name: "Editar partida" })).toBeVisible();
  await bob.close();

  // Her email can start over with a brand-new account.
  await signInWithCode(page, request, ana.email);
  await expect(page).toHaveURL("/es/onboarding");
});
