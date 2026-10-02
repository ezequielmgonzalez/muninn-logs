import { describe, expect, it } from "vitest";

import { signInMethods } from "./sign-in-methods";

describe("signInMethods", () => {
  it("is Google only in production", () => {
    expect(signInMethods({ vercelEnv: "production", googleEnabled: "true" })).toEqual({ google: true, email: false });
  });

  it("also offers an emailed code on previews and locally", () => {
    expect(signInMethods({ vercelEnv: "preview", googleEnabled: "true" })).toEqual({ google: true, email: true });
    expect(signInMethods({ vercelEnv: undefined, googleEnabled: "false" })).toEqual({ google: false, email: true });
  });

  it("never locks everyone out: without Google, production keeps the code", () => {
    expect(signInMethods({ vercelEnv: "production", googleEnabled: "false" })).toEqual({ google: false, email: true });
  });
});
