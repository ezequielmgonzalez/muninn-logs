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
