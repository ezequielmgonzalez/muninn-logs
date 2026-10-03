import { expect, type Page } from "@playwright/test";

/** The "Jugadores" filter on screen (the insert's on desktop, the page's on phones). */
export function tableSizes(page: Page) {
  return page.getByRole("group", { name: "Jugadores" }).filter({ visible: true });
}

export function tableSize(page: Page, size: number) {
  return tableSizes(page).getByRole("checkbox", { name: `${size} jugadores` });
}

/**
 * Leaves exactly these table sizes ticked, waiting for the screen to reload
 * after each change. Ticks first, so one always stays ticked.
 */
export async function pickTableSizes(page: Page, sizes: number[]) {
  const changes = [
    ...sizes.map((size) => [size, true] as const),
    ...[2, 3, 4].filter((size) => !sizes.includes(size)).map((size) => [size, false] as const),
  ];
  for (const [size, ticked] of changes) {
    const box = tableSize(page, size);
    if ((await box.isChecked()) === ticked) continue;
    await box.setChecked(ticked);
    await expect(box).toBeChecked({ checked: ticked });
    await expect(page.locator("html")).not.toHaveAttribute("data-refreshing");
  }
}
