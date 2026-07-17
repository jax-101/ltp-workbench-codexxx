# Semantic Contract Test Log

Fecha: 2026-07-17.

Contrato: `semantic-contract/v0.1/contract.json`.

## Resultado

Estado tecnico de Gate B: `PASS`.

- 15 fixtures persistidos: 11 validos y 4 invalidos.
- 36 casos generados de agregacion y eliminacion de endpoints.
- Cuatro oraculos: Goal Tree, CRT, EC y FRT.
- Microfixtures de `AND`, `OR`, `MAG` cuantificado y cualitativo, y `XOR`.
- Verbalizacion determinista e invariante ante permutacion de inputs.
- IDs de junction derivados exclusivamente de la relacion.
- Round-trip JSON sin perdida.

## Mutaciones rechazadas

- ciclo en un perfil de necesidad;
- endpoint eliminado;
- ID duplicado;
- assumption asociada a un input ajeno;
- cuantificacion parcial de `MAG`;
- topologia EC incompleta;
- ramas EC cruzadas o roles A-B-C-D-D' mal asignados;
- EC aceptada con una flecha sin assumptions;
- assumption de conflicto sin scope `CONFLICT`;
- `logicMode` incompatible;
- estado de derivacion desconocido;
- conflicto proyectado incorrectamente como junctor.

## Regresion del producto

- `npm run test:semantic`: PASS.
- `npm run test:core`: PASS.
- `npm run validate:model`: PASS para ambos workspaces `0.2`.
- `npm run test:layout`: PASS.
- `npm run test:prototype`: PASS, incluido Electron smoke.
- `npm run test:visual`: 37/37 PASS.

Tras la activacion de `3C.14a`, `npm run test:prototype -- --no-smoke` y el smoke
Electron pasan completos. El smoke verifico tambien el ciclo contextual de
Types, las operaciones colectivas y Undo con el kernel activo.

## Hallazgo durante la revision

La primera version del fixture FRT conectaba una condicion positiva de adopcion
con la UDE de resistencia mediante una flecha causal. La verbalizacion resultante
afirmaba que la confianza producia rechazo. Se corrigio separando la negative
branch causal de una derivacion `MITIGATES` procedente de la injection de
trimming.

Este hallazgo demuestra que integridad estructural y correccion metodologica son
oraculos distintos. El runner evita que el defecto reaparezca, pero la lectura
humana inicial de cada fixture sigue siendo obligatoria.

La auditoria final tambien retiro `XOR` de la relacion `CONFLICT`. Las
alternativas de una EC pueden ser incompatibles solo bajo las restricciones
actuales; no siempre son mutuamente excluyentes por naturaleza. Una regresion
impide volver a proyectar el conflicto como junctor.

La revision de fuentes del 2026-07-16 reforzo el oraculo EC. El fixture contiene
ahora roles canonicos, dos ramas paralelas y tres assumptions para cada uno de
los cinco break points. Las mutaciones rechazan ramas cruzadas, roles
intercambiados, cobertura ausente y scope incorrecto en `D-D'`.

## Aprobacion metodologica

La base semantica y la hoja de oraculos fueron aprobadas el 2026-07-17 para
proceder con `3C.14a`. Esta aprobacion desbloquea la vertical tecnica, pero no
convierte recomendaciones CLR en errores duros ni publica todavia el contrato.

## Pendiente

- Seleccion, borrado y copia parcial de relaciones n-arias, que pertenece a Gate
  F despues de la vertical CRT.
- Capturas de junctions reales, que no pueden producirse hasta que el renderer
  del kernel exista en `3C.14b`.

`3C.14a` esta cerrado en PASS con activacion reversible, CRUD Goal Tree y
paridad UI/CLI/Undo/Redo. El schema publico sigue siendo `0.2`; las relaciones
n-arias y junctions se introduciran en `3C.14b` sin forzarlas dentro de links
binarios.
