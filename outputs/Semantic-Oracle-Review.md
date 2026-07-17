# Semantic Oracle Review

Fecha: 2026-07-17.

Estado: **APROBADO** como base metodologica para iniciar `3C.14a`.

Objetivo: validar el significado de los cuatro oraculos de Gate B antes de
iniciar `3C.14a`. Los diagramas no fijan posiciones ni apariencia final; fijan
entidades, argumentos, junctions y verbalizaciones.

## 1. Goal Tree

```mermaid
flowchart BT
  demand["NC: High market demand"] --> revenue["CSF: Maximum revenues"]
  efficiency["NC: Efficient production operations"] --> cost["CSF: Controlled costs"]
  inventory["NC: Optimized inventory management"] --> investment["CSF: Optimized investment"]
  revenue --> goal["GOAL: Make more money now and in the future"]
  cost --> goal
  investment --> goal
```

Lectura clave: para alcanzar el Goal debemos tener los tres CSF. Las entradas
son `AND` implicito de necesidad; no aparece un junctor.

Validar:

- Los tres CSF son condiciones necesarias, no alternativas.
- Una flecha se lee desde la condicion hacia el objetivo soportado.
- Goal Tree no necesita junctions de suficiencia.

## 2. Current Reality Tree

```mermaid
flowchart BT
  policy["CRC: Production is scheduled in large batches"] --> capacity["Large batches occupy scarce capacity"]
  policy --> feedback["Production feedback arrives late"]
  capacity --> joint((AND))
  feedback --> joint
  joint --> rework["Rework accumulates"]
  equipment["Root cause: Critical equipment is unreliable"] --> rework
  rework --> delivery["UDE: Customer deliveries are late"]
  delivery --> pressure["Expediting pressure increases"]
  pressure --> instability["The production schedule becomes unstable"]
  instability --> rework
  pressure --> expense["UDE: Operating expense increases"]
```

Lecturas clave:

- Capacity y feedback producen rework conjuntamente mediante `AND`.
- Equipment e instability son causas independientes adicionales de rework.
- Los tres argumentos entrantes se agregan como `OR` implicito.
- Rework, delivery, pressure e instability forman un loop negativo.

Assumptions oraculo:

- El conjunto capacity + delayed feedback genera trabajo que debe repetirse.
- Scarce capacity impide absorber el trabajo incompleto en otro lugar.

Validar:

- El `AND` expresa dependencia conjunta y no simple simultaneidad.
- Las causas independientes no necesitan un junctor `OR`.
- El loop conserva todas las flechas semanticas aunque Layout rompa una
  temporalmente para calcular capas.

## 3. Evaporating Cloud

```mermaid
flowchart RL
  d["D - WANT: Produce small batches"] --> b["B - NEED: Protect system flow"] --> a["A - OBJECTIVE: Operate profitably and reliably"]
  dp["D' - WANT: Produce large batches"] --> c["C - NEED: Control operating cost"] --> a
  d <-. "CONFLICT" .-> dp
```

La posicion canonica es parte del oraculo, no una preferencia cosmetica:

| Fila | Columna A | Columna needs | Columna wants |
| --- | --- | --- | --- |
| Rama superior | `A` compartido | `B` | `D` |
| Rama inferior | `A` compartido | `C` | `D'` |

Las dos ramas permanecen paralelas: `D -> B -> A` y `D' -> C -> A`. `B` debe
quedar alineado con `D`; `C`, con `D'`. El conflicto solo une `D` y `D'`.

Lecturas clave:

- `B` y `C` son needs necesarios para `A`; no estan en conflicto.
- `D` es el want percibido como necesario para `B` y `D'` para `C`.
- `CONFLICT` no es `XOR`: puede proceder de una restriccion contextual.
- La injection desafia una assumption concreta; no apunta genericamente al want.

Assumptions oraculo: hay tres para cada uno de los cinco break points.

- Flechas rectas `B-A`, `C-A`, `D-B` y `D'-C`: se formulan leyendo "in order
  to OUTPUT, we must have INPUT because...". La assumption debe explicar la
  existencia de esa necesidad, no repetir ninguno de los dos statements.
- Conflicto `D-D'`: se formula "D and D' are in conflict because..." y debe
  explicar que falta para poder tener ambos, por ejemplo una regla, metodo,
  conocimiento, medida compartida, confianza o voluntad de cooperar.
- El fixture conserva cada assumption como objeto seleccionable asociado a su
  flecha o al conflicto. No son notas de texto agregadas al diagrama.

Validar:

- Objective, needs y wants ocupan sus roles canonicos.
- Las ramas no se cruzan ni intercambian needs o wants.
- El conflicto reside entre wants, no entre needs.
- Ninguna de las cinco relaciones queda sin assumptions; tres por relacion es
  el minimo recomendado del oraculo de trabajo.
- Una injection es una propuesta hasta que FRT la valida.

Fuentes contrastadas:

- Dettmer, *The Logical Thinking Process*, capitulo 5, pp. 165-176: elementos,
  cinco break points y assumptions ocultas en cada flecha.
- *Behind the Cloud*, capitulo 5, pp. 41-66: reglas para assumptions de las
  cuatro flechas rectas y recomendacion de tres o cuatro por flecha examinada.
- *Behind the Cloud*, capitulo 17, pp. 174-185: reglas especificas para `D-D'`
  y pregunta "what is missing?".
- `inputs/Course Transcriptions/05 - Evaporating Cloud.txt`: conflicto en wants,
  needs no negociables y repeticion del proceso para cada tramo.

## 4. Future Reality Tree

```mermaid
flowchart BT
  scheduling["INJECTION: Adopt finite-capacity scheduling"] --> joint((AND))
  data["PRECONDITION: Capacity data is accurate"] --> joint
  joint --> feasible["Schedules are feasible"]
  feasible --> delivery["DE: Customer deliveries are reliable"]
  scheduling --> resistance["UDE: Planners initially reject the new schedules"]
  pilot["INJECTION: Pilot the method with planners"] -. "MITIGATES" .-> resistance
```

Lecturas clave:

- Scheduling y accurate data son conjuntamente suficientes para feasible
  schedules.
- La misma injection abre una negative branch hacia resistance.
- Pilot with planners se registra como mitigacion propuesta, no como una flecha
  positiva que causaria resistance.

Validar:

- Una injection sigue siendo hipotesis mientras su derivacion esta `PROPOSED`.
- La UDE pertenece a una negative branch del FRT.
- Mitigar una UDE no debe verbalizarse como causarla.

## Decisiones de aprobacion

Gate B puede considerarse metodologicamente validado cuando:

1. Las cuatro lecturas anteriores son correctas.
2. `AND`, OR implicito, `MAG` y `XOR` tienen significados distintos.
3. `CONFLICT` permanece separado de `XOR`.
4. Assumptions pueden pertenecer al argumento o a un tramo concreto.
5. Injection, mitigation y validation conservan estados explicitos.

Las correcciones se aplicaran primero a los fixtures y despues al contrato. No
se adaptara el fixture para hacer pasar una implementacion ya escrita.

## 5. Microcasos de operadores

| Operador | Lectura | Representacion |
| --- | --- | --- |
| `SIMPLE` | Una premisa forma un argumento independiente. | Flecha directa, sin junctor. |
| `AND` | Todas las premisas del grupo son necesarias para que el argumento sea suficiente. | Junctor explicito. |
| `OR` | Cualquiera de las premisas del grupo basta dentro del mismo argumento. | Junctor explicito solo al agrupar alternativas. |
| `MAG` | Varias premisas producen el efecto por acumulacion cuantificada. | Junctor explicito con magnitud o umbral en todas sus entradas. |
| `XOR` | Exactamente una alternativa del grupo puede sostener el argumento. | Junctor explicito; no se infiere de un conflicto EC. |

Composiciones que debe preservar el kernel:

- `A OR (B AND C)`: dos argumentos independientes llegan al destino; el segundo
  contiene un junctor `AND`.
- `A AND (B OR C)`: el destino de necesidad exige dos argumentos; el segundo
  contiene un junctor `OR`.
- Una coleccion de flechas directas no se fusiona en una unica relacion: cada
  argumento mantiene su ID, assumptions y ciclo de vida.

Los microfixtures validos e invalidos que fijan estas reglas estan en
`semantic-contract/v0.1/microfixtures.json` y se ejecutan con
`npm run test:semantic`.
