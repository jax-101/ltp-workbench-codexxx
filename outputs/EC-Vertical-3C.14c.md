# EC vertical 3C.14c

Estado: PASS en build 3C.14c.

## Alcance entregado

- EC usa `semanticKernel.storageMode = NATIVE` sin ampliar las primitivas del
  kernel validadas por Goal Tree y CRT.
- Los roles `A/B/C/D/D'` se conservan en la proyeccion y se muestran en los
  nodos Objective, Need y Want.
- ELK layered usa direccion RL y recibe particiones compiladas para tres
  columnas. Un transformador neutral alinea las dos ramas paralelas.
- El conflicto D-D' se proyecta como enlace no direccional, seleccionable,
  discontinuo y sin punta; no participa en ranking ni excepciones causales.
- Las cuatro flechas y el conflicto conservan sus 15 assumptions. El conflicto
  exige scope `CONFLICT` al crear nuevas assumptions.
- La injection permanece como elemento semantico y su inspector muestra la
  derivacion `CHALLENGES_ASSUMPTION` hacia la assumption concreta.
- Markdown exporta elementos, conflicto, assumptions y derivaciones. CLI y
  renderer reconocen los Types de EC.

## Invariantes probados

- Seis elementos y cinco relaciones visuales; ningun junction sintetico.
- `D -> B -> A` y `D' -> C -> A` ocupan carriles paralelos y tres columnas.
- El conflicto no cuenta como flecha invertida.
- Layout no modifica el kernel y repetir Layout conserva posiciones.
- Geometria sin solapes ni enlaces que atraviesen nodos.
- Undo/Redo conserva assumptions de scope `CONFLICT`.
- Goal Tree, CRT y los 15 oraculos semanticos siguen pasando.

## Evidencia

- Core: `npm run test:ec`.
- Electron: `npm run test:ec:visual`.
- Fixture: `outputs/ec-workspace-v0.1.json`.
- Captura e informe: `outputs/test-evidence/3C.14c/ec/`.
- Validacion conjunta: `npm run validate:model`.

## Limites conscientes

- El registro de diagramas sigue embebido en codigo; su publicacion como
  paquete declarativo versionado es el siguiente gate, `3C.15`.
- La UI consume el EC existente y permite operaciones genericas, pero aun no
  ofrece un asistente metodologico para construir A-B-C-D-D' desde cero.
- La injection se inspecciona y exporta; la edicion visual de derivaciones se
  abordara sobre el formato declarativo y las operaciones headless.
