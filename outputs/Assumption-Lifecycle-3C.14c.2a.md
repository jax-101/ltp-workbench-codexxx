# Assumption lifecycle 3C.14c.2a

Estado: PASS en build 3C.14c.2a.

## Alcance entregado

- Lifecycle canonico: `DRAFT`, `SUPPORTED`, `CHALLENGED`, `INVALIDATED`.
- Los estados legacy se normalizan al activar el kernel.
- Edicion individual y colectiva mediante comandos transaccionales atomicos.
- Invalidar conserva statement, subject, fuentes, historial y derivaciones.
- Crear una assumption asigna `DRAFT` si no se indica estado.
- Markdown incluye el estado de cada assumption.
- CLI de primer nivel: `assumption list/create/update/status/delete`, con filtros
  por relacion y estado, revision esperada y dry-run compartido.
- Cada linea muestra un indicador compacto con cantidad y estado agregado, sin
  etiquetas `L` permanentes.
- El inspector permite cambiar el estado de cada assumption.

## Estado agregado de linea

- `uncovered`: cero assumptions.
- `invalidated`: al menos una invalidada.
- `challenged`: ninguna invalidada y al menos una desafiada.
- `supported`: todas soportadas.
- `draft`: cualquier otra combinacion con cobertura.

## Evidencia

- Contrato y estado invalido: `npm run test:semantic`.
- Transacciones, operacion colectiva, Undo/Redo y preservation de derivaciones:
  `npm run test:ec`.
- CLI persistente de extremo a extremo: `npm run test:ec`.
- Regresion completa: `npm run test:prototype -- --no-smoke`.
- Captura Electron tripartita: `npm run test:ec:tripartite:visual`.

## Pendiente de 3C.14c.2

El siguiente subincremento incorpora el scope keyboard-first: H/M sobre
assumptions visibles, navegacion vertical y horizontal, crear/editar/borrar sin
raton, operaciones colectivas y Assumption Workbench global.
