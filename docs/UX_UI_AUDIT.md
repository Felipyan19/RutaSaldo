# Auditoría UX/UI de RutaSaldo

Fecha: 2026-08-03

## Alcance revisado

- shell del dashboard, navegación lateral, encabezado, acciones rápidas y notificaciones;
- Resumen, Cuentas, Movimientos, Categorías, Configuración y Bandeja bancaria;
- estados vacíos, modales, filtros y tarjetas financieras;
- estilos globales, tipografía, controles y motion;
- comportamiento responsive de móvil, tablet y escritorio;
- cambios de sincronización Gmail y cron incluidos en la PR #34.

## Principios aplicados

1. Una acción principal por contexto.
2. Evitar títulos y explicaciones duplicadas.
3. Usar el ancho de escritorio sin convertir cada bloque en una tarjeta.
4. Mantener objetivos táctiles de al menos 40–44 px.
5. Hacer evidente qué elementos son interactivos.
6. Mostrar información financiera con jerarquía antes que decoración.
7. No registrar transferencias propias como ingresos o gastos.
8. Mantener una sola columna legible en móvil y grids progresivos en pantallas mayores.

## Hallazgos críticos

### 1. Títulos de rutas no registradas

El encabezado deriva su título de un arreglo limitado de rutas. Pantallas como `/bandeja` y módulos inyectados por fuera de ese arreglo pueden heredar el título `Resumen`. Se debe centralizar el mapa de navegación y metadatos de página.

**Prioridad:** alta.

### 2. Acciones duplicadas en Bandeja

`Actualizar` y `Sincronizar ahora` representaban tareas distintas técnicamente, pero casi idénticas para el usuario. Se consolidaron en `Sincronizar Gmail`, que ejecuta la consulta y refresca la lista.

**Estado:** corregido en PR #34.

### 3. Configuración desperdiciaba espacio horizontal

La pantalla estaba limitada a una columna estrecha (`max-w-3xl`) incluso en escritorio. Se reorganizó en un grid de 12 columnas, manteniendo una sola columna en móvil.

**Estado:** corregido en PR #34.

### 4. Resumen mezclaba saludo, etiqueta y título

`Hola 👋`, `Tu panorama financiero` y `Resumen general` competían por la misma jerarquía. Se reemplazaron por un título funcional y una descripción breve.

**Estado:** corregido en PR #34.

### 5. Cuentas inconsistentes entre Resumen y módulo

Las cuentas del Resumen parecían estáticas, mientras las del módulo eran botones. También se mostraba el mismo icono para efectivo, billeteras, bancos y tarjetas. Se añadieron iconos semánticos, estados hover/focus y una indicación consistente de detalle.

**Estado:** corregido en PR #34.

## Hallazgos de espacio y densidad

### Dashboard

- El padding general `p-5 md:p-8 lg:p-10` funciona, pero en pantallas ultrawide conviene limitar el ancho de lectura de listas y formularios, no de dashboards completos.
- Las métricas deben conservar tres columnas desde tablet y permitir cifras largas sin desbordamiento.
- Las tarjetas no deben crecer solo para llenar espacio: conviene mantener contenido compacto y alinear alturas únicamente dentro de un mismo grupo.

### Configuración

- Gmail requiere más ancho que Privacidad o Sesión.
- Las acciones destructivas deben vivir separadas visualmente y nunca competir con acciones primarias.
- En móvil, los botones deben ocupar el ancho completo cuando tres acciones no caben de forma cómoda.

### Bandeja bancaria

- Los filtros deben desplazarse horizontalmente en móvil para evitar varias filas irregulares.
- Los botones Aprobar/Ignorar deben quedar debajo del contenido en pantallas estrechas.
- Remitentes, referencias y descripciones largas necesitan `break-words` o truncado controlado.

### Movimientos

- El bloque de filtros con cinco columnas es eficiente en escritorio, pero debe mantener dos columnas en tablet y una en móvil.
- La búsqueda es la acción primaria; el botón de filtros debe ser secundario y mostrar cuántos están activos.
- `Limpiar filtros` debe aparecer solo cuando exista algo que limpiar.

### Categorías

- Las tarjetas son compactas y apropiadas, pero el editor repite estilos de inputs definidos localmente.
- El selector de color nativo necesita etiqueta accesible y un valor textual opcional para usuarios que no distinguen bien los tonos.
- La confirmación mediante `window.confirm` debería migrar a un modal consistente con el resto de la app.

## Consistencia visual

### Colores

Hay muchos hexadecimales repetidos dentro de componentes. Esto dificulta cambios globales y puede generar pequeñas variaciones no intencionales.

Propuesta de tokens:

- `--color-canvas`
- `--color-surface`
- `--color-text`
- `--color-muted`
- `--color-border`
- `--color-primary`
- `--color-accent`
- `--color-danger`
- `--color-warning`
- `--color-success`

### Componentes base pendientes

- `Button` con variantes primary, secondary, ghost y danger;
- `Card` y `Panel` con variantes de densidad;
- `Field`, `Select` y mensajes de validación;
- `PageIntro` para evitar títulos repetidos;
- `EmptyState`;
- `StatusBadge`;
- `SectionHeading`;
- `ConfirmDialog`.

### Tipografía

La aplicación ya carga Manrope mediante `next/font`, pero `globals.css` todavía declara Arial en `body`. Aunque la clase de Next puede prevalecer por especificidad, debe eliminarse la contradicción para que la fuente sea inequívoca y más fácil de mantener.

## Accesibilidad

Fortalezas encontradas:

- varios controles tienen `aria-label`;
- existen focos visibles en tarjetas interactivas;
- el loader respeta `prefers-reduced-motion`;
- los modales usan roles y etiquetas;
- los estados de sincronización usan `aria-live`.

Pendientes:

- aplicar `focus-visible` de manera global y consistente;
- asegurar contraste de textos de 10–11 px;
- evitar texto de ayuda demasiado pequeño en acciones importantes;
- gestionar foco al abrir/cerrar menús y modales;
- cerrar menú móvil con Escape;
- impedir scroll del fondo en drawers además de modales;
- añadir un enlace `Saltar al contenido`;
- comprobar navegación completa solo con teclado.

## Rendimiento React/Next.js

- `DashboardShell` concentra demasiadas responsabilidades y estados. Debe dividirse en `AppHeader`, `Sidebar`, `NotificationCenter` y `QuickActions`.
- Los gráficos de Recharts deberían cargarse dinámicamente si el bundle inicial crece.
- Hay filtros y cálculos repetidos sobre transacciones; conviene crear mapas/índices derivados cuando aumente el volumen.
- Se deben evitar objetos completos de estado clonados solo para filtrar listas cuando un componente puede aceptar `transactions` directamente.
- La bandeja debe refrescar datos sin `window.location.reload`.

## Copy y microcopy

Reglas recomendadas:

- usar verbos claros: `Agregar cuenta`, `Sincronizar Gmail`, `Ver historial`;
- evitar frases genéricas repetidas como `Tu espacio financiero privado` en todas las páginas;
- reservar explicaciones largas para estados vacíos o ayuda contextual;
- usar `Por revisar` en lugar de `Por aprobar` cuando también puede ignorarse o conciliarse;
- distinguir `Eliminar datos financieros` de eliminar la cuenta de usuario.

## Roadmap sugerido

### P0 — antes de fusionar PR #34

- corregir build de Vercel;
- confirmar que el plan permite cron cada hora;
- probar `Sincronizar Gmail` con sesión real;
- verificar que `/bandeja` muestra el título correcto;
- probar Configuración y Bandeja en 360, 768, 1280 y 1440 px.

### P1 — sistema visual

- introducir tokens y componentes base;
- dividir `DashboardShell`;
- centralizar títulos y descripciones por ruta;
- unificar estados vacíos, botones y campos;
- añadir skip link y foco administrado.

### P2 — flujos financieros

- selector manual de cuenta para correos no asociados;
- conciliación visual de transferencias entre cuentas propias;
- confirmación consistente para eliminar categorías/datos;
- edición de cuentas desde el modal de detalle;
- feedback de guardado por acción, no solo global.

### P3 — pruebas

- pruebas visuales responsive;
- pruebas de teclado y foco;
- pruebas de textos largos y montos grandes;
- pruebas de estados sin datos, carga, error y reconexión Gmail;
- auditoría Lighthouse y contraste WCAG.
