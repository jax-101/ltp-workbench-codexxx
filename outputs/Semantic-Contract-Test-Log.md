# Semantic Contract Test Log

Fecha: 2026-07-16.

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

Tras la correccion del oraculo EC, `npm run test:prototype -- --no-smoke`
volvio a pasar completo. El reintento del smoke Electron no llego a lanzarse en
dos ocasiones porque caduco la autorizacion externa; el ultimo smoke de la misma
rama, anterior a esta correccion sin cambios de renderer, permanece en PASS.

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

## Pendiente

- Validacion metodologica del usuario sobre los cuatro oraculos y sus
  verbalizaciones.
- Seleccion, borrado y copia parcial de relaciones n-arias, que pertenece a Gate
  F despues de la vertical CRT.
- Capturas de junctions reales, que no pueden producirse hasta que el renderer
  del kernel exista en `3C.14b`.

`3C.14a` dispone ya de un incremento reversible separado. Esta correccion de
Gate B modifica contrato y oraculos, no el renderer ni el schema publico `0.2`.
