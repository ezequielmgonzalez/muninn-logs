import { expect, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

test("the profile shows how you play, per category and per leader", async ({ page, request }) => {
  await signUp(page, request, "Ana");

  // Win with the Captain: Ana 10+6+9+5+14-2 = 42, Jessi 20.
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await page.getByLabel("Líder de Ana").selectOption("captain");
  await fillScores(page, "Ana", [10, 6, 9, 5, 14, 2]);
  await fillScores(page, "Jessi", [5, 2, 3, 0, 10, 0]);
  await saveMatch(page);

  // Second place with the Mystic: Ana 4+2+3+0+10-1 = 18, Jessi 30.
  await page.goto("/es/matches/new");
  await page.getByLabel("Agregar jugador").fill("Jessi");
  await page.getByRole("button", { name: /^Jessi/ }).click();
  await page.getByLabel("Líder de Ana").selectOption("mystic");
  await fillScores(page, "Ana", [4, 2, 3, 0, 10, 1]);
  await fillScores(page, "Jessi", [10, 5, 5, 0, 10, 0]);
  await saveMatch(page);

  await page.goto("/es");
  await page.getByRole("link", { name: "Ver estadísticas" }).click();
  await expect(page).toHaveURL("/es/profile");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Diario de Ana");

  // 1 win in 2 games, places 1 and 2. Spanish writes "50 %", with a no-break space.
  await expect(page.getByRole("img", { name: /^50\s%\sde 2 partidas$/ })).toBeVisible();
  await expect(page.getByRole("definition").nth(0)).toHaveText("1"); // Victorias
  await expect(page.getByRole("definition").nth(1)).toHaveText("1,5"); // Lugar promedio
  await expect(page.getByRole("definition").nth(2)).toHaveText("30"); // Puntos promedio

  // Research averages (10 + 4) / 2 = 7; fear (−2 − 1) / 2 = −1,5.
  const categories = page.getByRole("list").filter({ hasText: "Investigación" });
  await expect(categories.getByRole("listitem").filter({ hasText: "Investigación" })).toContainText("7");
  await expect(categories.getByRole("listitem").filter({ hasText: "Miedo" })).toContainText("-1,5");

  // Both leaders, ranked by win rate: the Captain (100%) above the Mystic (0%).
  const leaders = page.getByRole("list").filter({ hasText: "Capitán" });
  await expect(leaders.getByRole("listitem").first()).toContainText("Capitán");
  await expect(leaders.getByRole("listitem").first()).toContainText(/100\s%/);

  // By research the Captain also leads (10 vs 4); by average points too.
  await page.getByLabel("Ordenar por").selectOption("avgResearch");
  await expect(leaders.getByRole("listitem").first()).toContainText("Capitán");
  await expect(leaders.getByRole("listitem").nth(1)).toContainText("4");
});

test("the profile invites a new player to log their first game", async ({ page, request }) => {
  await signUp(page, request, "Nuevo");
  await page.goto("/es/profile");
  await expect(page.getByText("Todavía no hay partidas tuyas registradas.")).toBeVisible();
  await page.getByRole("link", { name: "Cargar partida" }).click();
  await expect(page).toHaveURL("/es/matches/new");
});
