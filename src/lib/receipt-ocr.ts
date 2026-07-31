import { z } from "zod";

export const receiptItemSchema = z.object({
  name: z.string().nullable(),
  quantity: z.number().nullable(),
  unitPrice: z.number().nullable(),
  total: z.number().nullable(),
});

export const recognizedReceiptSchema = z.object({
  merchant: z.string().nullable(),
  description: z.string().nullable(),
  date: z.string().nullable(),
  total: z.number().nullable(),
  subtotal: z.number().nullable(),
  taxes: z.number().nullable(),
  currency: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  suggestedCategory: z.string().nullable(),
  items: z.array(receiptItemSchema).default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.object({
    merchant: z.number().min(0).max(1),
    date: z.number().min(0).max(1),
    total: z.number().min(0).max(1),
  }),
});

export type RecognizedReceipt = z.infer<typeof recognizedReceiptSchema>;

export const receiptResponseSchema = {
  type: "OBJECT",
  properties: {
    merchant: { type: "STRING", nullable: true },
    description: { type: "STRING", nullable: true },
    date: { type: "STRING", nullable: true, description: "ISO date YYYY-MM-DD" },
    total: { type: "NUMBER", nullable: true },
    subtotal: { type: "NUMBER", nullable: true },
    taxes: { type: "NUMBER", nullable: true },
    currency: { type: "STRING", nullable: true },
    invoiceNumber: { type: "STRING", nullable: true },
    paymentMethod: { type: "STRING", nullable: true },
    suggestedCategory: { type: "STRING", nullable: true },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", nullable: true },
          quantity: { type: "NUMBER", nullable: true },
          unitPrice: { type: "NUMBER", nullable: true },
          total: { type: "NUMBER", nullable: true },
        },
        required: ["name", "quantity", "unitPrice", "total"],
      },
    },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    confidence: {
      type: "OBJECT",
      properties: {
        merchant: { type: "NUMBER" },
        date: { type: "NUMBER" },
        total: { type: "NUMBER" },
      },
      required: ["merchant", "date", "total"],
    },
  },
  required: [
    "merchant",
    "description",
    "date",
    "total",
    "subtotal",
    "taxes",
    "currency",
    "invoiceNumber",
    "paymentMethod",
    "suggestedCategory",
    "items",
    "warnings",
    "confidence",
  ],
} as const;
