export type BankInstitution = "bancolombia" | "nequi" | "rappipay" | "rappicard" | "wise" | "unknown";
export type BankEmailStatus = "posted" | "pending" | "rejected" | "reversed" | "unknown";
export type BankMovementKind =
  | "purchase"
  | "transfer_sent"
  | "transfer_received"
  | "card_payment"
  | "withdrawal"
  | "refund"
  | "unknown";

export type ParsedBankEmail = {
  institution: BankInstitution;
  status: BankEmailStatus;
  kind: BankMovementKind;
  amount: number | null;
  occurredAt: string | null;
  description: string;
  merchant: string | null;
  reference: string | null;
  accountLastFour: string | null;
  destinationLastFour: string | null;
  categorySlug: string | null;
  confidence: number;
  confidenceReasons: string[];
};

const MONEY_PATTERNS = [
  /(?:COP|COL\$|\$)\s*([\d.]+(?:,\d{1,2})?)/i,
  /(?:por|valor(?:\s+de)?|monto(?:\s+de)?)\s+\$?\s*([\d.]+(?:,\d{1,2})?)\s*(?:COP|pesos)?/i,
];

const MERCHANT_RULES: Array<[RegExp, string]> = [
  [/\btostao\b/i, "restaurants"],
  [/\bkoaj\b/i, "clothing"],
  [/\bdollarcity\b/i, "shopping"],
  [/\b(?:openai|chatgpt)\b/i, "subscriptions"],
];

function parseCop(value: string) {
  const normalized = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : null;
}

function findAmount(text: string) {
  for (const pattern of MONEY_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) return parseCop(match[1]);
  }
  return null;
}

function findLastFour(text: string) {
  const match = text.match(/(?:terminad[ao]?\s+en|finalizad[ao]?\s+en|últimos?\s+4|\*{1,12}|x{2,12})\s*(\d{4})/i);
  return match?.[1] ?? null;
}

function findDestinationLastFour(text: string) {
  const match = text.match(/(?:destino|hacia|a la cuenta|cuenta destino)[^\d]{0,30}(?:\*{1,12}|x{2,12}|terminad[ao]?\s+en)?\s*(\d{4})/i);
  return match?.[1] ?? null;
}

function findReference(text: string) {
  const match = text.match(/(?:referencia|comprobante|n[uú]mero de transacci[oó]n|c[oó]digo)\s*[:#-]?\s*([A-Z0-9-]{5,})/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function detectInstitution(text: string): BankInstitution {
  if (/rappicard/i.test(text)) return "rappicard";
  if (/rappipay|rappi ?pay/i.test(text)) return "rappipay";
  if (/bancolombia|grupo bancolombia/i.test(text)) return "bancolombia";
  if (/\bnequi\b/i.test(text)) return "nequi";
  if (/\bwise\b|transferwise/i.test(text)) return "wise";
  return "unknown";
}

function detectStatus(text: string): BankEmailStatus {
  if (/rechazad[ao]|declinad[ao]|no fue aprobada|fallida|no exitosa/i.test(text)) return "rejected";
  if (/reversad[ao]|reversi[oó]n|anulad[ao]|cancelad[ao]|devoluci[oó]n|reintegro/i.test(text)) return "reversed";
  if (/pendiente|en proceso|por confirmar|procesando|retenci[oó]n/i.test(text)) return "pending";
  if (/exitosa|aprobada|realizada|completada|confirmamos|recibiste|enviaste|retiraste|pagaste/i.test(text)) return "posted";
  return "unknown";
}

function detectKind(text: string): BankMovementKind {
  if (/reversad[ao]|devoluci[oó]n|reintegro|refund/i.test(text)) return "refund";
  if (/pago (?:de|a) (?:tu )?tarjeta|abono (?:a|de) (?:tu )?tarjeta|pago de tarjeta/i.test(text)) return "card_payment";
  if (/retiro|cajero|atm/i.test(text)) return "withdrawal";
  if (/recibiste|te transfirieron|transferencia recibida|te envi[oó]|abono recibido|dep[oó]sito recibido/i.test(text)) return "transfer_received";
  if (/enviaste|transferiste|transferencia enviada|transferencia a|moviste dinero/i.test(text)) return "transfer_sent";
  if (/compra|pagaste|pago en|consumo/i.test(text)) return "purchase";
  return "unknown";
}

function cleanMerchant(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+(?:fecha|hora|monto|método de pago|no\.? de referencia).*$/i, "")
    .trim();
}

function findMerchant(body: string, kind: BankMovementKind) {
  if (kind !== "purchase") return null;
  const explicit = body.match(/(?:^|\n)\s*(?:comercio|establecimiento)\s*[:#-]?\s*([^\n]{2,100})/im);
  if (explicit?.[1]) return cleanMerchant(explicit[1]);

  const purchase = body.match(/(?:compra|pago|consumo)\s+(?:en|a)\s+([^\n.,;]{2,80})/i);
  return purchase?.[1] ? cleanMerchant(purchase[1]) : null;
}

function categoryFor(text: string) {
  return MERCHANT_RULES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

export function normalizedMovementFingerprint(parsed: ParsedBankEmail) {
  return [
    parsed.institution,
    parsed.status,
    parsed.kind,
    parsed.amount ?? "",
    parsed.occurredAt?.slice(0, 10) ?? "",
    parsed.reference ?? "",
    parsed.accountLastFour ?? "",
    parsed.destinationLastFour ?? "",
    (parsed.merchant ?? parsed.description).toLowerCase().replace(/\s+/g, " ").trim(),
  ].join("|");
}

export function parseBankEmail(subject: string, body: string, sender = ""): ParsedBankEmail {
  const normalizedBody = body.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();
  const text = `${sender}\n${subject}\n${normalizedBody}`.trim();
  const institution = detectInstitution(text);
  const status = detectStatus(text);
  const kind = detectKind(text);
  const amount = findAmount(text);
  const reference = findReference(text);
  const accountLastFour = findLastFour(text);
  const destinationLastFour = findDestinationLastFour(text);
  const merchant = findMerchant(normalizedBody, kind);
  const categorySlug = categoryFor(`${merchant ?? ""}\n${text}`);

  const confidenceReasons: string[] = [];
  let confidence = 0;
  if (institution !== "unknown") { confidence += 0.2; confidenceReasons.push("institution"); }
  if (amount !== null) { confidence += 0.25; confidenceReasons.push("amount"); }
  if (status !== "unknown") { confidence += 0.15; confidenceReasons.push("status"); }
  if (kind !== "unknown") { confidence += 0.2; confidenceReasons.push("kind"); }
  if (reference) { confidence += 0.1; confidenceReasons.push("reference"); }
  if (accountLastFour || institution === "nequi" || institution === "wise" || institution === "rappipay") {
    confidence += 0.1;
    confidenceReasons.push("account_hint");
  }

  return {
    institution,
    status,
    kind,
    amount,
    occurredAt: null,
    description: merchant || subject.trim() || "Movimiento detectado por correo",
    merchant,
    reference,
    accountLastFour,
    destinationLastFour,
    categorySlug,
    confidence: Number(Math.min(confidence, 1).toFixed(2)),
    confidenceReasons,
  };
}

export function shouldAutoImport(parsed: ParsedBankEmail) {
  return parsed.status === "posted"
    && parsed.amount !== null
    && parsed.institution !== "unknown"
    && parsed.kind !== "unknown"
    && parsed.kind !== "refund"
    && parsed.confidence >= 0.9;
}
