# Data Model v0.1: LTP Workbench

## 1. Objetivo

Definir el modelo de datos minimo para fase 1:

- workspace local;
- sistemas;
- System Profile;
- Goal Tree como System Benchmark;
- frames anidados;
- nodos;
- links con assumptions;
- layout persistente;
- exportacion Markdown simple.

El modelo debe permitir crear un Goal Tree real sin raton y guardar/cargar el trabajo sin perder estructura logica ni posicion visual.

## 2. Principios de diseno

- Separar grafo logico de layout visual.
- Tratar nodos y links como objetos de primer nivel.
- Permitir empezar incompleto.
- Mantener archivos legibles por humanos.
- Usar IDs estables, no derivados del texto visible.
- Versionar el schema desde el primer dia.
- Guardar suficiente informacion para reconstruir la experiencia de teclado y canvas.

## 3. Estructura de carpetas propuesta

```text
workspace/
  workspace.json
  systems/
    {systemId}/
      system.json
      trees/
        {treeId}.json
      exports/
        {exportId}.md
      checkpoints/
        {checkpointId}/
          system.json
          trees/
            {treeId}.json
```

Fase 1 no requiere base de datos. Los archivos JSON son la fuente de verdad para datos editables. Markdown se usa para exportaciones.

## 4. Convenciones

- Formato: JSON.
- Estilo de campos: `camelCase`.
- Timestamps: ISO 8601.
- IDs: strings estables con prefijo semantico, por ejemplo `sys-`, `tree-`, `node-`, `link-`, `frame-`.
- Todo archivo de datos incluye `schemaVersion` y `updatedAt`.
- Los textos visibles pueden cambiar sin cambiar el ID.

## 5. Workspace

`workspace.json` representa la carpeta de trabajo.

Campos:

- `schemaVersion`: version del modelo.
- `id`: ID del workspace.
- `name`: nombre visible.
- `createdAt`, `updatedAt`.
- `activeSystemId`: sistema activo al abrir.
- `systems`: indice de sistemas del workspace.
- `settings`: preferencias globales.

Ejemplo parcial:

```json
{
  "schemaVersion": "0.1",
  "id": "ws-ltp-workbench",
  "name": "LTP Workbench",
  "activeSystemId": "sys-example",
  "systems": [
    {
      "id": "sys-example",
      "name": "Sistema de ejemplo",
      "path": "systems/sys-example/system.json"
    }
  ]
}
```

## 6. System

`system.json` representa un sistema estable.

Campos:

- `schemaVersion`.
- `id`, `name`.
- `createdAt`, `updatedAt`.
- `profile`: System Profile.
- `benchmarks`: lista de benchmarks del sistema.
- `perspectives`: lineas de trabajo.
- `sources`: documentos, notas o referencias.
- `relationships`: relaciones con sistemas padre/hijo.

### 6.1 System Profile

Campos:

- `description`: descripcion breve.
- `purpose`: proposito de trabajo.
- `owner`: owner o decision-maker.
- `boundary`: dentro/fuera.
- `spanOfControl`.
- `sphereOfInfluence`.
- `externalEnvironment`.
- `stakeholders`.
- `constraints`.
- `initialSymptoms`.
- `sourceIds`.
- `completeness`: estado del profile.

Para crear un sistema solo es obligatorio `name`. Para completar el profile minimo de fase 1: `name`, `owner`, `boundary.summary` y `purpose`.

### 6.2 System Benchmark

En fase 1 el benchmark principal sera un Goal Tree.

Campos:

- `id`.
- `type`: `goalTree`.
- `treeId`.
- `status`: `draft`, `active`, `archived`.
- `isPrimary`.
- `createdAt`, `updatedAt`.

## 7. Perspective

Una perspectiva agrupa trabajo sobre un sistema.

Campos:

- `id`.
- `name`.
- `type`: `benchmark`, `diagnosis`, `conflict`, `solution`, `implementation`, `exploration`.
- `treeIds`.
- `status`.
- `origin`: de donde nace la perspectiva, si aplica.

En fase 1 puede existir una perspectiva por defecto: `Benchmark`.

## 8. Tree

Cada archivo `trees/{treeId}.json` representa un arbol.

Campos:

- `schemaVersion`.
- `id`, `systemId`, `perspectiveId`.
- `type`: `goalTree`, `crt`, `ec`, `frt`, `prt`, `transitionTree`, `strategyTacticsTree`.
- `name`.
- `status`: `draft`, `reviewing`, `accepted`, `archived`.
- `logicMode`: `necessity` o `sufficiency`.
- `rootFrameId`.
- `frames`.
- `nodes`.
- `links`.
- `assumptions`.
- `layout`.
- `viewState`.
- `createdAt`, `updatedAt`.

Fase 1 soporta `type: goalTree` y `logicMode: necessity`.

## 9. Frame

Un frame es un contenedor visual/logico.

Campos:

- `id`.
- `treeId`.
- `parentFrameId`: null para frame principal.
- `name`.
- `semanticType`: opcional.
- `collapsed`.
- `childFrameIds`.
- `nodeIds`.
- `notes`.
- `createdAt`, `updatedAt`.

`semanticType` puede ser null. En fase 1 los frames pueden ser solo agrupacion visual.

Valores futuros posibles:

- `goalBranch`;
- `csfBranch`;
- `assumptionCluster`;
- `solutionVariant`;
- `implementationBranch`.

## 10. Node

Un nodo representa una afirmacion o condicion.

Campos:

- `id`.
- `treeId`.
- `frameId`.
- `type`.
- `statement`.
- `shortLabel`.
- `status`.
- `tags`.
- `sourceIds`.
- `validation`.
- `promotedFrom`.
- `createdAt`, `updatedAt`.

Tipos iniciales para Goal Tree:

- `goal`;
- `criticalSuccessFactor`;
- `necessaryCondition`.

Tipos reservados para fases posteriores:

- `undesirableEffect`;
- `desiredEffect`;
- `rootCause`;
- `criticalRootCause`;
- `requirement`;
- `prerequisite`;
- `injection`;
- `obstacle`;
- `action`;
- `assumption`.

### 10.1 Node validation

Campos:

- `clarity`: `unknown`, `ok`, `needsWork`.
- `entityExistence`: `unknown`, `ok`, `needsEvidence`, `invalid`.
- `singleIdea`: `unknown`, `yes`, `no`.
- `completeSentence`: `unknown`, `yes`, `no`.
- `confidence`: `unknown`, `low`, `medium`, `high`.
- `notes`.

Fase 1 no bloquea por validacion. Solo marca estado y preguntas.

## 11. Link

Un link representa una relacion logica entre nodos.

Campos:

- `id`.
- `treeId`.
- `sourceNodeId`.
- `targetNodeId`.
- `type`.
- `logic`.
- `meaning`.
- `verbalization`.
- `assumptionIds`.
- `sourceIds`.
- `validation`.
- `visual`.
- `createdAt`, `updatedAt`.

### 11.1 Direccion del link en Goal Tree

En Goal Tree, el link apunta desde la condicion necesaria hacia el resultado que soporta.

Ejemplo:

- `sourceNodeId`: CSF o NC.
- `targetNodeId`: Goal o CSF.

Verbalizacion:

```text
In order to achieve TARGET, we must have/do SOURCE.
```

Esto mantiene el link como una relacion de soporte logico. El layout puede mostrar el target arriba y el source abajo sin cambiar la direccion logica guardada.

### 11.2 Tipos de link

Fase 1:

- `necessity`.

Reservados:

- `sufficiency`;
- `lateralDependency`;
- `additionalCause`;
- `magnitude`;
- `exclusiveOr`;
- `derivation`;
- `traceability`.

### 11.3 Link validation

Campos:

- `status`: `draft`, `questioned`, `reviewed`, `accepted`.
- `clarity`.
- `logicCheck`.
- `missingAssumptions`.
- `notes`.

En fase 1, `logicCheck` se centra en necessity verbalization. En CRT/FRT se ampliara a causalidad y suficiencia.

## 12. Assumption

Una assumption sostiene un link.

Campos:

- `id`.
- `treeId`.
- `linkId`.
- `statement`.
- `status`: `draft`, `questioned`, `invalid`, `accepted`.
- `sourceIds`.
- `promotedNodeId`: null si no ha sido promocionada.
- `createdAt`, `updatedAt`.

Accion clave:

- `Promote assumption to node`: crea un nodo de tipo `assumption` y mantiene `promotedNodeId`.

## 13. LayoutState

El layout se guarda separado de la logica.

Campos por nodo/frame:

- `x`, `y`.
- `width`, `height`.
- `pinned`.
- `layoutSource`: `manual`, `auto`, `imported`.

Campos por link:

- `route`: lista opcional de puntos.
- `routeSource`: `auto`, `manual`.
- `labelPosition`: posicion de hint o etiqueta si aplica.

Campos globales:

- `engine`: por ejemplo `elk`.
- `direction`: `TB`, `BT`, `LR`, `RL`.
- `lastRunAt`.
- `settings`.

Fase 1 usa auto-layout por comando. No debe reordenar agresivamente sin accion del usuario.

## 14. ViewState

Estado de la vista al reabrir un arbol.

Campos:

- `activeFrameId`.
- `selectedElementId`.
- `mode`: `navigation`, `editing`, `connection`, `frame`, `command`.
- `zoom`.
- `pan`.
- `breadcrumb`.

Los keyboard hints son efimeros y no se guardan.

## 15. Sources

Una fuente puede ser documento, nota, URL o referencia manual.

Campos:

- `id`.
- `type`: `file`, `note`, `url`, `manual`.
- `title`.
- `path`.
- `citation`.
- `notes`.

Fase 1 puede guardar fuentes aunque no tenga biblioteca contextual avanzada.

## 16. Checkpoints

Fase 1 soporta checkpoints manuales simples.

Campos en metadata de checkpoint:

- `id`.
- `createdAt`.
- `label`.
- `systemId`.
- `treeIds`.

No hay historial complejo ni merge en fase 1.

## 17. Export Markdown

La exportacion Markdown de Goal Tree debe incluir:

- nombre del sistema;
- profile minimo;
- goal;
- CSF;
- NC debajo de cada CSF;
- links y verbalizaciones;
- assumptions relevantes;
- fecha de exportacion.

## 18. Pendiente para validacion tecnica

- Comprobar si ELK.js representa frames anidados como compound nodes con suficiente calidad.
- Comprobar si hints sobre links son legibles cuando hay muchas conexiones.
- Comprobar si JSON por archivo sigue siendo comodo con arboles grandes.
- Decidir si `layout.route` debe almacenarse siempre o solo cuando el usuario modifica la ruta manualmente.
