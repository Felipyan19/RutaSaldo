import { describe, expect, it } from "vitest";
import { normalizedMovementFingerprint, parseBankEmail, shouldAutoImport } from "./bank-email-parser";

describe("parseBankEmail", () => {
  it("parses a Bancolombia confirmed purchase and categorizes the merchant", () => {
    const parsed = parseBankEmail(
      "Compra aprobada Bancolombia",
      "Realizaste una compra por COP 22.000 en Tostao con tu tarjeta terminada en 4462. Referencia ABC12345",
      "alertas@bancolombia.com.co",
    );

    expect(parsed.institution).toBe("bancolombia");
    expect(parsed.amount).toBe(22000);
    expect(parsed.kind).toBe("purchase");
    expect(parsed.status).toBe("posted");
    expect(parsed.accountLastFour).toBe("4462");
    expect(parsed.reference).toBe("ABC12345");
    expect(parsed.categorySlug).toBe("restaurants");
    expect(shouldAutoImport(parsed)).toBe(true);
  });

  it("does not auto import rejected RappiCard operations", () => {
    const parsed = parseBankEmail(
      "Compra rechazada RappiCard",
      "La compra por $63.500 con tu RappiCard *2827 fue rechazada",
      "notificaciones@rappipay.co",
    );

    expect(parsed.institution).toBe("rappicard");
    expect(parsed.status).toBe("rejected");
    expect(shouldAutoImport(parsed)).toBe(false);
  });

  it("does not auto import pending card purchases", () => {
    const parsed = parseBankEmail(
      "Compra pendiente",
      "Tu compra por COP 15.900 en Dollarcity con la tarjeta terminada en 7803 está pendiente por confirmar. Bancolombia",
    );

    expect(parsed.status).toBe("pending");
    expect(parsed.categorySlug).toBe("shopping");
    expect(shouldAutoImport(parsed)).toBe(false);
  });

  it("distinguishes incoming and outgoing transfers", () => {
    const incoming = parseBankEmail("Nequi", "Recibiste una transferencia por $80.000. Código NQ123456", "notificaciones@nequi.com.co");
    const outgoing = parseBankEmail("Wise", "Enviaste una transferencia por COP 80.000. Referencia WS123456", "noreply@wise.com");

    expect(incoming.kind).toBe("transfer_received");
    expect(outgoing.kind).toBe("transfer_sent");
  });

  it("identifies card payments and withdrawals", () => {
    const payment = parseBankEmail("Bancolombia", "Realizaste un pago a tu tarjeta terminada en 4462 por COP 500.000. Referencia PAY12345");
    const withdrawal = parseBankEmail("Nequi", "Retiraste $100.000 en un cajero. Código RET12345");

    expect(payment.kind).toBe("card_payment");
    expect(withdrawal.kind).toBe("withdrawal");
  });

  it("uses a normalized movement fingerprint instead of the raw email body", () => {
    const first = parseBankEmail("Compra aprobada Bancolombia", "Compra por COP 22.000 en KOAJ, tarjeta *4462. Referencia REF12345");
    const second = parseBankEmail("Compra aprobada Bancolombia", "  Compra por COP 22.000 en KOAJ, tarjeta *4462. Referencia REF12345  \nPie promocional distinto");

    expect(normalizedMovementFingerprint(first)).toContain("REF12345");
    expect(normalizedMovementFingerprint(first)).not.toBe("");
    expect(first.categorySlug).toBe("clothing");
    expect(second.categorySlug).toBe("clothing");
  });

  it("sends ambiguous messages to review", () => {
    const parsed = parseBankEmail("Aviso importante", "Tienes una novedad en tu cuenta");
    expect(parsed.confidence).toBe(0);
    expect(shouldAutoImport(parsed)).toBe(false);
  });
});
