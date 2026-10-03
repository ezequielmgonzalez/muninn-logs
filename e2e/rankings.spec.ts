import { expect, type Page, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";
import { addGuest, fillScores } from "./helpers/matches";

// Rankings: everyone you play with, under a leader, a temple side and table
// sizes. What a player's numbers mean is tested in the database
// (rankings.test.sql); here, the screen around them.

type Seat = { name: string; known?: boolean; leader: string; points: number };

/** Logs a game: the temple side, then the players with their leader and points (research only). */
async function logGame(page: Page, me: string, side: string, mine: Omit<Seat, "name">, others: Seat[]) {
  await page.goto("/es/matches/new");
  await page.getByRole("button", { name: side }).click();
  for (const seat of others) {
    await page.getByLabel("Agregar jugador").fill(seat.name);
    if (seat.known) await page.getByRole("button", { name: new RegExp(`^${seat.name}`) }).first().click();
    else await addGuest(page, seat.name);
  }
  await page.getByLabel(`Líder de ${me}`).selectOption(mine.leader);
  await fillScores(page, me, [mine.points, 0, 0, 0, 0, 0]);
  for (const seat of others) {
    await page.getByLabel(`Líder de ${seat.name}`).selectOption(seat.leader);
    await fillScores(page, seat.name, [seat.points, 0, 0, 0, 0, 0]);
  }
  await page.getByRole("button", { name: "Guardar partida" }).click();
  await expect(page).toHaveURL(/saved=1/);
}

/**
 * Ezequiel, his friends Manuela and Iñaki, his guest Jessi, and Iñaki's
 * guest Jero (who played with Ezequiel once):
 *   Serpiente: Ezequiel 60 (Profesor), Manuela 50, Jessi 40
 *   Serpiente: Iñaki 55, Ezequiel 40 (Profesor), Jero 30   (Iñaki's game)
 *   Pájaro:    Manuela 52 (Profesor), Ezequiel 45
 */
async function seed(page: Page, request: Parameters<typeof signUp>[1], browser: import("@playwright/test").Browser) {
  await signUp(page, request, "Ezequiel");
  const manuela = await browser.newPage();
  const { username: manuelaUser } = await signUp(manuela, request, "Manuela");
  await befriend(page, "Ezequiel", manuela, manuelaUser);
  await manuela.close();
  const inaki = await browser.newPage();
  const { username: inakiUser } = await signUp(inaki, request, "Iñaki");
  await befriend(page, "Ezequiel", inaki, inakiUser);

  await logGame(page, "Ezequiel", "Serpiente", { leader: "professor", points: 60 }, [
    { name: "Manuela", known: true, leader: "captain", points: 50 },
    { name: "Jessi", leader: "mystic", points: 40 },
  ]);
  await logGame(inaki, "Iñaki", "Serpiente", { leader: "baroness", points: 55 }, [
    { name: "Ezequiel", known: true, leader: "professor", points: 40 },
    { name: "Jero", leader: "captain", points: 30 },
  ]);
  await inaki.close();
  await logGame(page, "Ezequiel", "Pájaro", { leader: "captain", points: 45 }, [
    { name: "Manuela", known: true, leader: "professor", points: 52 },
  ]);
}

const rows = (page: Page) => page.getByRole("listitem").filter({ has: page.locator("[data-brush-bar]") });

test("ranks everyone you play with, and the Consulta narrows it down", async ({ page, request, browser, isMobile }) => {
  test.skip(isMobile, "the Consulta is the desktop's left page; phones have the sheet (below)");
  test.setTimeout(120_000);
  await seed(page, request, browser);

  // Between Estadísticas and Amigos.
  const nav = page.getByRole("navigation", { name: "Secciones" }).filter({ visible: true });
  await expect(nav.getByRole("link").nth(3)).toHaveText("Rankings");
  await nav.getByRole("link", { name: "Rankings" }).click();
  await expect(page).toHaveURL("/es/rankings");
  await expect(nav.getByRole("link", { name: "Rankings" })).toHaveAttribute("aria-current", "page");

  // Everyone, every leader: by win rate.
  await expect(page.getByText("Con todos los líderes")).toBeVisible();
  await expect(page.getByText("5 jugadores · 3 partidas")).toBeVisible();
  await expect(rows(page)).toHaveText([
    /^1.*Iñaki · amigo.*100\s% · 1 partida/,
    /^2.*Manuela · amigo.*50\s% · 2 partidas/,
    /^3.*Vos.*33\s% · 3 partidas/,
    /^4.*Jero · invitado de Iñaki.*0\s% · 1 partida/,
    /^5.*Jessi · tu invitado.*0\s% · 1 partida/,
  ]);

  // The Profesor in the Serpent's temple: Ezequiel's two games with it.
  await page.getByRole("button", { name: "Profesor" }).click();
  await expect(page.getByRole("button", { name: "Profesor" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Serpiente" }).click();
  await expect(page).toHaveURL("/es/rankings?lider=profesor&templo=serpiente");
  await expect(page.getByText("Con el Profesor en el templo de la Serpiente")).toBeVisible();
  await expect(page.getByText("1 jugador · 2 partidas")).toBeVisible();
  await expect(rows(page)).toHaveText([/^1.*Vos.*50\s% · 2 partidas/]);

  // Other sorts: average points, highest first.
  await page.getByRole("button", { name: "Cualquiera" }).click();
  await expect(page).toHaveURL("/es/rankings?lider=profesor");
  await expect(page.getByText("2 jugadores · 3 partidas")).toBeVisible();
  await page.getByLabel("Ordenar por").selectOption("avgPoints");
  await expect(rows(page)).toHaveText([/^1.*Manuela.*52 · 1 partida/, /^2.*Vos.*50 · 2 partidas/]);

  // Only your guests: friends out (you stay).
  await page.getByRole("button", { name: "Amigos", exact: true }).click();
  await expect(page).toHaveURL("/es/rankings?lider=profesor&quienes=invitados%2Cotros");
  await expect(rows(page)).toHaveText([/Vos/]);
  // The sort stays through a new Consulta.
  await expect(page.getByLabel("Ordenar por")).toHaveValue("avgPoints");

  // Nobody played a combination: say so, and offer the way back.
  await page.goto("/es/rankings?lider=mecanica");
  await expect(page.getByText("Nadie jugó esa combinación todavía.")).toBeVisible();
  await page.getByRole("button", { name: "Limpiar filtros" }).last().click();
  await expect(page).toHaveURL("/es/rankings");
  await expect(rows(page)).toHaveCount(5);
});

test("on phones, Rankings is a switch away from your numbers, with its Consulta in a sheet", async ({
  page,
  request,
  browser,
  isMobile,
}) => {
  test.skip(!isMobile, "the phone's switch and sheet");
  test.setTimeout(120_000);
  await seed(page, request, browser);

  await page.goto("/es/profile");
  const views = page.getByRole("navigation", { name: "Estadísticas" });
  await expect(views.getByRole("link", { name: "Tus números" })).toHaveAttribute("aria-current", "page");
  await views.getByRole("link", { name: "Rankings" }).click();
  await expect(page).toHaveURL("/es/rankings");
  // No tab of its own: Estadísticas stays current.
  await expect(page.getByRole("navigation", { name: "Secciones" }).locator('[aria-current="page"]')).toHaveText("Estadísticas");
  await expect(page.getByText("Todos · ")).toBeHidden();
  await expect(page.getByText("Amigos e invitados · todas las mesas")).toBeVisible();

  // The sheet: a modal dialog; Esc closes it without applying anything.
  await page.getByRole("button", { name: "Cambiar filtros" }).click();
  const sheet = page.getByRole("dialog", { name: "Consulta" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Profesor" }).click();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL("/es/rankings");

  // "Ver ranking" applies it.
  await page.getByRole("button", { name: "Cambiar filtros" }).click();
  await sheet.getByRole("button", { name: "Profesor" }).click();
  await sheet.getByRole("button", { name: "Serpiente" }).click();
  await sheet.getByRole("button", { name: "Ver ranking" }).click();
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL("/es/rankings?lider=profesor&templo=serpiente");
  await expect(page.getByText("Profesor · templo de la Serpiente")).toBeVisible();
  await expect(rows(page)).toHaveText([/Vos.*50\s% · 2 partidas/]);
});
