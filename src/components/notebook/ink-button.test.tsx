import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { InkButton } from "./ink-button";

// LoadMatchFab, in the same module, links with the real helpers, which need the router.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => <a href={href} {...props} />,
}));

describe("InkButton", () => {
  it("draws a pen box around the label with a wash of ink inside, never a brush stroke", () => {
    render(<InkButton>Guardar partida</InkButton>);
    const button = screen.getByRole("button", { name: "Guardar partida" });
    expect(button).toHaveClass("before:ink", "before:ink--pen-box", "before:bg-ink", "after:bg-ink/7", "text-ink", "type-ink-button");
    expect(button.className).not.toMatch(/ink--band|ink--tab|band-text/);
    expect(button.className).not.toMatch(/(^|\s)(rounded|shadow|border)(-|\s|$)/);
  });

  it("draws a screen's main action in with the screen", () => {
    render(<InkButton>Guardar partida</InkButton>);
    expect(screen.getByRole("button")).toHaveClass("before:paint-in");
  });

  it("isn't drawn again on the insert, which stays between screens", () => {
    render(<InkButton variant="insert">Cargar partida</InkButton>);
    expect(screen.getByRole("button")).toHaveClass("before:ink--pen-box", "h-12");
    expect(screen.getByRole("button")).not.toHaveClass("before:paint-in");
  });

  it("renders its child instead with asChild, e.g. a link", () => {
    render(
      <InkButton asChild>
        <a href="#cargar">Cargar partida</a>
      </InkButton>,
    );
    expect(screen.getByRole("link", { name: "Cargar partida" })).toHaveClass("before:ink--pen-box");
  });

  it("draws irreversible actions in red ink", () => {
    render(<InkButton tone="danger">Eliminar mi cuenta</InkButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-destructive", "before:bg-destructive", "after:bg-destructive/7");
    expect(button).not.toHaveClass("before:bg-ink");
    expect(button).not.toHaveClass("after:bg-ink/7");
  });

  it("fades when disabled", () => {
    render(<InkButton disabled>Guardar partida</InkButton>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveClass("disabled:opacity-45");
  });
});
