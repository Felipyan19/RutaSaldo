export type ParsedBankEmail = {
  status: "posted" | "rejected" | "reversed" | "unknown";
  kind: "expense" | "income" | "transfer" | "payment" | "unknown";
  amount: number | null;
  occurredAt: string | null;
  description: string;
  reference: string | null;
  accountHint: string | null;
  confidence: number;
};

const MONEY_PATTERNS = [
  /(?:COP|\$)\s*([\d.]+(?:,\d{1,2})?)/i,
  /(?:por|valor(?:\s+de)?)\s+([\d.]+(?:,\d{1,2})?)\s*(?:COP|pesos)?/i,
];

function parseCop(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? Math.round(amount) : null;
}

function findAmount(text: string) {
  for (const pattern of MONEY_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return parseCop(match[1]);
  }
  return null;
}

function findAccountHint(text: string) {
  const match = text.match(/(?:terminada?\s+en|finalizada?\s+en|\*{1,4})\s*(\d{4})/i);
  return match?.[1] ?? null;
}

function findReference(text: string) {
  const match = text.match(/(?:referencia|comprobante|transacci[oó]n|c[oó]digo)\s*[:#-]?\s*([A-Z0-9-]{5,})/i);
  return match?.[1] ?? null;
}

function detectStatus(text: string): ParsedBankEmail["status"] {
  if (/rechazad[ao]|declinad[ao]|no fue aprobada|fallida/i.test(text)) return "rejected";
  if (/reversad[ao]|reversi[oó]n|anulad[ao]|devoluci[oó]n/i.test(text)) return "reversed";
  if (/exitosa|aprobada|realizada|confirmamos|compra|transferencia|pago/i.test(text)) return "posted";
  return "unknown";
}

function detectKind(text: string): ParsedBankEmail["kind"] {
  if (/pago (?:de|a) (?:tu )?tarjeta|abono a tarjeta/i.test(text)) return "payment";
  if (/transferencia|enviaste|recibiste|te envi[oó]|moviste/i.test(text)) return "transfer";
  if (/recibiste|consignaci[oó]n|dep[oó]sito|ingreso/i.test(text)) return "income";
  if (/compra|retiro|d[eé]bito|pagaste/i.test(text)) return "expense";
  return "unknown";
}

export function parseBankEmail(subject: string, body: string): ParsedBankEmail {
  const text = `${subject}\n${body}`.replace(/\s+/g, " ").trim();
  const amount = findAmount(text);
  const status = detectStatus(text);
  const kind = detectKind(text);
  const reference = findReference(text);
  const accountHint = findAccountHint(text);

  let confidence = 0;
  if (amount !== null) confidence += 0.4;
  if (status !== "unknown") confidence += 0.2;
  if (kind !== "unknown") confidence += 0.2;
  if (reference) confidence += 0.1;
  if (accountHint) confidence += 0.1;

  return {
    status,
    kind,
    amount,
    occurredAt: null,
    description: subject.trim() || "Movimiento detectado por correo",
    reference,
    accountHint,
    confidence: Number(confidence.toFixed(2)),
  };
}

export function shouldAutoImport(parsed: ParsedBankEmail) {
  return parsed.status === "posted" && parsed.amount !== null && parsed.confidence >= 0.8;
}
