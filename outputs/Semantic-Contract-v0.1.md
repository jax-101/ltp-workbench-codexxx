# Semantic Contract v0.1

La revision humana de los cuatro oraculos y de los operadores esta resumida en
`outputs/Semantic-Oracle-Review.md`.

Fecha: 2026-07-16.

Estado: borrador interno ejecutable para Gate B. No es todavia el schema publico
`diagram-definition`.

## Objetivo

Fijar el significado que el futuro kernel debe conservar antes de migrar Goal
Tree o implementar CRT. El contrato separa la semantica del diagrama, la
agrupacion logica y su representacion visual.

Los archivos ejecutables estan en `semantic-contract/v0.1/` y se comprueban con:

```bash
npm run test:semantic
```

## Modelo composicional

Cada flecha directa es una relacion `SIMPLE` independiente. Cuando varias
relaciones llegan a una entidad, el perfil del diagrama combina esos argumentos:

- `OR` en suficiencia: cualquiera de las causas independientes basta;
- `AND` en necesidad: todas las condiciones independientes son necesarias.

Una relacion con varias entradas representa un grupo explicito. El grupo usa
`AND`, `OR`, `MAG` o `XOR` y se proyecta como junctor. Despues, el grupo participa
como un argumento completo en la combinacion implicita del destino.

Esto permite expresar sin ambiguedad:

```text
Suficiencia: A OR (B AND C) -> E
Necesidad:   A AND (B OR C) -> E
```

En el primer caso hay una relacion simple desde `A` y una relacion `AND` desde
`B+C`. En el segundo hay una relacion simple desde `A` y una relacion `OR` desde
`B+C`.

## Combinaciones

| Combinacion | Entradas | Semantica | Representacion |
| --- | ---: | --- | --- |
| `SIMPLE` | 1 | Un argumento directo | Flecha, sin junctor |
| `AND` | 2+ | Todas las entradas dependientes son necesarias para producir el argumento | Elipse |
| `OR` | 2+ | Cualquiera de las alternativas del grupo basta | Junctor `OR` |
| `MAG` | 2+ | Cada entrada aumenta aditivamente la magnitud del efecto | Bow-tie `MAG` |
| `XOR` | 2+ | Solo una alternativa puede estar activa | `<OR>` |

`MAG` admite contribuciones numericas positivas cuando se conocen. Si no se
cuantifican, la relacion sigue siendo valida pero recibe la advertencia
`MAG_CONTRIBUTION_UNQUANTIFIED`. No se inventan porcentajes.

## Tipos de relacion

- `CAUSALITY`: argumento de suficiencia, leido `If cause, then effect`.
- `NECESSITY`: argumento de necesidad, leido `In order to achieve target, we
  must have condition`.
- `CONFLICT`: incompatibilidad percibida entre dos wants; no es una flecha
  causal ni un junctor y no presupone `XOR`. Puede representar condiciones
  opuestas o alternativas que solo son incompatibles bajo las restricciones
  actuales.
- `derivations[]`: trazabilidad entre artefactos o entre una injection y una
  assumption. No se mezcla con las flechas internas.

En v0.1, una relacion causal o de necesidad tiene un unico output. Las salidas
multiples se representan mediante relaciones independientes para conservar
assumptions, seleccion e historial por flecha. Esta restriccion se revisara con
PrT/TrT antes del formato publico.

## Assumptions

Una assumption es un objeto de primer nivel. Su `subject` puede apuntar a:

- `RELATION`: el argumento completo;
- `INPUT`: un tramo desde una entrada al grupo;
- `OUTPUT`: el tramo desde el grupo al efecto;
- `CONFLICT`: la incompatibilidad entre wants.

Esta granularidad evita perder significado al convertir varias flechas en una
relacion n-aria. El runner rechaza una assumption que apunte a un tramo que no
pertenece a la relacion.

Su lifecycle es `DRAFT`, `SUPPORTED`, `CHALLENGED` o `INVALIDATED`.
`INVALIDATED` conserva statement, subject, fuentes y derivaciones; no equivale
a borrado.

## Derivaciones

Las derivaciones soportadas inicialmente son:

- `CHALLENGES_ASSUMPTION`;
- `DERIVED_FROM`;
- `VALIDATES`;
- `MITIGATES`.

Su estado es `PROPOSED`, `VALIDATED`, `REJECTED` o `SUPERSEDED`. Una injection
permanece como hipotesis hasta ser validada; no se convierte automaticamente en
solucion.

## Perfiles oraculo

| Perfil | Modo | Agregacion implicita | Particularidades verificadas |
| --- | --- | --- | --- |
| Goal Tree | Necesidad | `AND` | Un Goal, CSF recomendados 3-5, sin ciclos ni junctors |
| CRT | Suficiencia | `OR` | Causas independientes, `AND`, assumptions y loop negativo |
| EC | Necesidad | `AND` | Objective comun, dos o mas ramas NEED/WANT, conflictos conectados, assumptions por relacion e injection |
| FRT | Suficiencia | `OR` | Injection, `AND`, desired effect y negative branch |

Los microfixtures verifican por separado `AND`, `OR`, `MAG`, `XOR`, aridad,
render, referencias y ciclos prohibidos.

### Contrato especifico de EC

La EC no se valida solo contando elementos ni queda limitada a la forma bipolar.
`A=OBJECTIVE` es unico. Cada rama tiene un `branchId` estable, exactamente un
`NEED` y un `WANT`, y forma `WANT -> NEED -> OBJECTIVE`. Deben existir al menos
dos ramas. Los conflictos siguen siendo relaciones binarias entre wants de
ramas distintas y su grafo debe conectar todas las ramas. Las etiquetas
metodologicas `B/C/D/D'` o `R1/R2/R3/P1/P2/P3` son roles visibles unicos, no la
estructura persistida.

La presentacion recomendada usa direccion `RL`, columnas dinamicas
`[OBJECTIVE] [NEED...] [WANT...]` y un carril por `branchId`. El objective
compartido queda centrado entre todos los carriles. El oracle bipolar y el
tripartito de la Figura 5.9 se validan con el mismo compilador.

El perfil exige cobertura de assumptions para todas las relaciones cuando la
EC esta `ACCEPTED`. Una EC en captura puede avisar de cobertura incompleta; una
EC aceptada no puede dejar un break point sin assumptions. Ambos oraculos
conservan tres assumptions por relacion y usan scope `CONFLICT`
obligatoriamente en cada conflicto.

## Validacion progresiva

### Errores duros

- IDs duplicados o ausentes;
- endpoints inexistentes;
- Type, relacion o combinacion no admitidos por el perfil;
- aridad o representacion incompatible;
- assumption asociada al tramo equivocado;
- topologia minima incumplida;
- ciclo en un perfil que lo prohibe.

### Advertencias

- recomendacion metodologica, como CSF fuera de 3-5;
- `MAG` sin contribuciones cuantificadas;
- futuras reservas CLR que no invalidan la captura.
- EC en borrador sin assumptions en una relacion o con menos de tres.

### Revision humana

La automatizacion garantiza que el software respeta el contrato aprobado. No
puede demostrar por si sola que una afirmacion es verdadera, que la causalidad
existe o que una assumption es valida. Esas revisiones conservan estado,
evidencia, severidad y posible justificacion de waiver.

## Evidencia autonoma

El runner comprueba:

- 15 fixtures validos e invalidos;
- verbalizaciones deterministas;
- expresiones completas en cada destino;
- IDs estables `junction:<relationId>`;
- invariancia ante permutacion de inputs;
- ciclos permitidos y prohibidos;
- mutaciones de referencias, IDs y scopes de assumptions;
- round-trip JSON sin perdida;
- autoconsistencia del contrato y de cada perfil.

## Limites antes de 3C.14a

- Validar con el usuario las verbalizaciones y los cuatro diagramas oraculo.
- Ampliar CLR desde estructura a revision asistida.
- Fijar semantica de copiar, borrar y seleccionar una relacion parcialmente.
- Decidir si una contribucion `MAG` cuantificada exige unidad y escala comun.
- Probar que EC y sus injections no requieren ampliar las primitivas base.

## Fuentes

- H. William Dettmer, *The Logical Thinking Process* (2007), capitulo 2,
  especialmente pp. 46-48, y CRT pp. 112-114.
- Transcripciones locales del curso LTP: Goal Tree, CRT, Evaporating Cloud y FRT.
- Flying Logic, [Constructing Graphs](https://docs.flyinglogic.com/user-guide/constructing-graphs.html).
- Flying Logic, [Current Reality Tree](https://docs.flyinglogic.com/thinking-with-flying-logic/current-reality-tree).
- Flying Logic, [Future Reality Tree](https://docs.flyinglogic.com/thinking-with-flying-logic/future-reality-tree.html).
