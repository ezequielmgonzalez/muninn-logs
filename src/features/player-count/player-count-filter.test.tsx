import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import es from "@/i18n/messages/es.json";

import { PlayerCountFilter } from "./player-count-filter";

const refresh = vi.fn();
vi.mock("@/i18n/navigation", () => ({ useRouter: () => ({ refresh }) }));

function renderFilter(value: Parameters<typeof PlayerCountFilter>[0]["value"]) {
  render(
    <NextIntlClientProvider locale="es" messages={es}>
      <PlayerCountFilter value={value} />
    </NextIntlClientProvider>,
  );
  return within(screen.getByRole("group", { name: "Jugadores" }));
}

afterEach(() => {
  document.cookie = "players=; path=/; max-age=0";
  window.history.replaceState(null, "", "/");
  refresh.mockClear();
});

describe("PlayerCountFilter", () => {
  it("is three checkboxes drawn in pen, every size ticked when nothing is filtered", () => {
    const group = renderFilter(null);
    const boxes = group.getAllByRole("checkbox");
    expect(boxes.map((b) => b.getAttribute("aria-label"))).toEqual(["2 jugadores", "3 jugadores", "4 jugadores"]);
    for (const box of boxes) expect(box).toBeChecked();
    expect(group.getAllByRole("checkbox")[0].nextElementSibling?.tagName.toLowerCase()).toBe("svg");
  });

  it("unticking a size stores the rest in the cookie and the URL, and reloads the screen", async () => {
    window.history.replaceState(null, "", "/compare?with=beto");
    const group = renderFilter(null);
    await act(async () => fireEvent.click(group.getByRole("checkbox", { name: "2 jugadores" })));
    expect(document.cookie).toContain("players=3,4");
    expect(window.location.search).toBe("?with=beto&jugadores=3%2C4");
    expect(refresh).toHaveBeenCalled();
  });

  it("ticking every size again clears the filter from the URL and the cookie", async () => {
    window.history.replaceState(null, "", "/profile?jugadores=3%2C4");
    document.cookie = "players=3,4; path=/";
    const group = renderFilter([3, 4]);
    await act(async () => fireEvent.click(group.getByRole("checkbox", { name: "2 jugadores" })));
    expect(window.location.search).toBe("");
    expect(document.cookie).not.toContain("players=");
  });

  it("builds quick changes on each other, before the screen has reloaded", async () => {
    const group = renderFilter(null);
    await act(async () => fireEvent.click(group.getByRole("checkbox", { name: "2 jugadores" })));
    await act(async () => fireEvent.click(group.getByRole("checkbox", { name: "3 jugadores" })));
    expect(document.cookie).toContain("players=4");
    expect(group.getByRole("checkbox", { name: "3 jugadores" })).not.toBeChecked();
  });

  it("shows a spinner from the change until the server's value arrives", async () => {
    const view = render(
      <NextIntlClientProvider locale="es" messages={es}>
        <PlayerCountFilter value={null} />
      </NextIntlClientProvider>,
    );
    await act(async () => fireEvent.click(screen.getByRole("checkbox", { name: "2 jugadores" })));
    const loading = screen.getByRole("status");
    expect(loading).toHaveTextContent("Cargando…");
    expect(loading.querySelector("svg")).not.toBeNull();
    expect(document.documentElement).toHaveAttribute("data-refreshing");

    view.rerender(
      <NextIntlClientProvider locale="es" messages={es}>
        <PlayerCountFilter value={[3, 4]} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(document.documentElement).not.toHaveAttribute("data-refreshing");
  });

  it("keeps the last size ticked, and says why", async () => {
    const group = renderFilter([4]);
    await act(async () => fireEvent.click(group.getByRole("checkbox", { name: "4 jugadores" })));
    expect(group.getByRole("checkbox", { name: "4 jugadores" })).toBeChecked();
    expect(screen.getByText("Tiene que quedar al menos una")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });
});
