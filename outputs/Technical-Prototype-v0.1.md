# Technical Prototype v0.1

Fecha: 2026-07-14

## Objetivo

Validar el nucleo tecnico de fase 1:

- cargar un workspace JSON v0.1;
- renderizar Goal Tree en canvas;
- mostrar frames, nodos y links;
- tratar links como objetos con assumptions;
- seleccionar elementos sin raton mediante keyboard hints;
- ejecutar auto-layout con ELK.js;
- exportar Goal Tree a Markdown;
- empaquetar como app Electron standalone.

## Implementado

### Modelo y fixture

- `outputs/Data-Model-v0.1.md`
- `outputs/sample-workspace-v0.1.json`
- `outputs/Model-Acceptance-Review-v0.1.md`

El fixture contiene:

- 1 workspace;
- 1 sistema;
- 1 Goal Tree;
- 4 frames;
- 13 nodos;
- 6 links;
- 3 assumptions.

### App Electron

Archivos principales:

- `src/main.js`
- `src/preload.js`
- `src/renderer/app.js`
- `src/renderer/styles.css`

Capacidades actuales:

- carga de workspace desde JSON;
- guardado local en `userData`;
- canvas absoluto con frames, nodos y links;
- SVG para flechas;
- seleccion por click y por keyboard hints;
- inspector lateral para nodos, frames y links;
- edicion de nodos;
- edicion de significado/verbalizacion de links;
- edicion y creacion de assumptions;
- promocion de assumption a nodo;
- creacion de nodos y frames con teclado;
- modo conexion basico;
- seleccion multiple de nodos origen y conexion hacia un mismo destino;
- pin/unpin de nodos y frames;
- auto-layout por comando usando ELK.js;
- export Markdown.

### Atajos soportados

- `Cmd/Ctrl+K`: command palette placeholder;
- `H`: mostrar hints;
- `M`: marcar/desmarcar varios nodos origen;
- `N`: nuevo nodo;
- `A`: crear nodo parent/above;
- `a`: crear nodo que soporta el seleccionado y conectarlo;
- `Enter`: enfocar inspector;
- `Esc`: cancelar modo actual;
- `L`: modo conexion; en seleccion multiple, elegir destino para los origenes marcados;
- `F`: nuevo frame;
- `[`: subir al frame padre;
- `]`: entrar en frame seleccionado;
- `/`: buscar;
- `P`: pin/unpin;
- `Cmd/Ctrl+Shift+L`: auto-layout.

## Pruebas ejecutadas

### Modelo

Comando:

```bash
npm run validate:model
```

Resultado:

```text
Model fixture OK: 1 system(s), 4 frame(s), 13 node(s), 6 link(s).
```

### Sintaxis

Comandos:

```bash
node --check src/main.js
node --check src/renderer/app.js
```

Resultado: ambos pasan sin errores.

### Smoke test Electron

Comando:

```bash
npm run smoke
```

Resultado:

```json
{"ok":true,"nodes":13,"frames":4,"links":6,"hints":23,"exportPath":"/Users/jullivarri/Documents/Codex/2026-07-13/hola/outputs/prototype-goal-tree-export.md"}
```

El smoke test valida:

- carga del workspace;
- render de nodos, frames y links;
- generacion de hints;
- ejecucion de ELK layout;
- export Markdown.

### Empaquetado

Comando:

```bash
npm run package
```

Resultado: pasa y genera:

`outputs/dist/mac-arm64/LTP Workbench.app`

Notas:

- usa icono por defecto;
- no esta firmado para distribucion macOS formal.

## Export generado

Archivo:

`outputs/prototype-goal-tree-export.md`

Contenido validado:

- system profile;
- goal;
- CSF;
- verbalizaciones de links;
- assumptions;
- NC principales.

## Riesgos y pendientes

- ELK.js se esta usando para layout plano de nodos; los frames se ajustan como contenedores calculados alrededor de sus nodos. Falta validar compound graphs reales.
- Keyboard hints funcionan en smoke test, pero falta validarlos visualmente con arboles densos.
- El modo conexion basico funciona conceptualmente, pero necesita refinamiento de UX.
- El command palette aun es placeholder.
- El guardado actual usa un unico JSON en `userData`; el modelo multiarchivo de workspace real aun no esta implementado.
- El fixture viaja con el empaquetado, pero la gestion real de carpetas de workspace aun no esta construida.
- La UI es prototipo tecnico, no diseno final.

## Decision tecnica

El prototipo valida suficientemente que la fase 1 es viable:

- el modelo aguanta nodos, frames, links y assumptions;
- se puede renderizar un Goal Tree con canvas;
- ELK.js puede integrarse;
- keyboard hints pueden generarse desde IDs y layout;
- export Markdown es directa desde el grafo.

El siguiente paso recomendado es convertir este prototipo en una fase de implementacion mas formal:

1. elegir estructura multiarchivo real del workspace;
2. evaluar ELK compound graphs;
3. mejorar command palette;
4. disenar tests de interaccion de teclado;
5. reemplazar la UI de prototipo por componentes mas mantenibles.
