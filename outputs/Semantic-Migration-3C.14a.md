# Semantic Migration 3C.14a

Fecha: 2026-07-17.

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

## Activacion controlada

El runtime anade y persiste automaticamente el kernel al abrir un Goal Tree.
La migracion de formato y la activacion semantica forman un pipeline unico,
idempotente y atomico. Puede ejecutarse solo la migracion de formato mediante
`migrateWorkspace(workspace, { semanticKernel: false })` para rescate o pruebas.

El modelo `0.2` sigue siendo la proyeccion de compatibilidad que consume el
renderer. El motor transaccional garantiza que cualquier escritura, incluida
una sustitucion procedente de un cliente antiguo sin kernel, regenere la
proyeccion semantica antes de validar y persistir. Undo/Redo restaura ambas
piezas juntas.

El downgrade elimina la proyeccion aditiva. Como los datos anteriores no se
reescriben, el workspace resultante es estructuralmente identico al de entrada.

El punto unico de commit:

1. interprete comandos genericos mediante el adaptador Goal Tree;
2. actualice la vista binaria de compatibilidad dentro de la misma transaccion;
3. regenere y valide el kernel completo;
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
- activacion automatica al abrir, persistencia atomica e idempotencia tras una
  segunda apertura;
- CRUD headless de elements, relaciones `SIMPLE` y assumptions;
- cambio de Type y borrado colectivos, con cascada de relaciones y assumptions;
- recuperacion automatica ante un `workspace.replace` sin kernel;
- escritura CLI real en un archivo temporal y validacion posterior;
- smoke Electron completo con el kernel activo.

Preview manual o para agentes:

```bash
npm run ltp -- semantic preview --workspace ./workspace.json --json
```

La respuesta incluye perfil, version, fingerprint y cardinalidades. El preview
no realiza una escritura adicional; la apertura normal y `apply` si activan y
persisten el kernel.

## Estado

`3C.14a`: **PASS**. Goal Tree conserva paridad en UI, CLI, persistencia,
Undo/Redo y downgrade. Las junctions y relaciones n-arias se mantienen fuera
del adaptador binario y pasan deliberadamente a `3C.14b`, junto con la vertical
CRT.
