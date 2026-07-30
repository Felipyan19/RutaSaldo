import { describe, expect, it } from "vitest";
import { createGoogleAuthIntent, verifyGoogleAuthIntent } from "./auth-intent";

describe("Google auth intent", () => {
  it("preserves the explicit registration mode and consent version", () => {
    const token = createGoogleAuthIntent("register", "v1");

    expect(verifyGoogleAuthIntent(token)).toMatchObject({
      mode: "register",
      consentVersion: "v1",
    });
  });

  it("rejects a tampered OAuth intent", () => {
    const token = createGoogleAuthIntent("login");
    const tampered = `${token}x`;

    expect(verifyGoogleAuthIntent(tampered)).toBeNull();
  });
});
