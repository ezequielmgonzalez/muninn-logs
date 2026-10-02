import { afterEach, describe, expect, it, vi } from "vitest";

import { sendCode, verifyCode } from "./actions";

const signInWithOtp = vi.fn();
const verifyOtp = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signInWithOtp, verifyOtp } }),
}));
vi.mock("@/i18n/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/log", () => ({ logUnexpected: vi.fn() }));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("email sign-in in production", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses to send or check codes: the form isn't the only guard", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_AUTH_GOOGLE_ENABLED", "true");
    expect(await sendCode({ status: "idle" }, form({ email: "ana@example.com" }))).toMatchObject({ error: "emailDisabled" });
    expect(
      await verifyCode({ status: "idle" }, form({ email: "ana@example.com", code: "123456", locale: "es" })),
    ).toMatchObject({ error: "emailDisabled" });
    expect(signInWithOtp).not.toHaveBeenCalled();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("sends codes elsewhere", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    signInWithOtp.mockResolvedValueOnce({ error: null });
    expect(await sendCode({ status: "idle" }, form({ email: "ana@example.com" }))).toEqual({
      status: "code-sent",
      email: "ana@example.com",
    });
  });
});
