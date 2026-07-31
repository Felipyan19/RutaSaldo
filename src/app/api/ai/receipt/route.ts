import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { receiptResponseSchema, recognizedReceiptSchema } from "@/lib/receipt-ocr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function extractText(payload: unknown) {
  const response = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
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
    const model = process.env.GEMINI_OCR_MODEL ?? "gemini-3.5-flash";
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify({
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
        }),
        signal: AbortSignal.timeout(45_000),
      },
    );

    if (!geminiResponse.ok) {
      const detail = await geminiResponse.text();
      console.error("[receipt-ocr] Gemini failed", geminiResponse.status, detail.slice(0, 1000));
      const status = geminiResponse.status === 429 ? 429 : 502;
      return NextResponse.json(
        { error: status === 429 ? "Se alcanzó temporalmente el límite del OCR. Intenta de nuevo más tarde." : "No se pudo analizar la factura." },
        { status },
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
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "El análisis tardó demasiado. Prueba con una imagen más clara o liviana."
      : "No se pudo procesar el archivo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
