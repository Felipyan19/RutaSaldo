import { describe, expect, it } from "vitest";
import { normalizeVoiceHint, scoreVoiceHint, voiceFinanceDraftSchema } from "./voice-finance";

const accounts = [
  { id: "rappi", labels: ["Rappi Nomina 😎", "RappiPay", "RappiPay Rappi Nomina"] },
  { id: "nequi", labels: ["Nequi", "Billetera Nequi"] },
];

describe("voice finance drafts", () => {
  it("normalizes accents and symbols", () => {
    expect(normalizeVoiceHint("  Nómina 😎 RappiPay ")).toBe("nomina rappipay");
  });

  it("matches a unique account hint", () => {
    expect(scoreVoiceHint("mi cuenta de Rappi", accounts)).toBe("rappi");
    expect(scoreVoiceHint("Nequi", accounts)).toBe("nequi");
  });

  it("does not select an account when the hint is absent or ambiguous", () => {
    expect(scoreVoiceHint(null, accounts)).toBeNull();
    expect(scoreVoiceHint("cuenta", [
      { id: "one", labels: ["Cuenta uno"] },
      { id: "two", labels: ["Cuenta dos"] },
    ])).toBeNull();
  });

  it("rejects incomplete or unsafe structured responses", () => {
    expect(voiceFinanceDraftSchema.safeParse({ operation: "expense", amount: -1 }).success).toBe(false);
  });
});
