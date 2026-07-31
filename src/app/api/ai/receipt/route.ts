import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { receiptResponseSchema, recognizedReceiptSchema } from "@/lib/receipt-ocr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const RETRYABLE_GEMINI_STATUS = new Set([429, 502, 503, 504]);
const RETRY_DELAYS_MS = [0, 1_500, 4_000];
const GEMINI_TIMEOUT_MS = 75_000;

function extractText(payload: unknown) {
  const response = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(params: {
  model: string;
  apiKey: string;
  body: unknown;
}) {
  const { model, apiKey, body } = params;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = RETRY_DELAYS_MS[attempt];
    if (delay > 0) await sleep(delay);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      },
    );

    lastResponse = response;
    if (response.ok || !RETRYABLE_GEMINI_STATUS.has(response.status)) return response;

    const retryAfter = Number(response.headers.get("retry-after"));
    if (Number.isFinite(retryAfter) && retryAfter > 0 && attempt < RETRY_DELAYS_MS.length - 1) {
      await sleep(Math.min(retryAfter * 1_000, 30_000));
    }
  }

  if (!lastResponse) throw new Error("Gemini did not return a response");
  return lastResponse;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "El OCR no está configurado. Agrega GEMINI_API_KEY en Vercel." },
      { status: 503 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Selecciona una factura o recibo." }, { status: 400 });
    if (!ALLOWED_TYPES.has(file.type)) return NextResponse.json({ error: "Usa una imagen JPG, PNG, WEBP o un PDF." }, { status: 400 });
    if (file.size === 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "El archivo debe pesar menos de 8 MB." }, { status: 400 });

    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const primaryModel = process.env.GEMINI_OCR_MODEL ?? "gemini-3.5-flash-lite";
    const fallbackModel = process.env.GEMINI_OCR_FALLBACK_MODEL ?? "gemini-3.5-flash";
    const geminiBody = {
      contents: [{
        parts: [
          {
            text: [
              "Analiza esta factura o recibo, preferiblemente colombiano.",
              "Extrae únicamente datos visibles. No inventes información y usa null cuando no sea legible.",
              "Los valores monetarios deben ser números sin símbolos ni separadores.",
              "La fecha debe estar en formato YYYY-MM-DD.",
              "La categoría sugerida debe ser breve, por ejemplo Comida, Transporte, Servicios, Vivienda u Otros.",
              "Agrega una advertencia para cualquier dato dudoso o inconsistencia entre subtotal, impuestos y total.",
            ].join(" "),
          },
          { inline_data: { mime_type: file.type, data } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: receiptResponseSchema,
      },
    };

    let modelUsed = primaryModel;
    let geminiResponse = await callGemini({ model: primaryModel, apiKey, body: geminiBody });

    if (
      !geminiResponse.ok &&
      RETRYABLE_GEMINI_STATUS.has(geminiResponse.status) &&
      fallbackModel !== primaryModel
    ) {
      console.warn("[receipt-ocr] Primary model unavailable, trying fallback", {
        primaryModel,
        fallbackModel,
        status: geminiResponse.status,
      });
      modelUsed = fallbackModel;
      geminiResponse = await callGemini({ model: fallbackModel, apiKey, body: geminiBody });
    }

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text();
      console.error("[receipt-ocr] Gemini failed", geminiResponse.status, {
        model: modelUsed,
        detail: detail.slice(0, 1000),
      });

      if (geminiResponse.status === 429) {
        return NextResponse.json(
          { error: "Se alcanzó temporalmente el límite del OCR. Intenta de nuevo en unos minutos.", code: "OCR_RATE_LIMITED" },
          { status: 429 },
        );
      }

      if ([502, 503, 504].includes(geminiResponse.status)) {
        return NextResponse.json(
          { error: "El servicio de análisis está congestionado temporalmente. Intenta de nuevo.", code: "OCR_TEMPORARILY_UNAVAILABLE" },
          { status: 503 },
        );
      }

      return NextResponse.json(
        { error: "No se pudo analizar la factura.", code: "OCR_PROVIDER_ERROR" },
        { status: 502 },
      );
    }

    const rawPayload = await geminiResponse.json();
    const text = extractText(rawPayload);
    if (!text) return NextResponse.json({ error: "Gemini no devolvió datos reconocibles." }, { status: 502 });

    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "La respuesta del OCR no tuvo un formato válido." }, { status: 502 });
    }

    const parsed = recognizedReceiptSchema.safeParse(json);
    if (!parsed.success) {
      console.error("[receipt-ocr] Invalid structured response", parsed.error.flatten());
      return NextResponse.json({ error: "No se pudieron validar los datos reconocidos." }, { status: 502 });
    }

    return NextResponse.json(parsed.data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[receipt-ocr] POST failed", error);
    const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    const message = isTimeout
      ? "El análisis tardó demasiado. Prueba con una imagen más clara o inténtalo nuevamente."
      : "No se pudo procesar el archivo.";
    return NextResponse.json(
      { error: message, code: isTimeout ? "OCR_TIMEOUT" : "OCR_PROCESSING_ERROR" },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
