# EC multipartita 3C.14c.1

Estado: PASS en build 3C.14c.1.

## Alcance entregado

- El contrato EC admite dos o mas ramas `WANT -> NEED -> OBJECTIVE` mediante
  `branchId` estable y `branchOrder` opcional.
- Los roles metodologicos siguen siendo etiquetas visibles y unicas, pero ya no
  determinan la topologia. `A` conserva la unicidad del objective.
- Cada rama exige exactamente un WANT, un NEED y las dos relaciones de
  necesidad. Las relaciones cruzadas entre ramas se rechazan.
- Los conflictos siguen siendo binarios entre wants concretos. Su grafo debe
  conectar todas las ramas, lo que permite resolver una pareja y reevaluar las
  restantes sin inventar un junctor ternario.
- El segundo oracle reproduce el EC tripartito de salud de la Figura 5.9 de
  Dettmer: tres ramas, seis flechas, tres conflictos y 27 assumptions.
- La proyeccion conserva `semanticBranchId` y `semanticBranchOrder`. El
  compilador deduce columnas, carriles y objective compartido para cualquier
  cardinalidad soportada.

## Invariantes probados

- Los oraculos bipolar y tripartito pasan el mismo validador y layout.
- Tres WANT y sus NEED ocupan tres carriles diferentes en direccion RL.
- El objective queda centrado respecto de todos los carriles.
- Las seis flechas tienen punta; los tres conflictos son discontinuos y no
  direccionales.
- Cada conflicto abre tres assumptions propias en el inspector.
- No se generan junctions, solapes ni enlaces que atraviesen nodos.
- Layout no modifica el kernel y repetirlo produce las mismas posiciones.
- Las mutaciones rechazan rama incompleta, cruce de ramas, rol duplicado y
  grafo de conflictos desconectado.

## Evidencia

- Contrato: `npm run test:semantic`.
- Core EC: `npm run test:ec`.
- Electron bipolar: `npm run test:ec:visual`.
- Electron tripartito: `npm run test:ec:tripartite:visual`.
- Fixtures: `outputs/ec-workspace-v0.1.json` y
  `outputs/ec-tripartite-workspace-v0.1.json`.
- Captura e informe: `outputs/test-evidence/3C.14c.1/ec-tripartite/`.
- Validacion conjunta: `npm run validate:model`.

## Limite siguiente

La semantica y la presentacion multipartita estan cerradas, pero la interaccion
con assumptions sigue siendo parcial. `3C.14c.2` anadira indicadores de
cobertura, navegacion contextual, lifecycle, seleccion con H/M, operaciones
colectivas y Assumption Workbench completamente keyboard-first.
