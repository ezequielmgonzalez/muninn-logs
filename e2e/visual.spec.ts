import { expect, type Page, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { befriend } from "./helpers/friends";
import { addGuest, fillScores, saveMatch, setDate } from "./helpers/matches";

// Screenshots of each screen at the mockups' sizes (design/screens/*.html), so a
// change that alters how a screen looks shows up as a diff. The references in
// e2e/__screenshots__ come from CI: fonts render differently on each OS, so
// these only run on Linux. To update them, see "Screenshots" in CLAUDE.md.

const SIZES = {
  desktop: { width: 1280, height: 1000 },
  phone: { width: 390, height: 844 },
} as const;

test.skip(process.platform !== "linux", "References are made on CI (Linux); fonts render differently elsewhere.");

/** One browser is enough: the sizes are set here, not by the project. */
function onlyOnce() {
  test.skip(test.info().project.name !== "desktop", "Runs once, in the desktop project.");
}

/** Both sizes of the page as it is now. Usernames are random per run, so they're masked. */
async function snap(page: Page, name: string) {
  await page.waitForLoadState("networkidle");
  await page.mouse.move(0, 0);
  for (const [size, viewport] of Object.entries(SIZES)) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page).toHaveScreenshot(`${name}-${size}.png`, { mask: [page.getByText(/@?e2e_\w+/)] });
  }
}

/** Adds someone already known (a friend or an earlier guest) to the match form. */
async function addKnown(page: Page, name: string) {
  await page.getByLabel("Agregar jugador").fill(name);
  await page.getByRole("button", { name: new RegExp(`^${name}`) }).first().click();
}

type Game = { date: string; leader: string; others: { name: string; known?: boolean; scores: number[] }[]; mine: number[] };

async function logGame(page: Page, me: string, game: Game) {
  await page.goto("/es/matches/new");
  await setDate(page, game.date);
  for (const other of game.others) {
    if (other.known) await addKnown(page, other.name);
    else await addGuest(page, other.name);
  }
  await page.getByLabel(`Líder de ${me}`).selectOption(game.leader);
  await fillScores(page, me, game.mine);
  for (const other of game.others) await fillScores(page, other.name, other.scores);
  await saveMatch(page);
}

test("screens before signing in", async ({ page }) => {
  onlyOnce();
  await page.goto("/es");
  await snap(page, "landing");
  await page.goto("/es/login");
  await snap(page, "login");
});

test("screens of a diary with games and friends", async ({ page, request, browser }) => {
  onlyOnce();
  test.setTimeout(180_000);
  await signUp(page, request, "Ezequiel");

  // Two friends, each with a game of their own, to compare with.
  const friends: string[] = [];
  for (const [name, leader, scores] of [
    ["Manuela", "baroness", [24, 7, 12, 12, 13, 2]],
    ["Iñaki", "professor", [20, 7, 13, 11, 13, 2]],
  ] as const) {
    const other = await browser.newPage();
    const { username } = await signUp(other, request, name);
    await logGame(other, name, {
      date: "2026-09-10",
      leader,
      mine: [...scores],
      others: [{ name: "Toto", scores: [8, 4, 6, 5, 9, 2] }],
    });
    await befriend(page, "Ezequiel", other, username);
    await other.close();
    friends.push(username);
  }

  const games: Game[] = [
    {
      date: "2026-09-29",
      leader: "captain",
      mine: [24, 8, 14, 12, 11, 2],
      others: [
        { name: "Manuela", known: true, scores: [21, 12, 10, 15, 13, 1] },
        { name: "Jessi", scores: [18, 4, 16, 10, 14, 3] },
      ],
    },
    { date: "2026-09-21", leader: "baroness", mine: [5, 4, 6, 3, 10, 3], others: [{ name: "Iñaki", known: true, scores: [8, 5, 6, 3, 7, 0] }] },
    { date: "2026-09-03", leader: "captain", mine: [20, 6, 12, 10, 14, 1], others: [{ name: "Jessi", known: true, scores: [9, 9, 9, 9, 9, 0] }] },
    { date: "2026-08-14", leader: "mystic", mine: [3, 3, 3, 3, 3, 3], others: [{ name: "Roberto", scores: [12, 9, 9, 9, 9, 0] }] },
  ];
  for (const game of games) await logGame(page, "Ezequiel", game);

  await page.goto("/es");
  await snap(page, "inicio");
  await page.goto("/es/matches");
  await snap(page, "partidas");
  await page.goto("/es/profile");
  await snap(page, "estadisticas");
  await page.goto("/es/friends");
  await snap(page, "amigos");
  await page.goto(`/es/compare?with=${friends[0]}&with=${friends[1]}`);
  await snap(page, "comparar");

  // The form mid-game: two players at the table, leaders, a temple and scores.
  await page.goto("/es/matches/new");
  await setDate(page, "2026-10-01");
  await page.getByRole("button", { name: "Pájaro" }).click();
  await page.getByLabel(/^Duración/).fill("75");
  await addKnown(page, "Manuela");
  await page.getByLabel("Líder de Ezequiel").selectOption("captain");
  await page.getByLabel("Líder de Manuela").selectOption("journalist");
  await fillScores(page, "Ezequiel", [24, 8, 14, 12, 11, 2]);
  await fillScores(page, "Manuela", [21, 12, 10, 15, 13, 1]);
  await snap(page, "cargar-partida");
});
