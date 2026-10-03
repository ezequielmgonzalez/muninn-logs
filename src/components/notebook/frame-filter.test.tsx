import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import es from "@/i18n/messages/es.json";

import { FramePlayerFilter } from "./frame-filter";

let pathname = "/";
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ refresh: vi.fn() }),
}));

function renderAt(path: string, ui: ReactNode) {
  pathname = path;
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("FramePlayerFilter", () => {
  it("filters the screens with stats or lists of games", () => {
    renderAt("/profile", <FramePlayerFilter value={[3]} placement="insert" />);
    const group = screen.getByRole("group", { name: "Jugadores" });
    expect(within(group).getByRole("checkbox", { name: "3 jugadores" })).toBeChecked();
    expect(within(group).getByRole("checkbox", { name: "2 jugadores" })).not.toBeChecked();
  });

  it("keeps its place on the insert elsewhere, hidden, so the navigation doesn't move", () => {
    const { container } = renderAt("/friends", <FramePlayerFilter value={null} placement="insert" />);
    expect(screen.queryByRole("group")).toBeNull();
    const box = container.firstElementChild!;
    expect(box).toHaveClass("invisible");
    expect(box).toHaveAttribute("inert");
  });

  it("isn't on the phone's page elsewhere", () => {
    const { container } = renderAt("/friends", <FramePlayerFilter value={null} placement="phone" />);
    expect(container).toBeEmptyDOMElement();
  });
});
