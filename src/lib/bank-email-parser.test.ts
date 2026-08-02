import { describe, expect, it } from "vitest";
import { parseBankEmail, shouldAutoImport } from "./bank-email-parser";

describe("parseBankEmail", () => {
  it("parses a confirmed card purchase", () => {
    const parsed = parseBankEmail(
      "Compra aprobada",
      "Realizaste una compra por COP 22.000 con tu tarjeta terminada en 4462. Referencia ABC12345",
    );

    expect(parsed.amount).toBe(22000);
    expect(parsed.kind).toBe("expense");
    expect(parsed.status).toBe("posted");
    expect(parsed.accountHint).toBe("4462");
    expect(parsed.reference).toBe("ABC12345");
    expect(shouldAutoImport(parsed)).toBe(true);
  });

  it("does not auto import rejected operations", () => {
    const parsed = parseBankEmail(
      "Compra rechazada",
      "La compra por $63.500 con tu tarjeta *7803 fue rechazada",
    );

    expect(parsed.status).toBe("rejected");
    expect(shouldAutoImport(parsed)).toBe(false);
  });

  it("sends ambiguous messages to review", () => {
    const parsed = parseBankEmail("Aviso importante", "Tienes una novedad en tu cuenta");
    expect(parsed.confidence).toBe(0);
    expect(shouldAutoImport(parsed)).toBe(false);
  });
});
