# Notas de lectura para el PRD

Fuentes revisadas:

- `inputs/Course Transcriptions/01 - Introduction.txt`
- `inputs/Course Transcriptions/02 - The Goal Tree.txt`
- `inputs/Course Transcriptions/03 - Part 1 - Categories of Legitimate Reservation.txt`
- `inputs/Course Transcriptions/04 - Part 1 - Current Reality Tree.txt`
- `inputs/Course Transcriptions/04 - Part 2 - Current Reality Tree.txt`
- `inputs/Course Transcriptions/05 - Evaporating Cloud.txt`

## Ideas relevantes para producto

### 1. LTP empieza por definir el sistema y su benchmark

Antes de analizar lo que ocurre, hay que saber que deberia conseguir el sistema.

Implicacion para la app:

- el sistema debe existir como entidad estable;
- el usuario debe poder definir frontera, control, influencia y entorno;
- el benchmark de exito debe separarse de la realidad actual;
- el Goal Tree es el artefacto natural para expresar ese benchmark.

### 2. Goal Tree como System Benchmark

El Goal Tree define:

- goal: el resultado final unico del sistema;
- critical success factors: condiciones terminales indispensables;
- necessary conditions: componentes funcionales o intermedios.

No describe la realidad actual. Sirve como vara de medir.

Implicacion para la app:

- el metadato del sistema debe incluir o enlazar un Goal Tree;
- los CSF y NC deben ser reutilizables por otros arboles;
- un CRT no deberia tratar UDE como quejas sueltas, sino como desviaciones contra goal o CSF.

### 3. CRT como comparacion entre benchmark y realidad

El CRT revela por que hay una diferencia entre lo que deberia ocurrir y lo que ocurre.

Los UDE deben ser negativos respecto al goal o los CSF del sistema. La transcripcion insiste en no confundir molestias locales con UDE del sistema.

Implicacion para la app:

- al crear UDE, la app deberia preguntar "respecto a que goal o CSF es indeseable?";
- cada UDE deberia poder enlazarse a un benchmark;
- el CRT puede construirse desde UDE hacia causas, pero se lee de causas hacia efectos.

### 4. EC como resolucion de conflicto del status quo

La Evaporating Cloud aparece cuando cambiar una causa raiz amenaza algun efecto deseado que otra parte del sistema necesita.

La nube contiene:

- objetivo comun;
- dos requirements o necesidades;
- dos prerequisites o wants en conflicto;
- supuestos que sostienen las flechas;
- injections como ideas de solucion, no soluciones verificadas.

La forma canonica no es intercambiable: `A` es el objetivo comun; `B` y `C` son
los needs; `D` y `D'` son los wants en conflicto. Visualmente son dos ramas
paralelas, `D -> B -> A` y `D' -> C -> A`, y el conflicto une exclusivamente
los wants.

Dettmer identifica cinco break points con assumptions: las cuatro flechas de
necesidad y el conflicto. Las flechas rectas se exploran completando "in order
to..., we must... because...". El conflicto requiere otra regla: "D and D' are
in conflict because...", buscando que regla, metodo, conocimiento, confianza o
cooperacion falta para poder satisfacer ambos wants.

Implicacion para la app:

- una EC puede derivarse de un CRT, pero tambien puede ser punto de partida si el conflicto ya es visible;
- requirements pueden venir del Goal Tree;
- prerequisites pueden venir de politicas actuales, acciones propuestas o causas raiz;
- las injections deben poder convertirse en entradas de un FRT para validacion.
- cada flecha y el conflicto deben abrir un inspector propio de assumptions;
- una EC aceptada no debe ocultar ningun break point sin revisar;
- el layout debe fijar roles, columnas y paralelismo, no inferirlos solo por Type.

### 5. Rutas no lineales

El material permite una secuencia clasica, pero el trabajo real puede comenzar en distintos puntos:

- Goal Tree primero para definir benchmark;
- CRT primero si los UDE estan claros y hay suficiente benchmark;
- EC primero si el conflicto es evidente;
- FRT despues de injections;
- PRT/Transition despues de validar cambios.

Implicacion para la app:

- no debe imponer un wizard lineal rigido;
- debe conservar trazabilidad entre artefactos;
- debe permitir forks de soluciones e hipotesis.

### 6. Validacion logica como capa progresiva

Las Categories of Legitimate Reservation son reglas de validacion, especialmente importantes para CRT y FRT.

Ideas de producto:

- capturar primero no debe ser bloqueado por validacion;
- despues, la app debe ayudar a endurecer nodos y conexiones;
- cada nodo necesita evidencia, claridad y una sola idea;
- cada conexion necesita significado explicito, supuestos y prueba de suficiencia;
- las flechas deben poder inspeccionarse como argumentos, no solo verse como lineas;
- las dudas deben quedar visibles como trabajo pendiente.

### 7. El software debe evitar distraer del razonamiento

Las transcripciones comparan papel y software. Papel ayuda a ver el sistema completo; software ayuda a editar, compartir y conservar.

Implicacion para la app:

- debe ofrecer vista visual y vista lista;
- la captura rapida debe ser posible sin raton;
- el usuario debe poder reorganizar sin friccion;
- debe ser facil ver el conjunto y tambien leer cada afirmacion.
