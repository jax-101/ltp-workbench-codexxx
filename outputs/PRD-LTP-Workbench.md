# PRD: LTP Workbench

## 1. Proposito

Crear una aplicacion standalone de escritorio para trabajar problemas complejos usando la metodologia LTP (Logical Thinking Process) de William Dettmer.

La app debe ayudar al usuario a pasar de un sistema poco entendido o un problema difuso a un razonamiento estructurado, visual y revisable, usando los arboles y herramientas logicas de LTP.

## 2. Principio de producto

La aplicacion debe priorizar el pensamiento sobre la interfaz.

El usuario debe poder abrir la app, elegir donde va a trabajar, definir o revisar el sistema, seleccionar que perspectiva o herramienta LTP quiere trabajar, y empezar a capturar ideas casi sin usar el raton. El raton debe estar disponible, pero no ser necesario para el flujo principal.

El sistema debe ser la entidad estable. Los arboles son perspectivas, analisis o artefactos derivados sobre ese sistema.

La aplicacion debe distinguir entre describir el sistema y definir el benchmark de exito del sistema. El benchmark, normalmente expresado como Goal Tree, es lo que permite decidir si la realidad actual es aceptable o contiene desviaciones relevantes.

## 3. Carpeta de trabajo

Al iniciar o crear un nuevo caso, la aplicacion debe pedir o mostrar claramente una carpeta de trabajo.

Esa carpeta debe contener todo lo relacionado con el sistema o caso:

- archivo principal del sistema;
- metadatos del sistema;
- arboles creados;
- perspectivas de analisis;
- forks de soluciones propuestas;
- notas;
- referencias o documentos asociados;
- exportaciones;
- historial o versiones si aplica.

La carpeta de trabajo debe ser visible para el usuario en todo momento, al menos como ruta o nombre de proyecto activo.

## 4. Metadato del sistema

Antes de elegir un arbol concreto, la aplicacion debe permitir definir el sistema que se va a estudiar.

El metadato del sistema debe actuar como contexto compartido para todos los arboles y perspectivas. Varios arboles pueden referirse al mismo sistema, incluso si nacen de rutas de analisis distintas.

El metadato debe dividirse en dos capas:

- System Profile: informacion descriptiva del sistema y de la situacion.
- System Benchmark: definicion de lo que el sistema deberia conseguir.

### 4.1 System Profile

Metadatos descriptivos iniciales:

- nombre del sistema;
- descripcion breve;
- frontera del sistema: que incluye y que queda fuera;
- span of control: elementos que el usuario o decisor puede cambiar directamente;
- sphere of influence: elementos que no controla directamente pero puede influir;
- external environment: elementos relevantes que quedan fuera de control e influencia;
- stakeholders o actores relevantes;
- entorno o contexto;
- restricciones conocidas;
- sintomas, preocupaciones o tensiones iniciales;
- documentos o fuentes asociadas;
- estado actual de comprension: exploratorio, diagnosticado, solucion en diseno, implantacion, revision.

### 4.2 System Benchmark

El System Benchmark define lo que deberia estar ocurriendo si el sistema funcionara correctamente.

Debe poder capturarse como Goal Tree o como borrador que luego se convierta en Goal Tree:

- goal: el unico resultado final para el cual existe el sistema, desde el punto de vista del owner;
- owners: persona, grupo o entidad que definiria el goal;
- critical success factors (CSF): tres a cinco condiciones terminales indispensables para lograr el goal;
- necessary conditions (NC): condiciones, actividades o resultados intermedios necesarios para alcanzar los CSF;
- medidas de exito o evidencias observables asociadas al goal y CSF;
- relaciones de anidamiento con sistemas superiores o inferiores.

El Goal Tree no describe la realidad actual. Define el estandar de exito. La realidad actual se evalua comparandola contra ese estandar.

El metadato del sistema no debe ser una ficha burocratica. Debe ser editable, incompleto y vivo. La app debe permitir empezar con poco e ir refinandolo a medida que los arboles revelen mas informacion.

## 5. Derivacion entre artefactos LTP

La aplicacion debe tratar los artefactos LTP como conectados entre si, no como documentos aislados.

Derivaciones importantes:

- Goal Tree -> CRT: el goal y los CSF proporcionan benchmarks para identificar desviaciones de realidad; esas desviaciones se convierten en UDE.
- Goal Tree -> EC: el goal puede convertirse en objetivo comun de una nube, y los CSF pueden convertirse en requirements.
- CRT -> EC: un critical root cause puede revelar un conflicto entre cambiar el status quo y conservar algun desired effect que otra parte del sistema necesita.
- EC -> FRT: una injection propuesta para evaporar el conflicto debe validarse logicamente antes de considerarse solucion.
- FRT -> PRT/Transition: las injections validadas se convierten en trabajo de implantacion, obstaculos y necessary conditions.
- Goal Tree -> CRT alternativo: CSF o NC pueden sugerir UDE o DE que abran una ruta distinta hacia un CRT.
- EC -> CRT retrospectivo: una nube puede construirse primero cuando el conflicto es evidente, y despues usarse para buscar el CRT que explica como se llego a ese conflicto.

Cada derivacion debe conservar trazabilidad: artefacto origen, nodo origen, tipo de relacion y razonamiento que justifica la derivacion.

## 6. Perspectivas, arboles y forks

Un mismo sistema puede tener varias perspectivas de trabajo.

Una perspectiva puede ser:

- un arbol LTP concreto;
- una hipotesis de diagnostico;
- una solucion propuesta;
- una version alternativa de una solucion;
- una ruta de analisis que empieza en un artefacto y deriva en otro.

La app debe permitir forks. Por ejemplo, desde una propuesta de solucion se puede crear una rama alternativa sin perder la relacion con el sistema original ni con los arboles previos.

Los forks deben conservar trazabilidad:

- de que sistema dependen;
- de que arbol, nodo, supuesto o solucion nacen;
- que decisiones o hipotesis cambian;
- que artefactos se han derivado a partir de ellos.

## 7. Flujo inicial esperado

El flujo de entrada ideal es:

1. Abrir la aplicacion.
2. Ver la carpeta de trabajo actual o elegir una nueva.
3. Crear o abrir un sistema.
4. Revisar o completar el System Profile minimo.
5. Revisar si existe un System Benchmark o crear un borrador.
6. Elegir que perspectiva, arbol o fork se va a trabajar.
7. Entrar directamente en modo de captura y construccion.

La app no debe obligar a rellenar demasiados metadatos antes de empezar. Debe permitir empezar con una formulacion imperfecta del problema y refinarla durante el trabajo.

## 8. Seleccion del arbol o herramienta LTP

La aplicacion debe permitir elegir el primer artefacto de trabajo dentro de un sistema.

Opciones iniciales previstas:

- Goal Tree;
- Current Reality Tree (CRT);
- Conflict Resolution Diagram / Evaporating Cloud;
- Future Reality Tree (FRT);
- Negative Branch Reservation;
- Prerequisite Tree;
- Transition Tree;
- Strategy and Tactics Tree.

La app debe poder recomendar una herramienta inicial si el usuario no esta seguro, pero no debe bloquear la eleccion manual.

La app debe soportar rutas no lineales de LTP. Por ejemplo:

- construir primero un Goal Tree y usar sus Critical Success Factors (CSF) o Necessary Conditions (NC) para encontrar Desired Effects (DE) o Undesirable Effects (UDE) que alimenten un CRT;
- empezar por una Evaporating Cloud (EC) cuando el conflicto es claro, y despues buscar o construir el CRT que explica como se ha llegado a ese conflicto;
- construir un CRT primero y derivar desde el una nube, inyecciones, FRT, NBR o arboles de implantacion;
- comparar varios forks de solucion propuestos para el mismo sistema.

## 9. Experiencia de trabajo principal

Una vez elegido el arbol, la app debe entrar en un espacio de trabajo centrado en construirlo.

El usuario debe poder:

- crear nodos rapidamente;
- editar texto de nodos sin abrir modales innecesarios;
- conectar nodos con relaciones logicas;
- navegar entre nodos con teclado;
- reordenar o agrupar elementos;
- marcar dudas, supuestos o evidencia;
- marcar si una afirmacion pertenece al profile, benchmark, realidad actual, conflicto, futuro deseado o implantacion;
- cambiar de vista entre estructura visual y lista editable.

El modo visual debe existir, pero la captura rapida con teclado es prioritaria.

## 10. Canvas, frames y auto-layout

Cada arbol debe tener un frame principal. El frame principal representa el artefacto completo: Goal Tree, CRT, EC, FRT, PRT, Transition Tree u otro.

Dentro de un frame principal, el usuario debe poder crear frames internos. Un frame interno puede contener:

- entidades;
- conexiones entre entidades;
- otros frames anidados;
- notas o marcadores visuales;
- subconjuntos logicos del arbol, como una rama de UDE, una zona de supuestos, un cluster causal, una solucion candidata o una rama de implantacion.

Los frames deben servir para organizar pensamiento, no solo para decorar el canvas. Deben poder usarse para:

- agrupar entidades relacionadas;
- representar una perspectiva parcial dentro del arbol;
- aislar una rama para trabajarla con foco;
- contener forks o variantes;
- contraer y expandir partes del arbol;
- mover bloques completos sin romper conexiones.

### 10.1 Creacion sin raton

El usuario debe poder crear arboles completos sin echar mano del raton.

El editor debe permitir, mediante teclado:

- crear el frame principal al elegir un tipo de arbol;
- crear un frame dentro del frame actual;
- entrar en un frame para trabajar dentro de el;
- salir al frame padre;
- crear entidades dentro del frame activo;
- mover la entidad seleccionada a otro frame;
- crear conexiones entre entidades seleccionadas;
- crear entidad y conectarla en una sola accion;
- navegar entre entidades por estructura logica, no solo por posicion visual.

El raton debe permitir las mismas acciones de forma visual, pero el flujo de teclado debe ser completo.

### 10.2 Posicionamiento automatico

La app debe ser capaz de optimizar el posicionamiento de entidades y frames.

Objetivos del auto-layout:

- minimizar cruces de flechas;
- mantener legible la direccion logica del arbol;
- respetar el tipo de logica del arbol: necessity o sufficiency;
- mantener entidades relacionadas cerca;
- preservar agrupaciones dentro de frames;
- evitar solapamientos;
- conservar suficiente espacio para leer textos completos;
- permitir recolocar manualmente sin que el sistema destruya intenciones explicitas del usuario.

El auto-layout debe poder ejecutarse:

- automaticamente al crear o conectar entidades;
- manualmente mediante comando;
- dentro de un frame concreto;
- sobre el arbol completo;
- en modo suave, respetando posiciones fijadas por el usuario;
- en modo completo, recalculando la disposicion global.

### 10.3 Cruces de flechas

A medida que el usuario relaciona entidades, la aplicacion debe intentar minimizar el numero de cruces de flechas.

La reduccion de cruces debe considerar:

- reordenacion de entidades dentro de una capa;
- separacion de ramas;
- uso de frames para encapsular clusters;
- rutas de flecha ortogonales o curvas legibles;
- off-page connectors o conectores de salto cuando el arbol sea demasiado grande;
- avisos cuando una relacion nueva vuelve la visualizacion demasiado densa.

El usuario debe poder aceptar, rechazar o fijar posiciones si el algoritmo propone un reordenamiento que no encaja con su intencion.

### 10.4 Modelo visual

El modelo visual debe distinguir entre:

- posicion calculada;
- posicion fijada manualmente;
- pertenencia a frame;
- orden logico;
- orden visual;
- conexiones internas al frame;
- conexiones que entran o salen del frame.

Esta distincion es importante para poder optimizar la visualizacion sin perder la estructura logica real.

## 11. Uso sin raton

El flujo principal debe estar disenado para teclado.

La aplicacion debe ser completamente navegable sin tocar el raton. Esto incluye no solo crear contenido, sino tambien seleccionar entidades existentes, enfocar frames, editar texto, conectar elementos, abrir paneles, cambiar de perspectiva y ejecutar comandos.

Acciones clave:

- crear frame;
- entrar en frame;
- salir de frame;
- contraer o expandir frame;
- crear nuevo nodo;
- crear nodo hijo o consecuencia;
- crear nodo anterior o causa;
- editar nodo actual;
- moverse entre nodos;
- mover nodo o frame seleccionado;
- mover nodo a otro frame;
- conectar nodos;
- seleccionar origen y destino de una conexion;
- recalcular layout del frame activo;
- recalcular layout del arbol completo;
- fijar o liberar posicion de nodo/frame;
- marcar nodo como supuesto, efecto indeseable, objetivo, inyeccion, obstaculo o accion;
- marcar nodo como goal, CSF, NC, UDE, DE, requirement o prerequisite;
- abrir selector de arbol;
- abrir selector de sistema o perspectiva;
- crear fork;
- guardar;
- buscar;
- abrir comandos.

La app debe incluir una paleta de comandos para acciones frecuentes. El raton debe funcionar para usuarios que prefieran interaccion visual, pero no debe ser el camino obligatorio.

### 11.1 Keyboard hint mode

La app debe incluir un modo de seleccion visual por teclado.

Al activar este modo mediante una combinacion basica, la interfaz debe mostrar temporalmente una letra o combinacion corta de letras asociada a cada elemento seleccionable visible.

Elementos que deben poder recibir hints:

- entidades del arbol;
- frames;
- conexiones;
- botones visibles;
- pestanas o paneles;
- elementos de listas;
- resultados de busqueda;
- comandos frecuentes si estan visibles.

Flujo esperado:

1. El usuario pulsa el atajo de hints.
2. La app muestra etiquetas visuales sobre los elementos seleccionables.
3. El usuario escribe la letra o secuencia asociada.
4. La app selecciona o enfoca ese elemento.
5. El usuario ejecuta una accion: editar, conectar, mover, abrir menu, entrar en frame, etc.

Ejemplos de uso:

- activar hints, pulsar `F`, seleccionar una entidad y empezar a editar;
- activar hints, seleccionar entidad origen, activar comando conectar, seleccionar entidad destino;
- activar hints, seleccionar un frame y entrar en el;
- activar hints, seleccionar una conexion y revisar sus supuestos;
- activar hints, seleccionar una entidad y cambiar su tipo a UDE, CSF, NC o injection.

### 11.2 Reglas del modo hints

Los hints deben ser:

- visibles sin tapar el texto esencial;
- cortos;
- estables mientras el modo este activo;
- generados solo para elementos visibles o buscables;
- compatibles con zoom y canvas grande;
- cancelables con una tecla simple;
- usables con secuencias de dos letras cuando haya muchos elementos.

El modo hints debe funcionar en combinacion con busqueda. Si hay demasiadas entidades en pantalla, el usuario debe poder filtrar por texto y luego activar hints sobre el conjunto reducido.

### 11.3 Foco y modos de teclado

El editor debe distinguir entre:

- modo navegacion: moverse y seleccionar;
- modo edicion: escribir texto dentro de una entidad;
- modo conexion: seleccionar origen y destino;
- modo frame: entrar, salir, contraer, expandir y mover agrupaciones;
- modo comandos: ejecutar acciones por nombre.

Debe ser siempre claro en que modo esta el usuario. Salir de cualquier modo debe ser rapido y predecible.

## 12. Validacion logica y evidencia

La app debe ayudar a construir pensamiento defendible, no solo diagramas bonitos.

Cada nodo debe poder registrar:

- texto de la afirmacion;
- tipo de afirmacion;
- fuente o evidencia;
- grado de confianza;
- preguntas pendientes;
- si contiene una idea unica o varias;
- si esta expresada como frase completa;
- relacion con otros nodos.

Cada conexion debe poder registrar:

- tipo de logica: necessity, sufficiency, lateral dependency, additional cause, magnitude, exclusive-or;
- significado explicito de la flecha;
- supuestos implicitos y explicitos;
- assumptions detras de la relacion, formuladas como statements editables;
- fuente o evidencia que respalda la relacion;
- verbalizacion de la flecha: por ejemplo, "in order to... we must..." o "if... then...";
- preguntas de validacion;
- estado de revision: borrador, dudoso, revisado, aceptado.

Las flechas deben ser objetos de primer nivel. No son solo elementos visuales.

Cada flecha debe poder abrirse o enfocarse para revisar:

- que afirma exactamente la relacion;
- por que el origen lleva al destino;
- que assumptions sostienen esa relacion;
- que assumption podria ser falsa;
- si faltan causas contribuyentes;
- si la flecha contiene un salto logico demasiado largo;
- si la direccion causa-efecto esta invertida.

En una Evaporating Cloud, las flechas deben soportar explicitamente el trabajo de assumptions. El usuario debe poder leer cada tramo como "in order to X, we must Y, because..." y registrar multiples "becauses" debajo de la flecha.

En CRT y FRT, las flechas deben soportar assumptions de suficiencia y causalidad. La app debe ayudar a distinguir entre la entidad, la relacion causal y las assumptions que hacen que esa relacion sea defendible.

La app debe incorporar las Categories of Legitimate Reservation como ayuda contextual, especialmente:

- claridad;
- entity existence;
- causality existence;
- cause sufficiency;
- additional cause;
- cause-effect reversal;
- predicted effect existence;
- tautology.

La validacion no debe bloquear la captura inicial. Debe funcionar como una capa progresiva: primero capturar, despues endurecer la logica.

## 13. Gestion del conocimiento LTP

El usuario tiene mucha informacion propia sobre LTP. La aplicacion debe poder incorporar ese conocimiento de forma gradual.

Tipos de material:

- definiciones;
- reglas de construccion;
- criterios de validacion;
- ejemplos;
- plantillas;
- documentos de referencia;
- notas personales.

Ese conocimiento debe poder aparecer contextualizado segun el arbol o paso actual, sin interrumpir el trabajo.

## 14. Resultado esperado

Al final de una sesion o caso, la app debe poder producir:

- metadato del sistema;
- System Benchmark o Goal Tree;
- el arbol trabajado;
- frames y agrupaciones del arbol;
- mapa de perspectivas y forks;
- una version textual del razonamiento;
- lista de supuestos;
- lista de evidencias pendientes;
- lista de conexiones dudosas o pendientes de validacion;
- conclusiones;
- plan de accion si procede;
- exportacion legible para compartir o revisar.

## 15. MVP propuesto

El primer MVP deberia cubrir:

- seleccion de carpeta de trabajo;
- creacion/apertura de sistema;
- System Profile editable;
- System Benchmark inicial, preferiblemente Goal Tree basico;
- seleccion del tipo de arbol o perspectiva;
- creacion de forks simples;
- editor de nodos rapido con teclado;
- navegacion completa sin raton;
- keyboard hint mode para seleccionar entidades, frames y conexiones;
- frame principal por arbol;
- frames anidados basicos;
- creacion y navegacion de frames con teclado;
- auto-layout inicial para minimizar cruces de flechas;
- vista lista y vista visual simple;
- guardado local;
- biblioteca basica de conocimiento LTP;
- exportacion Markdown o PDF simple.

## 16. Modelo conceptual inicial

Entidades principales:

- Workspace: carpeta local donde vive uno o mas sistemas.
- System: objeto estable que describe el sistema estudiado.
- SystemProfile: descripcion editable del sistema, frontera, control, influencia y contexto.
- SystemBenchmark: definicion de exito del sistema; puede materializarse como Goal Tree.
- Perspective: punto de vista o linea de trabajo dentro del sistema.
- Tree: artefacto LTP concreto dentro de una perspectiva.
- Frame: contenedor visual/logico dentro de un Tree; puede contener otros frames y nodos.
- Node: afirmacion, condicion, efecto, causa, supuesto, obstaculo, inyeccion o accion.
- Link: relacion logica entre nodos.
- Assumption: statement que sostiene un Link, especialmente relevante en EC, CRT y FRT.
- LayoutState: posicion calculada o fijada de frames, nodos y rutas de conexion.
- Fork: rama alternativa de una perspectiva, arbol o solucion.
- Source: documento, nota o referencia usada como evidencia o conocimiento.
- Validation: estado de revision logica y evidencia asociado a nodos o conexiones.

Relaciones principales:

- un Workspace contiene Systems;
- un System contiene un SystemProfile, uno o mas SystemBenchmarks y Perspectives;
- una Perspective puede contener uno o mas Trees;
- un Tree contiene un Frame principal;
- un Frame contiene Nodes, Links visibles y Frames anidados;
- un Link puede conectar nodos dentro de un frame o atravesar fronteras de frames;
- un Link puede contener o referenciar Assumptions;
- un Assumption puede convertirse en Node si necesita analizarse como parte explicita del arbol;
- un Fork nace de una Perspective, Tree, Node, supuesto o solucion;
- varias Perspectives pueden reutilizar nodos, fuentes o conclusiones del mismo System.

## 17. Preguntas abiertas

- Cual es el metadato minimo obligatorio para crear un sistema?
- El Goal Tree debe ser obligatorio antes de un CRT, o la app debe permitir CRT provisional con benchmark incompleto?
- Debe un Workspace contener varios sistemas, o normalmente una carpeta equivale a un sistema?
- Que arbol debe ser el primero en implementarse despues del metadato del sistema?
- Cual es el formato mental preferido para capturar: lista indentada, canvas visual, tarjetas, o entrevista guiada?
- Debe la app validar logicamente las conexiones desde el principio, o primero permitir captura libre?
- Como debe representarse la frontera entre span of control, sphere of influence y external environment?
- Que nivel de libertad manual debe tener el usuario frente al auto-layout?
- Deben los frames representar solo agrupaciones visuales o tambien significado semantico obligatorio?
- Que atajos de teclado deben ser canonicos para crear nodo, conectar, crear frame y reordenar?
- Que formato de exportacion es mas importante: Markdown, PDF, Word, imagen o todos mas adelante?
- La carpeta de trabajo debe contener archivos legibles por humanos, como Markdown/JSON, o basta con una base de datos local?
