import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import es from "@/i18n/messages/es.json";

import { FrameControls } from "./frame-filter";

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

describe("FrameControls", () => {
  it("switches the game and filters table sizes on the screens with stats or lists of games", () => {
    renderAt("/profile", <FrameControls game="arnak" playerCounts={[3]} placement="insert" />);
    const game = screen.getByRole("group", { name: "Juego" });
    expect(within(game).getByRole("button", { name: "Arnak" })).toHaveAttribute("aria-pressed", "true");
    expect(within(game).getByRole("button", { name: "LOTR Duel" })).toHaveAttribute("aria-pressed", "false");
    const counts = screen.getByRole("group", { name: "Jugadores" });
    expect(within(counts).getByRole("checkbox", { name: "3 jugadores" })).toBeChecked();
    expect(within(counts).getByRole("checkbox", { name: "2 jugadores" })).not.toBeChecked();
  });

  it("has no table sizes for a duel, but keeps their place on the insert", () => {
    const { container } = renderAt("/profile", <FrameControls game="lotr-duel" playerCounts={null} placement="insert" />);
    expect(screen.getByRole("button", { name: "LOTR Duel" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("group", { name: "Jugadores" })).toBeNull();
    expect(container.firstElementChild!.lastElementChild).toHaveClass("invisible");
  });

  it("keeps their place on the insert elsewhere, hidden, so the navigation doesn't move", () => {
    const { container } = renderAt("/friends", <FrameControls game="arnak" playerCounts={null} placement="insert" />);
    expect(screen.queryByRole("group")).toBeNull();
    for (const box of container.firstElementChild!.children) {
      expect(box).toHaveClass("invisible");
      expect(box).toHaveAttribute("inert");
    }
  });

  it("isn't on the phone's page elsewhere", () => {
    const { container } = renderAt("/friends", <FrameControls game="arnak" playerCounts={null} placement="phone" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("only switches the game on a new match's form", () => {
    renderAt("/matches/new", <FrameControls game="arnak" playerCounts={null} placement="phone" />);
    expect(screen.getByRole("group", { name: "Juego" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "Jugadores" })).toBeNull();
  });
});
