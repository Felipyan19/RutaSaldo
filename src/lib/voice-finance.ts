import { z } from "zod";

export const voiceOperationSchema = z.enum(["expense", "income", "transfer", "unknown"]);

export const voiceFinanceDraftSchema = z.object({
  operation: voiceOperationSchema,
  amount: z.number().positive().nullable(),
  currency: z.literal("COP").default("COP"),
  description: z.string().trim().max(200).nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  sourceAccountHint: z.string().trim().max(120).nullable(),
  destinationAccountHint: z.string().trim().max(120).nullable(),
  categoryHint: z.string().trim().max(80).nullable(),
  confidence: z.number().min(0).max(1),
  missingFields: z.array(z.enum([
    "operation",
    "amount",
    "sourceAccount",
    "destinationAccount",
    "description",
  ])).max(5),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().trim().max(240).nullable(),
});

export type VoiceFinanceDraft = z.infer<typeof voiceFinanceDraftSchema>;

export const voiceFinanceResponseSchema = {
  type: "OBJECT",
  properties: {
    operation: { type: "STRING", enum: ["expense", "income", "transfer", "unknown"] },
    amount: { type: "NUMBER", nullable: true },
    currency: { type: "STRING", enum: ["COP"] },
    description: { type: "STRING", nullable: true },
    date: { type: "STRING", nullable: true },
    sourceAccountHint: { type: "STRING", nullable: true },
    destinationAccountHint: { type: "STRING", nullable: true },
    categoryHint: { type: "STRING", nullable: true },
    confidence: { type: "NUMBER" },
    missingFields: {
      type: "ARRAY",
      items: { type: "STRING", enum: ["operation", "amount", "sourceAccount", "destinationAccount", "description"] },
    },
    needsClarification: { type: "BOOLEAN" },
    clarificationQuestion: { type: "STRING", nullable: true },
  },
  required: [
    "operation",
    "amount",
    "currency",
    "description",
    "date",
    "sourceAccountHint",
    "destinationAccountHint",
    "categoryHint",
    "confidence",
    "missingFields",
    "needsClarification",
    "clarificationQuestion",
  ],
} as const;

export function normalizeVoiceHint(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-CO")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function scoreVoiceHint(hint: string | null | undefined, candidates: Array<{ id: string; labels: string[] }>) {
  const normalizedHint = normalizeVoiceHint(hint);
  if (!normalizedHint) return null;

  const ranked = candidates
    .map((candidate) => {
      const labels = candidate.labels.map(normalizeVoiceHint).filter(Boolean);
      const exact = labels.some((label) => label === normalizedHint);
      const contains = labels.some((label) => label.includes(normalizedHint) || normalizedHint.includes(label));
      const hintTokens = new Set(normalizedHint.split(" "));
      const overlap = Math.max(0, ...labels.map((label) => label.split(" ").filter((token) => hintTokens.has(token)).length));
      return { id: candidate.id, score: exact ? 100 : contains ? 70 : overlap * 15 };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length || (ranked[1] && ranked[0].score === ranked[1].score)) return null;
  return ranked[0].id;
}
