# Semantic Migration 3C.14a

Fecha: 2026-07-16.

## Objetivo

Introducir el kernel semantico sin convertir de forma irreversible los
workspaces `0.2` ni crear dos fuentes de verdad activas.

## Estrategia

`src/core/semantic-migration.js` construye una proyeccion aditiva
`tree.semanticKernel` para Goal Tree:

- los nodos `goal`, `criticalSuccessFactor` y `necessaryCondition` se proyectan
  como elementos `GOAL`, `CSF` y `NC` con los mismos IDs;
- cada link binario se proyecta como una relacion `NECESSITY/SIMPLE` con el
  mismo ID;
- cada assumption apunta a la relacion equivalente mediante un subject
  `RELATION`;
- un nodo visual promovido desde una assumption se conserva como annotation y
  no se convierte artificialmente en una entidad LTP;
- frames, posiciones, rutas, view state, metadata y los objetos `0.2` originales
  permanecen intactos.

La proyeccion contiene una huella SHA-256 de los campos semanticos de origen.
Cambiar pan, zoom, layout o frame no la invalida. Cambiar una afirmacion, un
extremo, una verbalizacion o una assumption obliga a regenerarla y una
proyeccion obsoleta se rechaza con `SEMANTIC_MIGRATION_STALE`.

## Frontera deliberada

Esta primera pieza es un preview reversible de lectura. El runtime no la anade
automaticamente al abrir un workspace y `semanticKernel` no es una segunda
fuente editable. Si un workspace ya la contiene, el motor transaccional
regenera la proyeccion derivada en la misma operacion atomica que cambia el
origen `0.2`; Undo/Redo restaura ambas piezas juntas.

El downgrade elimina la proyeccion aditiva. Como los datos anteriores no se
reescriben, el workspace resultante es estructuralmente identico al de entrada.

Antes de activar escrituras sobre el kernel se debe cerrar un unico punto de
commit que:

1. aplique comandos genericos al kernel;
2. valide el resultado completo;
3. derive la vista binaria de compatibilidad dentro de la misma transaccion;
4. rechace cualquier huella obsoleta;
5. permita Undo/Redo atomico de ambas representaciones durante la transicion.

## Pruebas ejecutables

`npm run test:semantic-migration` comprueba:

- paridad de los dos workspaces Goal Tree permanentes;
- IDs y cardinalidades de elementos, relaciones y assumptions;
- no mutacion del input;
- migracion idempotente;
- downgrade estructuralmente exacto;
- conservacion de schema, canvas, frames, layout y datos legacy;
- cambios visuales sin falsos conflictos;
- deteccion de cambios semanticos obsoletos;
- assumption promovida como annotation no causal;
- rechazo de annotations conectadas y relaciones incompatibles;
- validacion integrada de kernels invalidos u obsoletos en el workspace;
- preview headless por CLI sin escritura del archivo;
- refresco transaccional de la proyeccion junto con edicion, Undo y Redo;
- ausencia de parches semanticos ante cambios exclusivamente visuales.
- comandos headless genericos para editar element, retargetear una relacion
  `SIMPLE` y editar una assumption, con proyeccion legacy y Undo atomicos.

Preview manual o para agentes:

```bash
npm run ltp -- semantic preview --workspace ./workspace.json --json
```

La respuesta incluye perfil, version, fingerprint y cardinalidades, con
`persisted: false`.

## Estado

La migracion aditiva, el validador compartido, el refresco transaccional y una
primera vertical de comandos genericos estan implementados. Quedan pendientes
crear/borrar relaciones y junctions, operaciones colectivas y la paridad
completa de UI antes de dar `3C.14a` por cerrado.
