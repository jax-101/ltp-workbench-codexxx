# Model Acceptance Review v0.1

Fecha: 2026-07-14

Archivos revisados:

- `outputs/Data-Model-v0.1.md`
- `outputs/sample-workspace-v0.1.json`
- `outputs/PRD-v0.2.md`

## Resumen

El modelo de datos v0.1 cubre los criterios de aceptacion de fase 1 a nivel estructural.

La decision mas importante es correcta: el modelo separa grafo logico y layout visual. Esto permite que auto-layout cambie posiciones sin alterar el significado de nodos, links y assumptions.

## Criterios de aceptacion

| Criterio | Cobertura del modelo | Estado |
| --- | --- | --- |
| Crear un sistema nuevo sin raton | `Workspace`, `System`, `SystemProfile` soportan creacion minima con nombre | Cubierto |
| Completar System Profile minimo | `profile.owner`, `profile.boundary.summary`, `profile.purpose` | Cubierto |
| Crear Goal Tree con goal, CSF y NC | `Tree.type=goalTree`, `Node.type=goal/csf/nc` | Cubierto |
| Seleccionar nodo con hints | IDs estables y `layout.nodes` permiten generar hints en runtime | Cubierto |
| Seleccionar frame con hints | `frames` y `layout.frames` permiten generar hints | Cubierto |
| Seleccionar link con hints | `links`, `visual.labelPosition` y `layout.links` soportan hints | Cubierto |
| Editar nodo sin raton | `Node.statement`, `shortLabel`, `updatedAt` son editables | Cubierto |
| Conectar dos nodos sin raton | `Link.sourceNodeId`, `targetNodeId`, `type`, `logic` | Cubierto |
| Abrir link y editar assumptions | `Link.assumptionIds` + `Assumption` como objeto propio | Cubierto |
| Crear frame dentro de otro frame | `Frame.parentFrameId`, `childFrameIds` | Cubierto |
| Ejecutar auto-layout | `LayoutState.engine`, `settings`, posiciones separadas | Cubierto |
| Fijar posicion y respetarla | `pinned`, `layoutSource` por nodo/frame | Cubierto |
| Guardar/cargar arbol completo | JSON incluye system, tree, frames, nodes, links, assumptions, layout | Cubierto |
| Exportar Markdown simple | `exports` y estructura de Goal Tree permiten serializacion | Cubierto |

## Riesgos pendientes

- Los keyboard hints no se guardan, se generan en runtime. Correcto, pero hay que validar legibilidad en canvas denso.
- `layout.links.route` esta vacio en el fixture. Correcto para rutas automaticas iniciales, pero habra que decidir si guardar rutas calculadas o solo rutas manuales.
- `sample-workspace-v0.1.json` esta en formato single-file fixture. La app real deberia guardar en estructura multiarchivo.
- ELK.js debe probarse con frames anidados; el modelo presupone que se podran mapear a compound nodes.

## Decision

El modelo es suficiente para pasar a prototipo tecnico v0.1.

El prototipo debe validar:

- carga del fixture JSON;
- render de frames, nodos y links;
- seleccion con keyboard hints;
- edicion de nodos y assumptions;
- auto-layout por comando;
- export Markdown simple.
