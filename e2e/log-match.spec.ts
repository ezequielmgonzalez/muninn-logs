import { expect, test } from "@playwright/test";

import { formError, signUp } from "./helpers/auth";
import { addGuest, fillScores, saveMatch, setDate } from "./helpers/matches";

test("logs a match with guests, leaders and a tiebreak", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.getByRole("link", { name: "Cargar partida" }).click();
  await expect(page).toHaveURL("/es/matches/new");

  // Ana is already in, as the first player.
  await expect(page.getByText("Ana · vos")).toBeVisible();
  const save = page.getByRole("button", { name: "Guardar partida" });
  await expect(save).toBeDisabled();

  await addGuest(page, "Jessi");
  await page.getByLabel("Líder de Ana").selectOption("captain");
  // A leader someone already has can't be picked twice.
  await expect(page.getByLabel("Líder de Jessi").locator("option", { hasText: "Capitán" })).toBeDisabled();
  await page.getByLabel("Líder de Jessi").selectOption("mystic");
  await page.getByText("Serpiente").click();

  // Ana 10+6+9+5+14-2 = 42; Jessi 12+6+9+5+12-2 = 42: a tie.
  await fillScores(page, "Ana", [10, 6, 9, 5, 14, 2]);
  await fillScores(page, "Jessi", [12, 6, 9, 5, 12, 2]);
  await expect(page.getByLabel("Total de Ana")).toHaveText("42");
  await expect(page.getByLabel("Total de Jessi")).toHaveText("42");

  await expect(page.getByText("Empate en 42 puntos.")).toBeVisible();
  await page.getByRole("radio", { name: "Jessi" }).check();

  await saveMatch(page);
});

test("reuses a guest instead of creating a duplicate", async ({ page, request }) => {
  await signUp(page, request, "Ana");

  // First match creates the guest Jessi.
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await saveMatch(page);

  // Next time, a partial name suggests her (and still allows a new guest)…
  await page.goto("/es/matches/new");
  await page.getByLabel("Agregar jugador").fill("jes");
  await expect(page.getByRole("button", { name: /^Jessi/ })).toBeVisible();

  // …and her full name only suggests the existing Jessi, never a duplicate.
  await page.getByLabel("Agregar jugador").fill("jessi");
  await expect(page.getByRole("button", { name: /^Jessi/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Crear invitado/ })).toHaveCount(0);
  await page.getByRole("button", { name: /^Jessi/ }).click();
  await expect(page.getByText("Turno 2")).toBeVisible();
  await expect(page.getByText("invitado nuevo")).toHaveCount(0);
});

test("turn order follows the list, and players can be moved", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");

  await page.getByRole("button", { name: "Subir a Jessi" }).click();
  const turns = page.getByRole("listitem").filter({ hasText: "Turno" });
  await expect(turns.first()).toContainText("Jessi");
  await expect(turns.nth(1)).toContainText("Ana");

  await page.getByRole("button", { name: "Quitar a Jessi" }).click();
  await expect(page.getByRole("button", { name: "Guardar partida" })).toBeDisabled();
});

test("a game copied from an old score pad can leave its turn order unrecorded", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  const turnOrder = page.getByRole("group", { name: "Orden de turnos" });
  await expect(turnOrder.getByRole("button", { name: "Como en la mesa" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Turno 2")).toBeVisible();

  // Unrecorded: no turns, and nothing to reorder.
  await turnOrder.getByRole("button", { name: "Sin registrar" }).click();
  await expect(page.getByText("Turno 1")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Subir a Jessi" })).toHaveCount(0);
  await fillScores(page, "Ana", [10, 6, 9, 5, 14, 2]);
  await fillScores(page, "Jessi", [5, 2, 3, 0, 10, 0]);
  await saveMatch(page);

  // Editing keeps it unrecorded.
  await page.getByRole("link", { name: "Editar partida" }).click();
  await expect(
    page.getByRole("group", { name: "Orden de turnos" }).getByRole("button", { name: "Sin registrar" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Turno 1")).toHaveCount(0);
});

test("shows an error instead of losing the match when saving fails", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");

  // Simulate the session ending mid-form: the save is refused, the form stays.
  await page.context().clearCookies();
  await page.getByRole("button", { name: "Guardar partida" }).click();
  await expect(formError(page)).toBeVisible();
  await expect(page.getByText("Jessi · invitado nuevo")).toBeVisible();
});

test("logging a match requires signing in", async ({ page }) => {
  await page.goto("/es/matches/new");
  await expect(page).toHaveURL("/es/login");
});

test("a game can be logged without a date", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.goto("/es/matches/new");
  await expect(page.getByLabel("Fecha")).not.toHaveValue(""); // new games default to today
  await setDate(page, "");
  await addGuest(page, "Jessi");
  await saveMatch(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Partida sin fecha");

  // Editing keeps it undated rather than silently dating it today.
  await page.getByRole("link", { name: "Editar partida" }).click();
  await expect(page.getByLabel("Fecha")).toHaveValue("");
  await saveMatch(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Partida sin fecha");

  await page.goto("/es/matches");
  await expect(page.getByRole("link", { name: /Sin fecha/ })).toBeVisible();
});

test("the board can be any of Arnak's temples", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await page.getByRole("button", { name: "Cascada" }).click();
  await expect(page.getByRole("button", { name: "Cascada" })).toHaveAttribute("aria-pressed", "true");
  await saveMatch(page);
  await expect(page.getByText("Cascada")).toBeVisible();
});
