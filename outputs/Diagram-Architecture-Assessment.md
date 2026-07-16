# Multi-Diagram Architecture Assessment

Fecha: 2026-07-16.

## Conclusion

LTP Workbench no debe modelar CRT, FRT, EC, PrT y TrT como Goal Trees con otros colores. Comparten canvas, seleccion, frames, historial y un backend de layout, pero difieren en proceso logico, topologia, clases de entidad, aridad de relaciones y validaciones.

Se mantiene un unico backend `ELK layered`, precedido por un compilador semantico por tipo de diagrama. El registro deja de ser una lista de tipos visuales y pasa a describir un contrato de dominio completo.

## Diferencias verificadas

| Diagrama | Logica principal | Elementos caracteristicos | Estructura que condiciona el modelo |
|---|---|---|---|
| Goal Tree | Condicion necesaria | Goal, CSF, NC | Jerarquia dirigida hacia el Goal. |
| CRT | Causa suficiente | UDE, precondition, intermediate effect, action | Causas independientes `OR`, conjuntos `AND`, causas raiz y bucles negativos. |
| FRT | Causa suficiente | Injection/solution, DE, UDE, precondition, intermediate effect, action | Junctions `AND`, ramas negativas y bucles positivos. |
| EC | Condicion necesaria | Common objective, needs, wants, conflict, assumptions, injections | Topologia canonica A-B-C-D-D', conflicto entre wants y assumptions sobre relaciones. |
| PrT | Condicion necesaria | Objective, obstacle/overcome, milestone | Alternativas `OR` y conjuntos de milestones `AND`. |
| TrT | Causa suficiente | Goal, precondition, action, intermediate effect | Cada paso combina realidad actual y accion para producir un resultado. |

TOCICO trata estas herramientas como competencias distintas dentro del mismo proceso. La documentacion de Flying Logic confirma que CRT, FRT y TrT usan causa suficiente, mientras EC y PrT usan condicion necesaria; tambien documenta junctions `AND`, causas independientes `OR` y back edges.

## Limites del modelo actual

1. `diagram-registry.js` solo declara Goal Tree, tipos de nodo y opciones de layout.
2. `trees[]` presupone que todo artefacto es un arbol, pero EC no lo es y CRT/FRT pueden contener ciclos.
3. Un link solo admite `sourceNodeId -> targetNodeId`; no representa una relacion n-aria sin inventar nodos de contenido.
4. Las assumptions pertenecen a un link binario y no a una relacion logica completa o a una derivacion entre diagramas.
5. El validador comprueba integridad estructural, no reglas especificas de diagrama, aridad, roles o topologia.
6. El coordinador de layout contiene una especializacion `goalTree` en vez de consumir una proyeccion generica.

## Modelo recomendado

### Artefacto semantico

Renombrar gradualmente `trees` a `diagrams` en schema `0.3`, conservando una migracion reversible. Cada diagrama contiene:

```text
diagram
  id, systemId, type, logicMode
  elements[]
  relations[]
  assumptions[]
  derivations[]
  layout
```

`elements[]` contiene afirmaciones con un Type definido por el registro. `relations[]` representa argumentos logicos de primera clase:

```text
relation
  id
  type
  operator: AND | OR | NECESSITY | CONFLICT
  inputs: [{ elementId, role }]
  outputs: [{ elementId, role }]
  assumptionIds[]
```

Una junction no se guarda como una afirmacion ficticia. Es la representacion visual de una relacion n-aria. Su identificador de layout se deriva de la relacion, por ejemplo `junction:<relationId>`, para que seleccion, rutas y Undo sean estables.

### Registro por diagrama

Cada definicion declara:

- `logicMode` y direccion de lectura;
- Types de elemento, atributos, cardinalidad y unicidad;
- tipos de relacion, roles, operadores y aridad permitida;
- plantilla topologica opcional, necesaria para EC;
- reglas duras y advertencias progresivas;
- acciones de dominio disponibles y valores iniciales;
- perfil de layout, puertos, junctions, ciclos y routing;
- presentacion de entidades, relaciones y editor.

### Compilador de layout

El motor recibe un `LayoutGraph` neutral, no el modelo semantico directamente:

```text
Diagram + DiagramDefinition
  -> Semantic validation
  -> Layout projection (synthetic junctions, ports, rank constraints)
  -> ELK layered
  -> Route projection
  -> Visual layout keyed by semantic IDs
```

Asi ELK sigue siendo unico. Las diferencias se expresan en la proyeccion y la configuracion, no mediante ramas crecientes dentro del renderer o del motor.

### Validacion y trazabilidad

La validacion se divide en tres niveles:

1. Integridad comun: IDs, endpoints, frames y referencias.
2. Reglas del diagrama: Types, aridad, roles, topologia y ciclos permitidos.
3. Revision asistida: Categories of Legitimate Reservation y advertencias no bloqueantes.

Las relaciones entre artefactos se guardan como `derivations`, separadas de las flechas internas: Goal/CSF -> UDE, causa raiz -> EC, injection -> FRT y milestone -> TrT.

## Secuencia recomendada

1. Congelar tres fixtures de contrato: CRT con `AND/OR` y loop, EC canonica con assumptions y FRT con injection y negative branch.
2. Definir schema `0.3`, migracion desde Goal Tree `0.2` y serializacion estable.
3. Extraer un kernel generico de elementos, relaciones n-arias, derivaciones y validadores.
4. Crear la proyeccion neutral a ELK y demostrar que Goal Tree conserva exactamente su comportamiento.
5. Validar CRT de extremo a extremo antes de implementar mas diagramas.
6. Implementar EC y FRT como paquetes declarativos; dejar PrT y TrT para la fase de implementacion.

Las operaciones de borrar, copiar/pegar y CLI deben construirse sobre este kernel para incluir relaciones y junctions sin reglas especiales posteriores.

## Fuentes consultadas

- TOCICO, TP Practitioner Certification: https://www.tocico.org/tp-practitioner-exam
- TOCICO, Development of TOC: https://www.tocico.org/resource/collection/B7228A41-D58A-4BAB-9E56-EE9D6F7AA21F/Schragenheim%2C_Eli_Development_of_TOC_v7_TOCICO-FINAL.pdf
- Flying Logic, overview: https://docs.flyinglogic.com/thinking-with-flying-logic/overview-of-the-theory-of-constraints.html
- Flying Logic, CRT: https://docs.flyinglogic.com/thinking-with-flying-logic/current-reality-tree
- Flying Logic, FRT: https://docs.flyinglogic.com/thinking-with-flying-logic/future-reality-tree.html
- Flying Logic, EC: https://docs.flyinglogic.com/thinking-with-flying-logic/evaporating-cloud-conflict-resolution
- Flying Logic, PrT: https://docs.flyinglogic.com/thinking-with-flying-logic/prerequisite-tree
- Flying Logic, TrT: https://docs.flyinglogic.com/thinking-with-flying-logic/transition-tree
