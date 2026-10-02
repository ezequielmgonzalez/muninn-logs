import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { ClearPendingSection, TurnLink } from "./page-turn";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => <a href={href} {...props} />,
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("TurnLink", () => {
  it("paints its section in the navigation the moment it's clicked", () => {
    render(
      <>
        <nav>
          <a href="#inicio" data-nav-item data-section="home" aria-current="page">
            Inicio
          </a>
          <a href="#estadisticas" data-nav-item data-section="stats">
            Estadísticas
          </a>
        </nav>
        <TurnLink href="/profile" section="stats" direction="forward">
          Ver estadísticas
        </TurnLink>
      </>,
    );
    fireEvent.click(screen.getByText("Ver estadísticas"));
    expect(screen.getByText("Estadísticas")).toHaveAttribute("data-pending");
    // The page root keeps it through the loading notebook, until the real navigation clears it.
    expect(document.documentElement).toHaveAttribute("data-pending-section", "stats");
    render(<ClearPendingSection />);
    expect(document.documentElement).not.toHaveAttribute("data-pending-section");
    // The link itself isn't a navigation item, so it isn't marked.
    expect(screen.getByText("Ver estadísticas")).not.toHaveAttribute("data-pending");
    expect(screen.getByText("Inicio")).not.toHaveAttribute("data-pending");
  });

  it("leaves new-tab clicks to the browser", () => {
    render(
      <>
        <a href="#estadisticas" data-nav-item data-section="stats">
          Estadísticas
        </a>
        <TurnLink href="/profile" section="stats" direction="forward">
          Ver estadísticas
        </TurnLink>
      </>,
    );
    fireEvent.click(screen.getByText("Ver estadísticas"), { metaKey: true });
    expect(screen.getByText("Estadísticas")).not.toHaveAttribute("data-pending");
  });
});
