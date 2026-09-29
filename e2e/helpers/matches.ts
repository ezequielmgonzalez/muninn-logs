import { expect, type Page } from "@playwright/test";

const CATEGORIES = ["Investigación", "Templo", "Ídolos", "Guardianes", "Cartas", "Miedo (cartas)"];

/** Types a player's row of the score pad, in the order of CATEGORIES. */
export async function fillScores(page: Page, name: string, points: number[]) {
  for (const [i, category] of CATEGORIES.entries()) {
    await page.getByLabel(`${category} de ${name}`).fill(String(points[i]));
  }
}

export async function addGuest(page: Page, name: string) {
  await page.getByLabel("Agregar jugador").fill(name);
  await page.getByRole("button", { name: `Crear invitado “${name}”` }).click();
}

/** Saves the form and waits for the new match's page. */
export async function saveMatch(page: Page) {
  await page.getByRole("button", { name: "Guardar partida" }).click();
  await expect(page).toHaveURL(/\/es\/matches\/[0-9a-f-]{36}\?saved=1$/);
  await expect(page.getByRole("status")).toHaveText("Partida guardada.");
}
