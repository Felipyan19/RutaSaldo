import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { voiceFinanceDraftSchema, voiceFinanceResponseSchema } from "@/lib/voice-finance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractText(payload: unknown) {
  const response = payload as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim() ?? "";
}

function voicePrompt(transcript: string, today: string) {
  return [
    "Convierte la frase del usuario en un borrador financiero estructurado para una app colombiana.",
    "Nunca ejecutes ni confirmes operaciones. Solo extrae datos para completar un formulario editable.",
    "Clasifica operation como expense, income, transfer o unknown.",
    "amount debe ser el valor total en pesos colombianos, como número sin símbolos ni separadores.",
    `La fecha actual es ${today}. Resuelve hoy, ayer y fechas relativas en formato YYYY-MM-DD.`,
    "sourceAccountHint y destinationAccountHint deben conservar únicamente el nombre o pista pronunciada por el usuario; no inventes IDs.",
    "Para gastos e ingresos, sourceAccountHint representa la cuenta afectada y destinationAccountHint debe ser null.",
    "Para transferencias, identifica cuenta origen y cuenta destino. No conviertas una transferencia en gasto o ingreso.",
    "categoryHint debe ser breve. Para ingresos usa Ingresos cuando sea claro.",
    "description debe describir el movimiento sin incluir el monto ni la cuenta.",
    "Usa null cuando un dato no esté presente. Marca missingFields y formula una sola pregunta breve cuando falten datos indispensables.",
    "No supongas una cuenta, categoría o fecha dudosa. La confirmación final siempre la hará el usuario.",
    `Frase: ${JSON.stringify(transcript)}`,
  ].join("\n");
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Gemini no está configurado." }, { status: 503 });

  const body = await request.json().catch(() => null) as { transcript?: unknown } | null;
  const transcript = typeof body?.transcript === "string" ? body.transcript.trim() : "";
  if (transcript.length < 3 || transcript.length > 600) {
    return NextResponse.json({ error: "La transcripción debe tener entre 3 y 600 caracteres." }, { status: 400 });
  }

  const model = process.env.GEMINI_VOICE_MODEL ?? process.env.GEMINI_OCR_MODEL ?? "gemini-2.5-flash";

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: voicePrompt(transcript, new Date().toISOString().slice(0, 10)) }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: voiceFinanceResponseSchema,
          },
        }),
        signal: AbortSignal.timeout(30_000),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error("[voice-finance] Gemini failed", response.status, detail.slice(0, 1000));
      const status = response.status === 429 ? 429 : 502;
      return NextResponse.json(
        { error: status === 429 ? "Gemini alcanzó temporalmente su límite. Intenta de nuevo." : "No se pudo interpretar la frase." },
        { status },
      );
    }

    const text = extractText(await response.json());
    if (!text) return NextResponse.json({ error: "Gemini no devolvió un borrador." }, { status: 502 });

    let json: unknown;
    try { json = JSON.parse(text); }
    catch { return NextResponse.json({ error: "Gemini devolvió una respuesta inválida." }, { status: 502 }); }

    const parsed = voiceFinanceDraftSchema.safeParse(json);
    if (!parsed.success) {
      console.error("[voice-finance] Invalid structured response", parsed.error.flatten());
      return NextResponse.json({ error: "No se pudieron validar los datos reconocidos." }, { status: 502 });
    }

    return NextResponse.json(parsed.data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[voice-finance] POST failed", error);
    const isTimeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json({ error: isTimeout ? "La interpretación tardó demasiado." : "No se pudo procesar la frase." }, { status: 500 });
  }
}
