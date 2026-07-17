# Global Assumption Workbench 3C.14c.2c

Estado: PASS en build 3C.14c.2c.

## Alcance entregado

- `Cmd/Ctrl+Shift+A` abre una vista global de assumptions del arbol activo.
- La vista incluye todas las relaciones y conflictos, incluso si no son
  visibles por foco, viewport o frames minimizados.
- La busqueda cubre statements, significado de lineas e injections.
- Los filtros de coverage y estado permiten localizar gaps y break points.
- Cada linea muestra cantidad, coverage agregado y assumptions individuales.
- Las derivaciones muestran la injection relacionada y su estado.
- `H`, `M`, flechas, `Ctrl+P/N/B/F`, `N`, `Enter`, `Shift+Tab`, `Ctrl+D`,
  Undo/Redo y `Ctrl+G` conservan semantica contextual sin raton.
- `Shift+Tab` avanza el lifecycle de una seleccion; si sus estados difieren,
  los normaliza primero a `DRAFT`.

## Arquitectura

La vista no mantiene una copia de assumptions. Consulta el kernel semantico y
ejecuta los mismos comandos transaccionales que el inspector de linea y la CLI.
La visibilidad del canvas no participa en el inventario global. El dispatcher
mantiene la precedencia `editor > assumptions > canvas` y Keyboard/Command
Palette siguen naciendo del registro declarativo.

## Pruebas

- Regresion completa: `npm run test:prototype -- --no-smoke`.
- EC con injection: `npm run test:ec:visual`.
- Regresion EC tripartita: `npm run test:ec:tripartite:visual`.
- Auditoria de atajos: `npm run test:shortcuts`.
- Evidencia EC: `outputs/test-evidence/3C.14c.2c/ec/`.
- Evidencia tripartita: `outputs/test-evidence/3C.14c.2c/ec-tripartite/`.

## Gate

`3C.14c.2` queda cerrado. `3C.15`, formato declarativo y herramientas
headless, queda desbloqueado.
