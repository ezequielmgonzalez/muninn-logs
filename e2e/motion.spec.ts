import { expect, type Page, test } from "@playwright/test";

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
