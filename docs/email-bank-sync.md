# Sincronización bancaria por correo

RutaSaldo permite que cada usuario conecte su propia cuenta de Gmail desde **Configuración → Conectar Gmail**. Google muestra la pantalla oficial de autorización y concede únicamente acceso de lectura. RutaSaldo no solicita ni almacena la contraseña del correo.

## Flujo OAuth por usuario

1. El usuario inicia sesión en RutaSaldo.
2. Entra a `Configuración` y pulsa `Conectar Gmail`.
3. Google solicita autorización para `gmail.readonly`.
4. Google devuelve el código OAuth a RutaSaldo.
5. RutaSaldo intercambia el código por tokens, consulta el correo conectado y cifra el refresh token con AES-256-GCM.
6. La conexión queda vinculada al workspace autenticado.
7. El cron procesa todas las conexiones activas sin depender de un refresh token global.

La aplicación también permite reconectar o desconectar Gmail. Al desconectarlo se elimina el token cifrado de la conexión.

## Variables de entorno

- `CRON_SECRET`: secreto usado por el endpoint programado.
- `GMAIL_CLIENT_ID`: cliente OAuth de Google.
- `GMAIL_CLIENT_SECRET`: secreto OAuth de Google.
- `GMAIL_TOKEN_ENCRYPTION_KEY`: clave Base64 de 32 bytes para cifrar los refresh tokens.
- `GMAIL_OAUTH_REDIRECT_URI`: URI de callback exacta registrada en Google; recomendada en producción.
- `BANK_EMAIL_ALLOWED_SENDERS`: remitentes o dominios separados por coma, por ejemplo `bancolombia.com.co,nequi.com.co,rappipay.co,wise.com`.

Ya no se requieren `GMAIL_REFRESH_TOKEN`, `BANK_EMAIL_ADDRESS`, `BANK_EMAIL_WORKSPACE_ID` ni `BANK_EMAIL_CONNECTION_ID`: esos datos se crean por usuario mediante OAuth.

Genera la clave de cifrado con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Ejemplo de callback de producción:

```text
https://TU-DOMINIO.com/api/integrations/gmail/callback
```

La dirección debe coincidir exactamente en Google Cloud y en `GMAIL_OAUTH_REDIRECT_URI`.

## Ejecución

Aplicar primero `drizzle/0006_bank_email_sync.sql`. Vercel ejecuta diariamente una petición `GET` a:

```text
/api/finance/email-sync
```

con el encabezado:

```text
Authorization: Bearer <CRON_SECRET>
```

## Seguridad y comportamiento

- El permiso solicitado es `https://www.googleapis.com/auth/gmail.readonly`.
- El refresh token se cifra mediante AES-256-GCM antes de guardarse.
- El estado OAuth se firma y se valida mediante una cookie `HttpOnly`, `SameSite=Lax` y de corta duración.
- Cada conexión se obtiene desde la sesión y queda limitada al workspace del usuario.
- Los mensajes se deduplican por ID de Gmail y por huella normalizada del movimiento.
- Se exige un dominio remitente permitido y autenticación SPF o DKIM alineada.
- Operaciones rechazadas, reversadas o ambiguas nunca se importan automáticamente.
- Transferencias y pagos de tarjeta permanecen en revisión para evitar contarlos como ingreso o gasto por error.
- Solo compras y retiros aprobados, con cuenta resuelta y alta confianza, pueden convertirse automáticamente en movimientos.
