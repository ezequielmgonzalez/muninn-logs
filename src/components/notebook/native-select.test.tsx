import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NativeSelect } from "./native-select";

describe("NativeSelect", () => {
  it("passes its props to the <select>, so labels and values work as usual", () => {
    render(
      <>
        <label htmlFor="leader">Líder</label>
        <NativeSelect id="leader" defaultValue="mystic" className="flex-1">
          <option value="">Sin líder</option>
          <option value="mystic">Místico</option>
        </NativeSelect>
      </>,
    );
    const select = screen.getByLabelText("Líder");
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveValue("mystic");
    // className sizes the wrapper; the select itself is an underline, not a box.
    expect(select.parentElement).toHaveClass("flex-1");
    expect(select).toHaveClass("border-b-[1.5px]");
    expect(select.className).not.toMatch(/rounded-(md|lg)/);
  });
});
