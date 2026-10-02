import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import es from "@/i18n/messages/es.json";

import { LoginForm } from "./login-form";

vi.mock("./actions", () => ({ sendCode: vi.fn(), verifyCode: vi.fn() }));
// The ink button's module links with the real helpers, which need the router.
vi.mock("@/i18n/navigation", () => ({ Link: () => null, usePathname: () => "/", useRouter: () => ({}) }));
vi.mock("@/lib/supabase/client", () => ({ createClient: vi.fn() }));

function renderForm(props: { googleEnabled: boolean; emailEnabled: boolean; oauthError?: boolean }) {
  return render(
    <NextIntlClientProvider locale="es" messages={es}>
      <LoginForm oauthError={false} {...props} />
    </NextIntlClientProvider>,
  );
}

describe("LoginForm", () => {
  it("offers only Google, as the main action, when email codes are off (production)", () => {
    renderForm({ googleEnabled: true, emailEnabled: false });
    expect(screen.queryByLabelText("Email")).toBeNull();
    const google = screen.getByRole("button", { name: "Continuar con Google" });
    expect(google).toHaveAttribute("data-slot", "ink-button");
  });

  it("still says when Google sign-in failed", () => {
    renderForm({ googleEnabled: true, emailEnabled: false, oauthError: true });
    expect(screen.getByRole("alert")).toHaveTextContent("No pudimos iniciar sesión con Google.");
  });

  it("offers the emailed code first, and Google too, elsewhere", () => {
    renderForm({ googleEnabled: true, emailEnabled: true });
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar código" })).toHaveAttribute("data-slot", "ink-button");
    expect(screen.getByRole("button", { name: "Continuar con Google" })).not.toHaveAttribute("data-slot", "ink-button");
  });
});
