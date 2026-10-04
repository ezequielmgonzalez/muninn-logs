import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PenCheck } from "./pen-checkbox";

describe("PenCheck", () => {
  it("is a real checkbox named by its text, and the whole label takes the tap", () => {
    const onChange = vi.fn();
    render(
      <PenCheck checked={false} onChange={onChange}>
        Amigos
      </PenCheck>,
    );
    const box = screen.getByRole("checkbox", { name: "Amigos" });
    expect(box).not.toBeChecked();
    fireEvent.click(screen.getByText("Amigos"));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("takes a longer name for screen readers when what shows is short", () => {
    render(
      <PenCheck checked onChange={() => {}} label="3 jugadores">
        3
      </PenCheck>,
    );
    expect(screen.getByRole("checkbox", { name: "3 jugadores" })).toBeChecked();
    expect(screen.getByText("3")).toHaveAttribute("aria-hidden", "true");
  });
});
