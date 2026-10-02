import { expect, test } from "@playwright/test";

import { grantAdmin } from "./helpers/admin";
import { notFoundSheet, signInWithCode, signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";

function csv(text: string) {
  return { name: "partidas.csv", mimeType: "text/csv", buffer: Buffer.from(text) };
}

test("an admin imports past games from a CSV", async ({ page, request, browser }) => {
  // The admin's addable players include every guest they've met, so this one needs a unique name.
  const guest = `Imp ${Math.random().toString(36).slice(2, 7)}`;
  const ana = await signUp(page, request, "Ana");
  const bob = await browser.newPage();
  const { username: bobUsername } = await signUp(bob, request, "Bob");
  await befriend(page, "Ana", bob, bobUsername);
  await bob.close();

  // The admin role reaches the session on the next sign-in.
  await grantAdmin(request, ana.email);
  await page.context().clearCookies();
  await signInWithCode(page, request, ana.email);
  await expect(page).toHaveURL("/es");
  await page.getByRole("link", { name: "Importar partidas" }).click();
  await expect(page).toHaveURL("/es/admin/import");

  // A file with mistakes: every problem is listed, and nothing can be imported.
  const file = page.getByLabel("Archivo CSV");
  await file.setInputFiles(
    csv(
      "partida;jugador;investigacion;templo;idolos;guardianes;cartas;miedo;total\n" +
        "1;Ana;10;5;4;3;8;2;99\n" +
        "1;Bob;1;1;1;1;1;x\n",
    ),
  );
  const issues = page.getByRole("alert").filter({ hasText: "No se puede importar" });
  await expect(issues).toContainText("Fila 2: el total dice 99, pero las categorías suman 28.");
  await expect(issues).toContainText("Fila 3: «x» no es un valor válido para miedo.");
  await expect(page.getByRole("button", { name: /^Importar/ })).toHaveCount(0);

  // The fixed file: names are matched to players, new ones become guests.
  // Game 1 says who went first (Bob); game 2's turn order wasn't recorded.
  await file.setInputFiles(
    csv(
      "partida,fecha,turno,jugador,lider,investigacion,templo,idolos,guardianes,cartas,miedo,desempate\n" +
        "1,15/03/2025,2,ana,La Cetrera,12,10,8,6,14,2,\n" +
        "1,,1,Bob,,10,8,9,5,12,1,\n" +
        `1,,3,${guest},,1,1,1,1,1,0,\n` +
        `2,,,${guest},,9,4,6,3,10,3,x\n` +
        "2,,,Ana,,8,5,6,3,7,0,\n",
    ),
  );
  await expect(issues).toHaveCount(0);
  const chosen = (name: string) => page.getByLabel(name, { exact: true }).locator("option:checked");
  await expect(chosen("ana")).toHaveText("Ana (vos)");
  await expect(chosen("Bob")).toHaveText("Bob");
  await expect(chosen(guest)).toHaveText("Invitado nuevo");
  await expect(page.getByText("Partida 2 · sin fecha · orden de turnos sin registrar")).toBeVisible();
  await expect(page.getByText(`${guest} 29 · Ana 29`)).toBeVisible();

  await page.getByRole("button", { name: "Importar 2 partidas" }).click();
  await expect(page.getByRole("status")).toContainText("Listo: se importaron 2 partidas.");

  await page.getByRole("link", { name: "Ver historial" }).click();
  await expect(page.getByRole("link", { name: /Ganó Ana/ })).toBeVisible();

  // Game 1 kept its turns from the file, not from the order of its rows.
  await page.getByRole("link", { name: /Ganó Ana/ }).click();
  await page.getByRole("link", { name: "Editar partida" }).click();
  const turns = page.getByRole("listitem").filter({ hasText: "Turno" });
  await expect(turns.nth(0)).toContainText("Bob");
  await expect(turns.nth(1)).toContainText("Ana");
  await page.goto("/es/matches");
  // Tied at 29: the guest won the tiebreak, in the undated game.
  await expect(page.getByRole("link", { name: new RegExp(`Sin fecha.*Ganó ${guest}`) })).toBeVisible();

  // The guest who played both games was created once.
  await page.goto("/es/matches/new");
  await page.getByLabel("Agregar jugador").fill(guest);
  await expect(page.getByRole("button", { name: new RegExp(guest) })).toHaveCount(1);
});

test("only admins can import", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await expect(page.getByRole("link", { name: "Importar partidas" })).toHaveCount(0);
  await page.goto("/es/admin/import");
  await expect(notFoundSheet(page)).toBeVisible();
});
