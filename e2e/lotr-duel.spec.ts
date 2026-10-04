import { expect, type Page, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";

// LOTR Duel, the notebook's second game: the switch, logging and editing a
// duel, and its stats. What a duel's numbers mean is tested in the database
// (lotr_duel.test.sql); here, the screens.

/** The notebook's game switch: on the insert on desktop, at the top of the page on phones. */
const game = (page: Page) => page.getByRole("group", { name: "Juego" }).filter({ visible: true });

async function switchTo(page: Page, name: "Arnak" | "LOTR Duel") {
  await game(page).getByRole("button", { name }).click();
  await expect(game(page).getByRole("button", { name })).toHaveAttribute("aria-pressed", "true");
}

/** Logs a duel against Jessi: who played Sauron, who won and how. */
async function logDuel(page: Page, sauron: "Ezequiel" | "Jessi", winner: RegExp, victory?: string, firstWithJessi = false) {
  await page.goto("/es/matches/new");
  await expect(page.getByRole("heading", { name: "Nuevo duelo" })).toBeVisible();
  if (firstWithJessi) await addGuest(page, "Jessi");
  else {
    await page.getByLabel("Agregar jugador").fill("Jessi");
    await page.getByRole("button", { name: /^Jessi/ }).first().click();
  }
  await page.getByRole("group", { name: "¿Quién jugó con Sauron?" }).getByRole("button", { name: sauron }).click();
  await page.getByRole("group", { name: "¿Quién ganó?" }).getByRole("button", { name: winner }).click();
  if (victory) await page.getByRole("group", { name: "¿Cómo ganó?" }).getByRole("button", { name: victory }).click();
  await page.getByRole("button", { name: "Guardar duelo" }).click();
  await expect(page).toHaveURL(/\/es\/matches\/[0-9a-f-]{36}\?saved=1$/);
}

test("a second game: switch to LOTR Duel, log and edit duels, and see their stats", async ({ page, request }) => {
  test.setTimeout(120_000);
  await signUp(page, request, "Ezequiel");

  // An Arnak game first: it stays Arnak's.
  await page.goto("/es/matches/new");
  await addGuest(page, "Toto");
  await fillScores(page, "Ezequiel", [10, 0, 0, 0, 0, 0]);
  await fillScores(page, "Toto", [5, 0, 0, 0, 0, 0]);
  await saveMatch(page);

  // The switch: Arnak, then LOTR Duel, remembered from screen to screen. No table sizes for a duel.
  await page.goto("/es");
  await expect(game(page).getByRole("button", { name: "Arnak" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Jugadores" }).filter({ visible: true })).toBeVisible();
  await switchTo(page, "LOTR Duel");
  await expect(page).toHaveURL("/es?juego=lotr");
  await expect(page.getByText("0 duelos registrados").filter({ visible: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Jugadores" }).filter({ visible: true })).toHaveCount(0);

  // The form asks for the players, who played Sauron, who won and how; the summary says what will be saved.
  await page.goto("/es/matches/new");
  await addGuest(page, "Jessi");
  await expect(page.getByText("Elegí quién jugó con Sauron.").filter({ visible: true })).toBeVisible();
  await page.getByRole("group", { name: "¿Quién jugó con Sauron?" }).getByRole("button", { name: "Ezequiel" }).click();
  await expect(page.getByText("Jessi jugó con la Comunidad del Anillo.")).toBeVisible();
  await page.getByRole("group", { name: "¿Quién ganó?" }).getByRole("button", { name: /^Sauron/ }).click();
  await expect(page.getByRole("group", { name: "¿Cómo ganó?" })).toBeVisible();
  await page.getByRole("group", { name: "¿Cómo ganó?" }).getByRole("button", { name: "Carrera del Anillo" }).click();
  await expect(page.getByText("Gana Ezequiel (Sauron) · Carrera del Anillo").filter({ visible: true })).toBeVisible();
  await page.getByRole("button", { name: "Guardar duelo" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/es\/matches\/[0-9a-f-]{36}\?saved=1$/);
  await expect(page.getByText("Ganó Ezequiel")).toBeVisible();
  await expect(page.getByText("Victoria: Carrera del Anillo")).toBeVisible();

  // A draw (no victory to choose), and a loss.
  await logDuel(page, "Jessi", /^Empate/);
  await expect(page.getByText("Empate", { exact: true })).toBeVisible();
  await logDuel(page, "Jessi", /^Sauron/, "Tierra Media");

  // Partidas: only the duels, with how each ended for you.
  await page.goto("/es/matches");
  const entries = page.getByRole("link", { name: /Jessi/ });
  await expect(entries).toHaveCount(3);
  await expect(entries.nth(0)).toContainText("Perdiste");
  await expect(entries.nth(0)).toContainText("Ganó Jessi · Tierra Media");
  await expect(entries.nth(1)).toContainText("Empataste");
  await expect(entries.nth(2)).toContainText("Ganaste");

  // Editing the draw: the form comes back as it was saved, and becomes a win by influence.
  await entries.nth(1).click();
  await page.getByRole("link", { name: "Editar partida" }).click();
  await expect(page.getByRole("heading", { name: "Editar duelo" })).toBeVisible();
  const sauron = page.getByRole("group", { name: "¿Quién jugó con Sauron?" });
  await expect(sauron.getByRole("button", { name: "Jessi" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "¿Quién ganó?" }).getByRole("button", { name: "Empate" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("group", { name: "¿Quién ganó?" }).getByRole("button", { name: /^La Comunidad del Anillo/ }).click();
  await page.getByRole("group", { name: "¿Cómo ganó?" }).getByRole("button", { name: "Influencia" }).click();
  await page.getByRole("button", { name: "Guardar duelo" }).filter({ visible: true }).click();
  await expect(page.getByText("Ganó Ezequiel")).toBeVisible();
  await expect(page.getByText("Victoria: Influencia")).toBeVisible();

  // Estadísticas: 2 won, 1 lost; by side, by victory, and against Jessi.
  await page.goto("/es/profile");
  await expect(page.getByRole("img", { name: /^67\s% de 3 partidas$/ })).toBeVisible();
  const figures = page.getByRole("definition");
  await expect(figures.nth(0)).toHaveText("2"); // Victorias
  await expect(figures.nth(1)).toHaveText("0"); // Empates
  await expect(figures.nth(2)).toHaveText("1"); // Derrotas
  await expect(page.getByText(/Sauron\s*· ganaste 100\s%/)).toBeVisible();
  await expect(page.getByText(/Comunidad\s*· ganaste 50\s%/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cómo ganaste" })).toBeVisible();
  await expect(page.getByText("Jessi · 2 G · 0 E · 1 P")).toBeVisible();

  // Back to Arnak: its game is still there, the duels aren't.
  await switchTo(page, "Arnak");
  await page.goto("/es/matches");
  await expect(page.getByRole("link", { name: /Toto/ })).toHaveCount(1);
  await expect(page.getByRole("link", { name: /Jessi/ })).toHaveCount(0);
});

test("Rankings for a duel: by side, sorted by win rate or games", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "the Consulta is the desktop's left page; phones have the same picks in a sheet");
  test.setTimeout(90_000);
  await signUp(page, request, "Ezequiel");
  await page.goto("/es");
  await switchTo(page, "LOTR Duel");
  await logDuel(page, "Ezequiel", /^Sauron/, "Razas", true);
  await logDuel(page, "Jessi", /^Sauron/, "Influencia");

  await page.goto("/es/rankings");
  const side = page.getByRole("group", { name: "Bando", exact: true });
  // Each side with its emoji, as leaders are shown.
  await expect(side.getByRole("button")).toHaveText(["Los dos bandos", /Sauron$/, /La Comunidad del Anillo$/]);
  await expect(page.getByRole("group", { name: "Templo", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Ordenar por").locator("option")).toHaveText(["Win Rate", "Partidas"]);

  // As Sauron, each won their one game.
  await side.getByRole("button", { name: "Sauron" }).click();
  await expect(page).toHaveURL(/bando=sauron/);
  await expect(page.getByText("Con Sauron")).toBeVisible();
  const rows = page.getByRole("listitem").filter({ has: page.locator("[data-brush-bar]") });
  // A tie: by name.
  await expect(rows).toHaveText([/Vos.*100\s% · 1 partida/, /Jessi.*100\s% · 1 partida/]);
});
