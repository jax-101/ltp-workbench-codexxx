# Revision 5-hats del PRD

Documento revisado:

`outputs/PRD-LTP-Workbench.md`

Asuncion usada: "5-hats" se interpreta como cinco lentes de revision: Producto, Metodo LTP, UX/teclado, Arquitectura tecnica y MVP/riesgo.

## Resumen ejecutivo

La direccion del producto es fuerte: el PRD ya ha encontrado una idea diferencial clara. No es una app para dibujar arboles; es una herramienta de pensamiento sistemico donde el sistema es estable, los arboles son perspectivas y el usuario puede razonar sin depender del raton.

Los dos aciertos principales son:

- separar System Profile de System Benchmark;
- convertir el uso 100% por teclado, frames y auto-layout en capacidades centrales.

El riesgo principal es que el MVP actual sigue siendo demasiado amplio. Incluye sistema, benchmark, forks, frames, keyboard hints, auto-layout, biblioteca, exportacion y validacion logica. Todo es coherente, pero no todo debe entrar con el mismo peso en la primera version.

La recomendacion general es definir un MVP mas estrecho:

- Workspace + System Profile;
- Goal Tree como primer System Benchmark;
- editor de arbol con teclado;
- frame principal y frames anidados basicos;
- keyboard hints;
- auto-layout inicial;
- persistencia local legible.

CRT, EC, forks avanzados, validacion CLR completa, biblioteca contextual y exportaciones ricas deberian quedar como siguiente capa.

## Hat 1: Producto

### Veredicto

El producto tiene una promesa clara: ayudar a pensar sistemas complejos usando LTP, no solo documentar resultados.

### Lo que funciona

- El sistema como entidad estable es una gran decision de producto.
- La idea de perspectivas permite trabajar rutas no lineales reales.
- El foco en no usar raton diferencia la app de herramientas de diagramacion generalistas.
- La app evita convertirse en un wizard rigido, que seria una mala forma de representar LTP en trabajo real.

### Riesgos

- El PRD todavia no define una "primera experiencia" concreta de 5 minutos.
- "Sistema" puede ser demasiado abstracto si la interfaz no ayuda a aterrizarlo.
- El usuario podria quedarse bloqueado entre completar metadatos, elegir arbol o crear benchmark.
- La palabra "fork" puede llegar demasiado pronto para el usuario si todavia no ha creado su primer arbol.

### Recomendaciones

- Definir el primer recorrido de usuario:
  1. elegir carpeta;
  2. crear sistema;
  3. escribir nombre, frontera y owner;
  4. crear Goal Tree;
  5. capturar goal, CSF y NC con teclado;
  6. guardar.
- Formular un principio: "empezar incompleto es correcto".
- Separar "crear sistema" de "madurar sistema".
- Dejar forks visibles en el modelo, pero no protagonistas en el primer flujo.

## Hat 2: Metodo LTP

### Veredicto

El PRD respeta bien la logica de LTP: Goal Tree como benchmark, CRT como desviacion contra benchmark, EC como conflicto, FRT como validacion de injection.

### Lo que funciona

- La distincion Profile/Benchmark evita confundir contexto con criterio de exito.
- Los UDE quedan ligados a goal/CSF, que es metodologicamente correcto.
- Se permite empezar por EC o CRT, pero sin perder trazabilidad hacia el sistema.
- La validacion logica se plantea como capa progresiva, no como freno de captura.

### Riesgos

- Goal Tree deberia tener mas peso en el MVP si el sistema y benchmark son el centro.
- Falta definir si un System Benchmark puede tener varias versiones.
- Falta explicitar como se manejan Goal Trees anidados entre sistemas superiores e inferiores.
- Las Categories of Legitimate Reservation estan listadas, pero aun no traducidas a interacciones concretas.

### Recomendaciones

- Tratar Goal Tree como el primer arbol nativo del producto.
- Permitir "benchmark provisional" cuando el usuario no tenga Goal Tree completo.
- En cada UDE, exigir o sugerir enlace a goal/CSF afectado.
- Convertir CLR en checks accionables:
  - "esta entidad tiene una sola idea?";
  - "hay evidencia?";
  - "falta una causa contribuyente?";
  - "esta flecha es demasiado larga?";
  - "la causa y el efecto estan invertidos?".

## Hat 3: UX, teclado y canvas

### Veredicto

Este es probablemente el nucleo de la experiencia. Si el teclado y el canvas funcionan, la app puede sentirse como una extension del pensamiento. Si no, se convertira en otra herramienta lenta de diagramas.

### Lo que funciona

- Keyboard hint mode es una idea excelente.
- Los modos de teclado estan bien identificados: navegacion, edicion, conexion, frame y comandos.
- Frames anidados resuelven una necesidad real para arboles grandes.
- Auto-layout con respeto a posiciones fijadas es la tension correcta.

### Riesgos

- Demasiados modos pueden confundir si no hay una indicacion visual muy clara.
- Los hints pueden tapar contenido en arboles densos.
- Seleccionar conexiones con hints puede ser dificil si hay muchas flechas.
- Auto-layout automatico puede frustrar si mueve demasiado el trabajo del usuario.
- Crear frames anidados puede complicar la navegacion si no hay breadcrumbs o ruta visible.

### Recomendaciones

- Definir una gramatica de teclado pequena para el MVP:
  - crear nodo;
  - editar nodo;
  - crear hijo/consecuencia;
  - crear causa/predecesor;
  - conectar;
  - crear frame;
  - entrar/salir de frame;
  - hints;
  - command palette.
- Mostrar siempre:
  - modo activo;
  - frame activo;
  - seleccion actual;
  - ruta de frame, como `Goal Tree / CSF Revenue / Demand`.
- Empezar con auto-layout manual por comando, no automatico agresivo.
- Incluir "pin position" desde el inicio.
- Ofrecer vista lista/outline como red de seguridad para arboles visualmente densos.

## Hat 4: Arquitectura tecnica

### Veredicto

El PRD ya implica una arquitectura mas parecida a un editor estructurado que a una app de formularios. El modelo de datos debe quedar muy bien pensado antes de implementar mas UI.

### Lo que funciona

- Entidades conceptuales claras: Workspace, System, Profile, Benchmark, Perspective, Tree, Frame, Node, Link, LayoutState.
- Separar logica del arbol y layout visual es imprescindible.
- La trazabilidad entre artefactos esta bien planteada.

### Riesgos

- Si Node y Link se disenan demasiado simples, luego sera dificil soportar CLR, forks, reuse y derivaciones.
- Las flechas no pueden ser solo lineas visuales: cada Link debe guardar significado explicito, assumptions, evidencia y estado de validacion.
- Frames pueden ser visuales, semanticos o ambos; el PRD aun deja eso abierto.
- Auto-layout necesita motor especializado o algoritmo probado; hacerlo a mano puede consumir demasiado.
- Electron sirve, pero el canvas y layout pueden volverse complejos rapido.
- Persistencia local debe decidirse pronto: archivos legibles, SQLite, o mezcla.

### Recomendaciones

- Definir pronto un schema de datos versionado.
- Separar:
  - `logicalGraph`: nodos, links, tipos, derivaciones;
  - `visualGraph`: frames, posiciones, rutas, zoom, pinning;
  - `methodMetadata`: LTP type, link meaning, assumptions, validation, evidence, source;
  - `workspaceMetadata`: carpetas, sistemas, perspectivas.
- Evaluar librerias de layout antes de construir:
  - ELK.js;
  - Dagre;
  - React Flow con layout externo;
  - Cytoscape.js si prima grafos complejos.
- Guardar en formato local legible al menos para export/debug: JSON o YAML por sistema/arbol.
- No implementar auto-layout propio desde cero en el MVP.

## Hat 5: MVP, riesgos y secuencia

### Veredicto

El PRD describe una vision potente, pero el MVP debe adelgazar. El primer hito debe demostrar que se puede crear un arbol real, con teclado, dentro de un sistema, y que el layout ayuda mas de lo que estorba.

### Riesgos principales

- Alcance excesivo del MVP.
- Auto-layout dificil y costoso.
- Sobrecarga cognitiva por modelo System/Profile/Benchmark/Perspective/Fork.
- Validacion CLR demasiado ambiciosa para primera version.
- Mucha funcionalidad antes de probar el flujo de captura.

### MVP recomendado

Version 0.1:

- elegir carpeta de trabajo;
- crear sistema;
- editar System Profile minimo;
- crear Goal Tree;
- crear nodos Goal, CSF y NC;
- crear frame principal;
- crear frames anidados simples;
- usar teclado para crear, seleccionar, editar y conectar;
- keyboard hints basicos para nodos y frames;
- auto-layout inicial por comando;
- guardar/cargar en archivo local.

Version 0.2:

- derivar UDE desde Goal/CSF;
- crear CRT basico;
- links de trazabilidad Goal Tree -> CRT;
- validacion simple de entidad: frase completa, una idea, evidencia.

Version 0.3:

- Evaporating Cloud;
- assumptions por flecha como objetos editables;
- injections;
- derivacion EC -> FRT.

Version 0.4:

- forks de soluciones;
- validacion CLR mas completa;
- biblioteca LTP contextual;
- exportaciones avanzadas.

## Cambios recomendados al PRD

1. Anadir una seccion "North Star Experience" con el recorrido de 5 minutos.
2. Reducir explicitamente el MVP a Goal Tree + teclado + frames + persistencia.
3. Mover forks avanzados, EC/FRT y CLR completa a fases posteriores.
4. Definir el modelo de datos logico/visual antes de seguir implementando.
5. Convertir "uso sin raton" en criterio de aceptacion medible.
6. Definir atajos canonicos iniciales.
7. Decidir si frames son solo agrupacion visual o tambien unidad semantica.

## Criterios de aceptacion sugeridos

- El usuario puede crear un sistema nuevo sin tocar el raton.
- El usuario puede crear un Goal Tree con goal, tres CSF y varias NC sin tocar el raton.
- El usuario puede seleccionar cualquier entidad visible usando keyboard hints.
- El usuario puede editar una entidad seleccionada sin raton.
- El usuario puede conectar dos entidades sin raton.
- El usuario puede crear un frame dentro de otro frame sin raton.
- El usuario puede ejecutar auto-layout y reducir cruces respecto a una colocacion inicial desordenada.
- El usuario puede guardar, cerrar, abrir y recuperar el arbol con posiciones y frames.
- El usuario puede exportar una version textual simple del Goal Tree.
