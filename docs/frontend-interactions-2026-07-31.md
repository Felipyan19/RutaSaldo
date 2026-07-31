# Mejoras de interacción frontend — 31 de julio de 2026

- Los modales se cierran al hacer clic en el fondo, con Escape y mediante el botón de cierre.
- El fondo cubre todo el viewport dinámico y el contenido del modal hace scroll dentro de la ventana.
- Los menús emergentes se cierran al hacer clic fuera.
- Los select usan apariencia consistente con RutaSaldo y conservan fallback para alto contraste.
- Las operaciones exitosas muestran un toast accesible.
- El historial local de cuentas, ingresos, gastos y transferencias aparece en el centro de notificaciones.

Patrones adoptados: backdrop dismissible, Escape, bloqueo temporal del scroll, feedback inmediato no bloqueante y registro de actividad separado de las alertas financieras.