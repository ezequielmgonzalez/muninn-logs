import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import { InkButton } from "./ink-button";

// LoadMatchFab, in the same module, links with the real helpers, which need the router.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, ...props }: ComponentProps<"a"> & { href: string }) => <a href={href} {...props} />,
}));

describe("InkButton", () => {
  it("paints its stroke behind the label with a brush mask, never a box", () => {
    render(<InkButton>Guardar partida</InkButton>);
    const button = screen.getByRole("button", { name: "Guardar partida" });
    expect(button).toHaveClass("before:ink", "before:ink--band1", "before:bg-ink", "type-ink-button");
    expect(button.className).not.toMatch(/(^|\s)(rounded|shadow|border)(-|\s|$)/);
  });

  it("uses the second stroke on the insert", () => {
    render(<InkButton variant="insert">Cargar partida</InkButton>);
    expect(screen.getByRole("button")).toHaveClass("before:ink--band2", "h-12");
  });

  it("renders its child instead with asChild, e.g. a link", () => {
    render(
      <InkButton asChild>
        <a href="#cargar">Cargar partida</a>
      </InkButton>,
    );
    expect(screen.getByRole("link", { name: "Cargar partida" })).toHaveClass("before:ink--band1");
  });

  it("paints irreversible actions in red ink", () => {
    render(<InkButton tone="danger">Eliminar mi cuenta</InkButton>);
    const button = screen.getByRole("button");
    expect(button).toHaveClass("before:bg-destructive");
    expect(button).not.toHaveClass("before:bg-ink");
  });

  it("fades the ink when disabled", () => {
    render(<InkButton disabled>Guardar partida</InkButton>);
    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button")).toHaveClass("disabled:before:opacity-42");
  });
});
