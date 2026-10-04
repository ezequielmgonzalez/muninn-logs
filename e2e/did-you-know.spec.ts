import { expect, type Page, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

// "¿Sabías que…?": the crow tells facts about the group's games (on the
// insert on desktop, at the end of Inicio on phones). Which facts are true is
// tested in facts.test.ts; here, that they reach the screen and "Otro dato"
// goes through them.

async function logGame(page: Page, mine: number, jessi: number, first: boolean) {
  await page.goto("/es/matches/new");
  if (first) await addGuest(page, "Jessi");
  else {
    await page.getByLabel("Agregar jugador").fill("Jessi");
    await page.getByRole("button", { name: /^Jessi/ }).first().click();
  }
  await fillScores(page, "Ezequiel", [mine, 0, 0, 0, 0, 0]);
  await fillScores(page, "Jessi", [jessi, 0, 0, 0, 0, 0]);
  await saveMatch(page);
}

const crow = (page: Page) => page.getByRole("region", { name: "¿Sabías que…?" }).filter({ visible: true });

/** On desktop the crow's small bubble opens the facts; on phones they're open. */
async function listen(page: Page, isMobile: boolean) {
  if (isMobile) return;
  const bubble = crow(page).getByRole("button", { name: "¿Sabías que…?" });
  await expect(bubble).toBeEnabled();
  await bubble.click();
  await expect(bubble).toHaveAttribute("aria-expanded", "true");
}

test("the crow tells facts about the group's games, one after another", async ({ page, request, isMobile }) => {
  test.setTimeout(90_000);
  await signUp(page, request, "Ezequiel");
  // No games yet: nothing to tell.
  await listen(page, isMobile);
  await expect(crow(page)).toContainText("Cuando haya unas partidas más, te cuento cosas.");
  await expect(crow(page).getByRole("button", { name: "Otro dato" })).toBeHidden();

  await logGame(page, 60, 114, true);
  await logGame(page, 60, 40, false);
  await logGame(page, 70, 30, false);

  await page.goto("/es");
  await listen(page, isMobile);
  const fact = crow(page).locator("[aria-live]");
  await expect(fact).not.toContainText("Cuando haya");
  // Seven facts, in a random order: "Otro dato" goes through every one, then starts over.
  const told = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const text = (await fact.textContent())!;
    told.add(text);
    await crow(page).getByRole("button", { name: "Otro dato" }).click();
    await expect(fact).not.toHaveText(text);
  }
  expect([...told].sort()).toEqual(
    [
      "Jessi tiene el puntaje más alto en una partida: 114 puntos.",
      "El puntaje más bajo en una partida es de Jessi: 30 puntos.",
      "Vos sos quien más partidas ganó: 2.",
      "Vos tenés el mejor promedio: 63,3 puntos por partida.",
      "Con quien más jugaste es Jessi: 3 partidas.",
      "La mayor paliza: Jessi te sacó 54 puntos.",
      "La partida más pareja: le ganaste a Jessi por 20 puntos.",
    ].sort(),
  );
  expect(told).toContain((await fact.textContent())!);

  if (!isMobile) {
    // Esc puts the facts away.
    await page.keyboard.press("Escape");
    await expect(fact).toBeHidden();
    await expect(crow(page).getByRole("button", { name: "¿Sabías que…?" })).toHaveAttribute("aria-expanded", "false");
  }
});
