# Corrección del modelo Gemini para registro por voz

Producción devolvía `404 NOT_FOUND` porque el endpoint usaba `gemini-2.5-flash` como modelo predeterminado y Google ya no lo ofrece a cuentas nuevas.

El flujo de voz ahora usa `gemini-3.5-flash` como valor predeterminado, manteniendo prioridad para `GEMINI_VOICE_MODEL` y `GEMINI_OCR_MODEL` cuando estén configuradas.
