import { render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import es from "@/i18n/messages/es.json";

import { SideNav, TabBar } from "./navigation";

// The real navigation helpers need the Next.js router: use a plain <a>, and
// the screen being shown.
let pathname = "/";
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => <a href={href} {...props} />,
  usePathname: () => pathname,
}));
// Server-side translations, from the real Spanish messages.
vi.mock("next-intl/server", () => ({
  getTranslations: async (namespace: keyof typeof es) => (key: string) =>
    (es[namespace] as Record<string, string>)[key],
}));

describe("SideNav", () => {
  it("links every section and marks the current one", async () => {
    pathname = "/profile";
    render(await SideNav({ active: "stats" }));
    const nav = screen.getByRole("navigation", { name: "Secciones" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Inicio", "/"],
      ["Partidas", "/matches"],
      ["Estadísticas", "/profile"],
      ["Amigos", "/friends"],
    ]);
    const current = within(nav).getByRole("link", { current: "page" });
    expect(current).toHaveTextContent("Estadísticas");
    // Every item has its stroke, shown by CSS on the current one or a clicked one.
    expect(links.map((l) => l.querySelector("[data-nav-stroke]")?.classList.contains("ink--sweep"))).toEqual([true, true, true, true]);
    expect(links.map((l) => l.getAttribute("data-section"))).toEqual(["home", "matches", "stats", "friends"]);
    // Other sections turn the diary's page towards them; the current one doesn't.
    expect(links.map((l) => l.getAttribute("data-turn"))).toEqual(["backward", "backward", null, "forward"]);
  });

  it("turns back to the current section from one of its inner screens", async () => {
    pathname = "/matches/some-match";
    render(await SideNav({ active: "matches" }));
    const current = screen.getByRole("link", { current: "page" });
    expect(current).toHaveTextContent("Partidas");
    expect(current).toHaveAttribute("data-turn", "backward");
  });

  it("ends with the ink button to log a match", async () => {
    render(await SideNav({}));
    const log = screen.getByRole("link", { name: "Cargar partida" });
    expect(log).toHaveAttribute("href", "/matches/new");
    expect(log).toHaveAttribute("data-slot", "ink-button");
    expect(log).toHaveAttribute("data-turn", "forward");
  });
});

describe("TabBar", () => {
  it("has the four sections around the raised log button", async () => {
    pathname = "/";
    render(await TabBar({ active: "home" }));
    const nav = screen.getByRole("navigation", { name: "Secciones" });
    expect(within(nav).getAllByRole("link").map((l) => l.getAttribute("aria-label") ?? l.textContent)).toEqual([
      "Inicio",
      "Partidas",
      "Cargar partida",
      "Estadísticas",
      "Amigos",
    ]);
    expect(within(nav).getByRole("link", { current: "page" })).toHaveTextContent("Inicio");
    expect(nav.querySelectorAll("[data-nav-stroke].ink--tab")).toHaveLength(4);
  });

  it("paints nothing when the screen isn't a section (e.g. a legal page)", async () => {
    render(await TabBar({}));
    expect(screen.queryByRole("link", { current: "page" })).toBeNull();
  });
});
