# PRD v0.2: LTP Workbench

## 1. Vision

LTP Workbench es una aplicacion standalone de escritorio para trabajar problemas complejos mediante el Logical Thinking Process de William Dettmer.

La app no debe ser solo una herramienta de diagramacion. Debe ayudar al usuario a pensar con rigor: definir el sistema, establecer el benchmark de exito, construir arboles logicos, revisar assumptions y evolucionar perspectivas sobre el mismo sistema.

## 2. Principios

- El sistema es la entidad estable; los arboles son perspectivas o artefactos derivados.
- La app debe priorizar pensamiento sobre manipulacion visual.
- El flujo principal debe ser 100% usable sin raton.
- El usuario puede empezar incompleto y refinar despues.
- Los nodos y flechas son argumentos revisables, no solo elementos graficos.
- La validacion logica debe ayudar sin bloquear la captura inicial.

## 3. Entidades principales

- Workspace: carpeta local donde vive el trabajo.
- System: sistema estudiado.
- System Profile: descripcion del sistema, frontera, control, influencia, entorno y fuentes.
- System Benchmark: definicion de lo que el sistema deberia conseguir; en fase 1 se expresa como Goal Tree.
- Perspective: linea de trabajo sobre un sistema.
- Tree: artefacto LTP dentro de una perspectiva.
- Frame: contenedor visual/logico dentro de un arbol.
- Node: afirmacion, condicion, objetivo, CSF, NC, UDE, injection, obstaculo o accion.
- Link: relacion logica entre nodos, con significado y assumptions.
- Assumption: statement que sostiene un link.
- LayoutState: posiciones calculadas o fijadas de nodos, frames y conexiones.

## 4. Flujo inicial

1. El usuario abre la app.
2. Elige o confirma una carpeta de trabajo.
3. Crea o abre un sistema.
4. Completa el System Profile minimo.
5. Crea o revisa el System Benchmark.
6. En fase 1, crea un Goal Tree.
7. Construye el arbol con teclado, frames, links y auto-layout basico.
8. Guarda localmente.

## 5. System Profile

Campos iniciales:

- nombre del sistema;
- descripcion breve;
- frontera: dentro/fuera;
- span of control;
- sphere of influence;
- external environment;
- stakeholders;
- restricciones conocidas;
- sintomas, tensiones o preocupaciones iniciales;
- fuentes asociadas.

El profile debe ser editable, incompleto y vivo.

Para crear un sistema solo es obligatorio el nombre. Para considerar completo el System Profile minimo de fase 1 se pedira:

- nombre;
- owner o decision-maker;
- frontera breve;
- descripcion o proposito de trabajo.

Los demas campos pueden quedar como desconocidos y completarse mas adelante.

## 6. System Benchmark y Goal Tree

En fase 1, el benchmark se construye como Goal Tree.

El Goal Tree debe permitir:

- definir el goal unico del sistema;
- identificar owner o owners;
- crear 3 a 5 Critical Success Factors;
- crear Necessary Conditions debajo de CSF;
- conectar NC que soportan mas de un CSF;
- editar todo con teclado;
- guardar el benchmark como referencia para futuros CRT.

El Goal Tree no describe realidad actual. Define el estandar contra el que se evaluara la realidad.

## 7. Editor de arboles

Cada arbol tiene un frame principal. Dentro puede haber frames anidados.

El editor debe permitir:

- crear nodos rapidamente;
- editar texto inline;
- crear links entre nodos;
- marcar varios nodos origen y conectarlos a un mismo destino;
- crear frames dentro de frames;
- entrar y salir de frames;
- contraer y expandir frames;
- mover nodos entre frames;
- seleccionar nodos, links y frames sin raton;
- ejecutar auto-layout basico;
- fijar posiciones manualmente.

## 8. Keyboard-first

La app debe poder usarse 100% sin raton.

Modos de teclado:

- navegacion;
- edicion;
- conexion;
- frame;
- comandos.

Debe mostrarse siempre:

- modo activo;
- seleccion actual;
- frame activo;
- ruta del frame activo.

Atajos canonicos iniciales:

- `Cmd/Ctrl+K`: command palette;
- `H`: keyboard hints;
- `N`: nuevo nodo;
- `A`: anadir nodo hijo/debajo;
- `Shift+A`: anadir nodo padre/encima;
- `Enter`: editar seleccion;
- `Esc`: salir, cancelar o volver a navegacion;
- `M`: marcar varios nodos origen;
- `L`: modo conexion;
- `F`: nuevo frame;
- `[`: subir al frame padre;
- `]`: entrar en frame seleccionado;
- `/`: buscar;
- `P`: fijar o liberar posicion;
- `Cmd/Ctrl+Shift+L`: auto-layout del frame activo.

El modo activo se indicara con barra de estado persistente, acento visual del canvas y microcopy contextual.

## 9. Keyboard hint mode

Al activar hints, la app muestra letras o secuencias cortas sobre elementos seleccionables visibles.

Debe funcionar para:

- nodos;
- frames;
- links;
- botones;
- pestanas;
- elementos de lista;
- resultados filtrados.

Los links mostraran hints en su punto medio visible. En canvas densos, los hints se limitaran al frame activo o al conjunto filtrado por busqueda.

Flujo:

1. activar hints;
2. escribir la letra visible;
3. seleccionar/enfocar elemento;
4. ejecutar accion: editar, conectar, abrir, mover o revisar.

## 10. Links y assumptions

Cada link debe ser un objeto de primer nivel.

Debe registrar:

- origen y destino;
- tipo de logica;
- significado explicito;
- verbalizacion;
- assumptions;
- evidencia o fuente;
- estado de validacion;
- notas o preguntas pendientes.

En fase 1, los links del Goal Tree usan logica de necesidad. Deben poder verbalizarse como:

`In order to achieve X, we must have/do Y.`

Una assumption de un link podra promocionarse a nodo mediante la accion `Promote assumption to node`, conservando trazabilidad al link original.

## 11. Auto-layout

El auto-layout de fase 1 debe ser suficiente para:

- ordenar un Goal Tree de arriba abajo;
- reducir cruces simples;
- evitar solapamientos;
- respetar frames;
- respetar posiciones fijadas por el usuario cuando sea posible.

No se exige layout perfecto en fase 1. El objetivo es validar que el posicionamiento automatico ayuda y no estorba.

En fase 1 el auto-layout se ejecutara por comando. La app puede colocar nuevos nodos cerca de la seleccion, pero no debe reordenar agresivamente sin accion del usuario.

La primera opcion tecnica a evaluar para layout es ELK.js; Dagre queda como alternativa mas simple.

## 12. Persistencia y exportacion

Un workspace puede contener varios sistemas. Cada sistema vivira en su propia subcarpeta.

La fase 1 usara archivos locales legibles:

- JSON para datos del sistema, arboles, frames, nodos, links, assumptions y layout;
- Markdown para exportaciones simples.

Cada archivo de datos debe incluir `schemaVersion` y `updatedAt`.

El versionado de fase 1 sera simple: checkpoints manuales y backups recientes. No se implementara historial complejo.

## 13. Fase 1

Objetivo: demostrar que se puede crear un sistema y un Goal Tree real sin raton, con frames, links ricos y guardado local.

Incluye:

- elegir carpeta de trabajo;
- crear/abrir sistema;
- editar System Profile minimo;
- crear Goal Tree;
- crear goal, CSF y NC;
- crear frame principal;
- crear frames anidados basicos;
- crear y editar nodos con teclado;
- seleccionar nodos/frames/links con keyboard hints;
- conectar nodos con teclado;
- conectar varios nodos origen a un mismo nodo destino sin raton;
- abrir un link y editar su significado/assumptions;
- auto-layout basico por comando;
- guardar/cargar localmente;
- exportacion Markdown simple del Goal Tree.

No incluye:

- CRT completo;
- Evaporating Cloud;
- FRT;
- PRT/Transition Tree;
- forks avanzados;
- biblioteca contextual avanzada;
- CLR completa;
- exportacion PDF/Word avanzada.

## 14. Criterios de aceptacion de fase 1

- El usuario puede crear un sistema nuevo sin raton.
- El usuario puede completar el System Profile minimo sin raton.
- El usuario puede crear un Goal Tree con goal, tres CSF y varias NC sin raton.
- El usuario puede seleccionar cualquier nodo visible usando keyboard hints.
- El usuario puede seleccionar un frame usando keyboard hints.
- El usuario puede seleccionar un link usando keyboard hints.
- El usuario puede editar un nodo seleccionado sin raton.
- El usuario puede conectar dos nodos sin raton.
- El usuario puede marcar varios nodos y conectarlos a un mismo destino sin raton.
- El usuario puede abrir un link y editar sus assumptions.
- El usuario puede crear un frame dentro de otro frame sin raton.
- El usuario puede ejecutar auto-layout sobre el arbol.
- El usuario puede fijar una posicion y el layout la respeta razonablemente.
- El usuario puede guardar, cerrar, abrir y recuperar el arbol con nodos, links, frames y posiciones.
- El usuario puede exportar una version Markdown simple del Goal Tree.

## 15. Fases posteriores

### Fase 2: CRT

- Permitir benchmark provisional si no existe Goal Tree completo.
- Derivar UDE desde Goal/CSF.
- Crear CRT basico.
- Conservar trazabilidad Goal Tree -> CRT.
- Iniciar validacion de entidades y conexiones.

### Fase 3: Evaporating Cloud y FRT

- Crear EC desde conflicto o desde CRT.
- Registrar assumptions por flecha.
- Crear injections.
- Validar injections con FRT.

### Fase 4: Implementacion y forks

- Prerequisite Tree / Transition Tree.
- Forks de soluciones.
- Comparacion de alternativas.
- CLR mas completa.

### Fase 5: Conocimiento y exportaciones

- Biblioteca LTP contextual.
- Plantillas y ejemplos.
- Exportaciones PDF/Word/imagen.
- Informes de razonamiento.
