# Sincronización bancaria por correo

Esta primera versión consulta Gmail con OAuth, filtra remitentes bancarios autorizados y guarda cada correo procesado antes de crear movimientos.

## Variables de entorno

- `CRON_SECRET`: secreto usado por el endpoint programado.
- `GMAIL_CLIENT_ID`: cliente OAuth de Google.
- `GMAIL_CLIENT_SECRET`: secreto OAuth de Google.
- `GMAIL_REFRESH_TOKEN`: token renovable con permiso de solo lectura de Gmail.
- `BANK_EMAIL_ADDRESS`: correo conectado.
- `BANK_EMAIL_WORKSPACE_ID`: workspace de RutaSaldo que recibirá los mensajes.
- `BANK_EMAIL_CONNECTION_ID`: identificador estable de la conexión; por defecto `gmail-primary`.
- `BANK_EMAIL_ALLOWED_SENDERS`: remitentes o dominios separados por coma, por ejemplo `bancolombia.com,nequi.com.co,rappipay.co,wise.com`.

## Ejecución

Aplicar primero `drizzle/0006_bank_email_sync.sql`. Después programar una petición `POST` a:

`/api/finance/email-sync`

con el encabezado:

`Authorization: Bearer <CRON_SECRET>`

## Seguridad y comportamiento

- Gmail se consulta con OAuth; RutaSaldo no almacena contraseñas bancarias.
- Los mensajes se deduplican por ID de Gmail y por huella del contenido.
- Operaciones rechazadas, reversadas o ambiguas nunca se importan automáticamente.
- Los correos con alta confianza quedan en estado `ready_to_import`.
- Los demás quedan en `pending_review` para una futura bandeja de confirmación.
- La creación final de transacciones se mantiene separada para evitar registrar falsos positivos mientras se agregan reglas específicas por banco.

## Próximos pasos

1. Bandeja visual de revisión y aprobación.
2. Reglas específicas para Bancolombia, Nequi, RappiCard y Wise.
3. Asociación automática por últimos cuatro dígitos.
4. Creación de transferencias vinculadas entre cuentas propias.
5. Gmail Push Notifications para reemplazar la consulta periódica.
