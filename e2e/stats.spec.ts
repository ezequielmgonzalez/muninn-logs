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
  await page.getByLabel("Ordenar por").selectOption("research.average");
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

test("leaders rank by any category's average, highest or lowest, games without a leader included", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  // Research 10 and 2 with the Captain, 6 without a leader.
  for (const [leader, research] of [["captain", 10], ["captain", 2], [null, 6]] as const) {
    await page.goto("/es/matches/new");
    await addGuest(page, `Rival ${research}`);
    if (leader) await page.getByLabel("Líder de Ana").selectOption(leader);
    await fillScores(page, "Ana", [research, 0, 0, 0, 0, 0]);
    await fillScores(page, `Rival ${research}`, [1, 0, 0, 0, 0, 0]);
    await saveMatch(page);
  }
  await page.goto("/es/profile");
  const sort = page.getByLabel("Ordenar por");
  const rows = page.getByRole("list").filter({ hasText: "Sin líder" }).getByRole("listitem");

  await sort.selectOption({ label: "Investigación: máximo" });
  await expect(rows.nth(0)).toContainText("Capitán");
  await expect(rows.nth(0)).toContainText("10");
  await expect(rows.nth(1)).toContainText("Sin líder");

  await sort.selectOption({ label: "Investigación: mínimo" });
  await expect(rows.nth(0)).toContainText("Sin líder");
  await expect(rows.nth(0)).toContainText("6");
  await expect(rows.nth(1)).toContainText("Capitán");
  await expect(rows.nth(1)).toContainText("2");
});

test("a leader's own page lists their lowest, average and highest points, with a way back", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  // Two Captain games: research 10 (52 in total) and 2 (12 in total).
  for (const [research, cards] of [[10, 42], [2, 10]]) {
    await page.goto("/es/matches/new");
    await addGuest(page, `Rival ${research}`);
    await page.getByLabel("Líder de Ana").selectOption("captain");
    await fillScores(page, "Ana", [research, 0, 0, 0, cards, 0]);
    await fillScores(page, `Rival ${research}`, [1, 0, 0, 0, 0, 0]);
    await saveMatch(page);
  }
  await page.goto("/es/profile");

  await page.getByRole("button", { name: "Ver las estadísticas con Capitán" }).click();
  await expect(page.getByRole("heading", { name: "Capitán" })).toBeVisible();
  const row = (name: string) => page.getByRole("row", { name: new RegExp(`^${name}`) });
  await expect(page.getByRole("columnheader")).toHaveText(["Puntos", "Mín.", "Prom.", "Máx."]);
  await expect(row("Investigación").getByRole("cell")).toHaveText(["2", "6", "10"]);
  await expect(row("Puntos totales").getByRole("cell")).toHaveText(["12", "32", "52"]);
  // The ranking's controls make way for the leader's page.
  await expect(page.getByLabel("Ordenar por")).toHaveCount(0);

  // Focus starts on the way back, and returns to the leader's row.
  const back = page.getByRole("button", { name: "← Todos los líderes" });
  await expect(back).toBeFocused();
  await back.click();
  await expect(page.getByLabel("Ordenar por")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver las estadísticas con Capitán" })).toBeFocused();
});

test("the player count filters every stat and list, and follows you between screens", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  // A 2-player game Ana wins, and a 3-player game she loses.
  await page.goto("/es/matches/new");
  await addGuest(page, "Uno");
  await fillScores(page, "Ana", [10, 0, 0, 0, 0, 0]);
  await fillScores(page, "Uno", [1, 0, 0, 0, 0, 0]);
  await saveMatch(page);
  await page.goto("/es/matches/new");
  await addGuest(page, "Dos");
  await addGuest(page, "Tres");
  await fillScores(page, "Ana", [1, 0, 0, 0, 0, 0]);
  await fillScores(page, "Dos", [10, 0, 0, 0, 0, 0]);
  await fillScores(page, "Tres", [5, 0, 0, 0, 0, 0]);
  await saveMatch(page);

  const filter = page.getByLabel("Jugadores").filter({ visible: true });
  await page.goto("/es/profile");
  await expect(filter).toHaveValue("all");
  await expect(page.getByRole("img", { name: /^50\s%\sde 2 partidas$/ })).toBeVisible();

  await filter.selectOption({ label: "2 jugadores" });
  await expect(page.getByRole("img", { name: /^100\s%\sde 1 partida$/ })).toBeVisible();

  // Partidas remembers it: only the 2-player game.
  await page.goto("/es/matches");
  await expect(filter).toHaveValue("2");
  await expect(page.getByRole("link", { name: /Ganó/ })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Ganó Ana/ })).toBeVisible();

  await filter.selectOption({ label: "4 jugadores" });
  await expect(page.getByText("No hay partidas de 4 jugadores.")).toBeVisible();

  // Back to all of them.
  await filter.selectOption({ label: "Todas" });
  await expect(page.getByRole("link", { name: /Ganó/ })).toHaveCount(2);
});

test("while the player filter reloads, the screen says so instead of freezing", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.goto("/es/profile");
  // Hold the reload back, so its state can be seen.
  await page.route("**/es/profile**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  const filter = page.getByLabel("Jugadores").filter({ visible: true });
  await filter.selectOption({ label: "3 jugadores" });
  await expect(page.getByRole("status").filter({ hasText: "Cargando…" }).filter({ visible: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-refreshing");

  await expect(page.getByText("No hay partidas de 3 jugadores.")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("html")).not.toHaveAttribute("data-refreshing");
});
