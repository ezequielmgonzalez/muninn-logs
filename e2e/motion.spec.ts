import { expect, type Page, test } from "@playwright/test";

import { signUp } from "./helpers/auth";
import { addGuest, fillScores, saveMatch } from "./helpers/matches";
import { tableSize } from "./helpers/players";

// Screens rise in and strokes are painted in, unless the system asks for
// reduced motion: then nothing moves at all.

const animationOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).animationName);

test("screens animate in by default", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/es/login");
  expect(await animationOf(page, "main > *")).toBe("enter-rise");
  expect(await animationOf(page, '[data-paint-layer="stroke"]')).toBe("paint-in");
});

test("nothing moves when the system asks for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/es/login");
  expect(await animationOf(page, "main > *")).toBe("none");
  expect(await animationOf(page, '[data-paint-layer="stroke"]')).toBe("none");
});

test("strokes are painted gradually, left to right, not shown all at once", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/es/login");
  // Halfway through its paint animation, the band's stroke is about half revealed.
  const halfway = await page
    .locator('[data-paint-layer="stroke"]')
    .first()
    .evaluate((el) => {
      // Restart it, so the test doesn't race the page's own painting.
      (el as HTMLElement).style.animation = "none";
      void (el as HTMLElement).offsetWidth;
      (el as HTMLElement).style.animation = "";
      const [paint] = el.getAnimations();
      const { delay = 0, duration } = paint.effect!.getTiming();
      paint.pause();
      paint.currentTime = delay + Number(duration) / 2;
      return getComputedStyle(el).clipPath;
    });
  const hidden = Number(halfway.match(/^inset\(0px ([\d.]+)%/)?.[1]);
  expect(hidden).toBeGreaterThan(10);
  expect(hidden).toBeLessThan(90);
});

/** A game won by Ana with this leader and research score. */
async function logGame(page: Page, leader: string, research: number) {
  await page.goto("/es/matches/new");
  await addGuest(page, `G ${leader}`);
  await page.getByLabel("Líder de Ana").selectOption(leader);
  await fillScores(page, "Ana", [research, 1, 1, 1, 1, 0]);
  await fillScores(page, `G ${leader}`, [1, 0, 0, 0, 0, 0]);
  await saveMatch(page);
}

test("a title is painted before the content under it", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await logGame(page, "captain", 10);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/es/profile");
  const section = page.locator("[data-page] > section").filter({ has: page.getByRole("heading", { name: "Win Rate" }) });
  const delays = await section.evaluate((el) => {
    const seconds = (e: Element) => parseFloat(getComputedStyle(e).animationDelay);
    const stroke = el.querySelector('[data-painted-band] [data-paint-layer="stroke"]')!;
    const after = el.querySelector("[data-painted-band] ~ *")!;
    return { stroke: seconds(stroke), after: seconds(after) };
  });
  expect(delays.after).toBeGreaterThan(delays.stroke);
});

test("changing the leaders' order repaints every bar, top to bottom", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await logGame(page, "captain", 10);
  await logGame(page, "mystic", 20);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/es/profile");
  await page.waitForTimeout(2500);

  await page.getByLabel("Ordenar por").selectOption("total.average");
  const bars = await page.locator('[data-brush-bar] [data-paint-layer="stroke"]').evaluateAll((els) =>
    els.map((el) => {
      const [paint] = el.getAnimations();
      return paint ? { running: paint.playState === "running", delay: parseFloat(getComputedStyle(el).animationDelay) } : null;
    }),
  );
  expect(bars.length).toBeGreaterThanOrEqual(2);
  expect(bars.every((b) => b?.running)).toBe(true);
  expect(bars[1]!.delay).toBeGreaterThan(bars[0]!.delay);
});

test("a new player count repaints every bar, keeping the leaders' order", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await logGame(page, "captain", 10);
  await logGame(page, "mystic", 20);
  // And a 3-player game, so the 2-player numbers differ from all of them.
  await page.goto("/es/matches/new");
  await addGuest(page, "Dos");
  await addGuest(page, "Tres");
  await page.getByLabel("Líder de Ana").selectOption("captain");
  await fillScores(page, "Ana", [30, 1, 1, 1, 1, 0]);
  await fillScores(page, "Dos", [1, 0, 0, 0, 0, 0]);
  await fillScores(page, "Tres", [1, 0, 0, 0, 0, 0]);
  await saveMatch(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/es/profile");
  await page.getByLabel("Ordenar por").selectOption("total.average");

  // Tag the leaders' bars: after the change, none of them may be left as it was.
  const bars = page.locator("[data-brush-bar]");
  await expect(bars).toHaveCount(2);
  await bars.evaluateAll((els) => els.forEach((el) => el.setAttribute("data-before", "")));
  await tableSize(page, 3).setChecked(false);

  await expect(page.locator("[data-brush-bar][data-before]")).toHaveCount(0);
  await expect(bars).toHaveCount(2);
  const painting = await page.locator('[data-brush-bar] [data-paint-layer="stroke"]').evaluateAll((els) =>
    els.map((el) => el.getAnimations().some((a) => a.playState === "running")),
  );
  expect(painting.filter(Boolean).length).toBeGreaterThan(0);
  await expect(page.getByLabel("Ordenar por")).toHaveValue("total.average");
});

test("a picked option is circled in pen, drawn around it, and only that one", async ({ page, request }) => {
  await signUp(page, request, "Ana");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/es/matches/new");
  const serpent = page.getByRole("button", { name: "Serpiente" });
  await serpent.click();
  await expect(serpent).toHaveAttribute("aria-pressed", "true");
  const circle = serpent.locator("[data-pen-circle]");
  expect(await circle.evaluate((el) => getComputedStyle(el).animationName)).toBe("pen-draw");
  // The option before it isn't circled any more.
  await expect(page.locator("[aria-pressed] [data-pen-circle]")).toHaveCount(2); // the board side, and the turn order
  await expect(page.getByRole("button", { name: "Sin registrar" }).first().locator("[data-pen-circle]")).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Pájaro" }).click();
  expect(await page.getByRole("button", { name: "Pájaro" }).locator("[data-pen-circle]").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
});
