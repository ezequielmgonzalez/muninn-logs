import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";

import en from "@/i18n/messages/en.json";

import { LocaleSwitcher } from "./locale-switcher";

// The real navigation helpers need the Next.js router, which doesn't exist in
// unit tests. Replace them with a plain <a> that shows the target locale.
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/",
  Link: ({
    locale,
    href,
    ...props
  }: ComponentProps<"a"> & { locale: string; href: string }) => (
    <a href={`/${locale}${href === "/" ? "" : href}`} {...props} />
  ),
}));

function renderInLocale(locale: "es" | "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={en}>
      <LocaleSwitcher />
    </NextIntlClientProvider>,
  );
}

describe("LocaleSwitcher", () => {
  it("links to every locale", () => {
    renderInLocale("en");

    expect(screen.getByRole("link", { name: "Español" })).toHaveAttribute(
      "href",
      "/es",
    );
    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "href",
      "/en",
    );
  });

  it("marks the current locale", () => {
    renderInLocale("en");

    expect(screen.getByRole("link", { name: "English" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "Español" })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
