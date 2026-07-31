# Auditoría de frontend — 31 de julio de 2026

## Alcance

Revisión del dashboard, superficies, tarjetas, movimiento, estados de foco, responsive y límites entre Server/Client Components.

## Hallazgos corregidos en esta rama

### 1. Hover aplicado a contenedores padre y tarjetas anidadas

`motion.css` aplicaba elevación a todos los `article`, todos los `section` dentro de `main` y cualquier elemento cuya clase incluyera `rounded-2xl` y `border`.

Esto hacía que una sección completa y sus tarjetas hijas se movieran a la vez. En el resumen, el fondo del contenedor padre quedaba visualmente separado del fondo general durante el hover.

La regla se limita ahora a tarjetas semánticas `article`. Los paneles estructurales, gráficos, secciones y tarjetas internas ya no se elevan accidentalmente.

### 2. Movimiento demasiado global

Los selectores anteriores dependían de fragmentos de clases Tailwind. Eso vuelve el comportamiento difícil de predecir cuando cambia una clase de borde o radio.

La animación queda basada en semántica de componente, no en coincidencias parciales de clases.

### 3. Foco incompleto

Se añadió `textarea` al sistema de foco visible y transiciones. También se evita mostrar cursor de acción en botones deshabilitados.

## Hallazgos que no bloquean esta corrección

### Prioridad alta

- `SummaryPage` es un Client Component completo por el gráfico y el contexto. Conviene separar el gráfico interactivo del contenido estático para reducir JavaScript enviado al navegador.
- Los formularios y modales se importan de forma directa en el shell. Pueden cargarse con `next/dynamic` cuando el usuario los abra.
- Faltan pruebas visuales automatizadas para estados hover, foco, móvil y reducción de movimiento.

### Prioridad media

- Hay colores hexadecimales repetidos en numerosos componentes. Conviene convertirlos en tokens CSS de superficie, borde, texto y estados.
- Algunos componentes financieros están escritos en líneas JSX muy extensas, lo que dificulta revisar jerarquía y accesibilidad.
- Las tarjetas de resumen usan `div`; si se desea hover individual en el futuro, deben convertirse en `article` o recibir una clase explícita, no una regla global.
- El centro de notificaciones y el menú rápido deben cerrar con `Escape` y devolver el foco al disparador.

### Prioridad baja

- Unificar alturas, padding y radios de tarjetas mediante variantes reutilizables.
- Añadir estados `hover`, `focus-visible`, `active` y `disabled` documentados para botones primarios y secundarios.
- Revisar contraste de textos pequeños sobre fondos verdes y tarjetas oscuras con medición automatizada.

## Guías utilizadas

- Next.js: Production Checklist, Accessibility, Server and Client Components y Lazy Loading.
- web.dev: accesibilidad, foco y `prefers-reduced-motion`.
- Tailwind CSS: diseño mobile-first, variantes responsive y container queries.

## Regla visual acordada

Las superficies estructurales no se mueven. Solo las tarjetas claramente independientes pueden elevarse en dispositivos con hover. En móvil no se depende del hover para comunicar interactividad.
