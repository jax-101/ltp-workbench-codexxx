# Feedback Log

Registro de feedback, ideas y ajustes propuestos antes de incorporarlos definitivamente al PRD.

## 2026-07-13

### F-001: Trabajar primero el metadato del sistema

Feedback: antes de elegir un arbol, la app debe permitir definir el sistema. Se pueden trabajar varias perspectivas del mismo sistema con distintos arboles.

Estado: incorporado al PRD como System Profile, System Benchmark, Perspectives y Forks.

### F-002: Rutas LTP no lineales

Feedback: se puede empezar por Goal Tree y derivar CRT usando CSF/NC; o empezar por EC y encontrar el CRT despues.

Estado: incorporado al PRD como derivacion entre artefactos LTP.

### F-003: Crear arboles sin raton

Feedback: el usuario debe poder crear arboles completos sin echar mano del raton.

Estado: incorporado al PRD y marcado como criterio central de fase 1.

### F-004: Frames dentro de frames

Feedback: cada arbol debe tener su frame principal, y el usuario debe poder crear frames dentro de otros frames.

Estado: incorporado al PRD y al modelo conceptual.

### F-005: Auto-layout con minimizacion de cruces

Feedback: a medida que se relacionan entidades, el programa debe optimizar posicionamiento y minimizar cruces de flechas.

Estado: incorporado al PRD. Pendiente decidir libreria/algoritmo.

### F-006: Keyboard hints para seleccion visual

Feedback: con una combinacion basica, la app debe mostrar letras sobre entidades para seleccionarlas y editarlas.

Estado: incorporado al PRD como Keyboard hint mode.

### F-007: Flechas con significado explicito

Feedback: cada flecha puede tener significado explicito y assumptions detras.

Estado: incorporado al PRD. Links pasan a ser objetos de primer nivel.

### F-008: Documentar feedback continuamente

Feedback: todo feedback debe quedar documentado para no perder ideas.

Estado: incorporado mediante este Feedback Log, Decision Log y Open Questions.

### F-009: Varios origenes hacia un mismo destino

Feedback: el usuario debe poder seleccionar varios nodos y hacer que todos apunten a un mismo nodo destino.

Estado: incorporado al PRD y al prototipo como seleccion multiple de nodos origen.

## 2026-07-14

### F-010: Keyboard hints de dos letras no funcionan correctamente

Feedback: cuando un elemento requiere una seleccion con dos letras, por ejemplo `AA`, la segunda letra no se interpreta como parte del hint y puede disparar otra accion, como crear un nuevo elemento.

Estado: pendiente. Revisar el manejo de buffer de hints y evitar que teclas consumidas por hint mode lleguen a los atajos globales.

### F-011: La vista salta al origen al usar hints o seleccionar elementos

Feedback: si la vista se ha desplazado a otra zona del canvas, al pulsar `H` o seleccionar otro elemento la vista vuelve automaticamente al punto superior izquierdo.

Estado: pendiente. La posicion de scroll/pan debe preservarse entre renders y cambios de seleccion.

### F-012: Minimap para navegacion del canvas

Feedback: se echa de menos una vista de minimapa para orientarse y navegar diagramas grandes.

Estado: pendiente. Considerar minimap fijo en una esquina con viewport visible y navegacion por click/drag.

### F-013: Paneles laterales plegables

Feedback: los laterales izquierdo y derecho deberian poder ocultarse y desplegarse mediante boton o combinacion de teclado.

Estado: pendiente. Definir estados de panel, atajos y persistencia de preferencia.

### F-014: Borrado de links y entidades

Feedback: no se pueden borrar links una vez creados ni entidades del diagrama.

Estado: pendiente. Implementar borrado seguro con confirmacion o undo, incluyendo limpieza de relaciones, assumptions y layouts.

### F-015: Frames colapsables con preservacion de conexiones

Feedback: los frames deberian poder minimizarse a un cuadrado mas pequeno. Al colapsar un frame, desaparecen de la vista los elementos internos, pero se mantienen las flechas que entran y salen del frame.

Estado: pendiente. Definir representacion visual de frame colapsado y reglas de redireccion de links hacia el frame.

### F-016: Vista enfocada de un frame

Feedback: se deberia poder seleccionar un frame y cambiar a una vista unicamente de ese frame.

Estado: pendiente. Aprovechar `activeFrameId` y definir navegacion de entrada/salida, breadcrumbs y alcance visible.

### F-017: Jerarquia visible de frames

Feedback: los frames deberian tener una jerarquia clara y navegable.

Estado: pendiente. Mostrar arbol de frames, breadcrumbs o ambos.

### F-018: Links como flechas visibles

Feedback: los links entre entidades deberian verse como flechas, no solo lineas. Actualmente no se aprecia la punta de flecha.

Estado: pendiente. Mejorar marcadores SVG y contraste/direccion visual de links.

### F-019: Configuracion editable de atajos de teclado

Feedback: en vez de hardcodear combinaciones de teclas, conviene plantear un archivo de configuracion donde modificarlas.

Estado: pendiente. Definir mapa de comandos y atajos configurable, con defaults por tipo de diagrama o workspace.

### F-020: Zoom y desplazamiento solo con teclado

Feedback: se echa de menos zoom y la posibilidad de desplazar la ventana/canvas usando solo el teclado.

Estado: pendiente. Definir comandos de zoom, pan incremental, centrar seleccion y reset de vista.

### F-021: Animacion del auto-layout

Feedback: seria valioso ver como los elementos se mueven a su nueva posicion cuando se ejecuta Layout, en vez de saltar instantaneamente.

Estado: pendiente. Animar transiciones de nodos, frames y links despues de recibir posiciones de ELK.

### F-022: Direccion preferente por tipo de diagrama

Feedback: cada diagrama tiene una direccion preferente de flechas. Por ejemplo, el Goal Tree es de arriba a abajo.

Estado: pendiente. Mover direccion de layout desde una regla global a configuracion del tipo de diagrama.

### F-023: Infraestructura extensible para tipos de diagrama

Feedback: cada diagrama tiene una lista de elementos con atributos propios, por ejemplo CSF y NC para Goal Tree. Seria interesante disponer de una infraestructura para definir nuevos diagramas y configurar Goal Tree, CRT, EC, etc. Esto haria la herramienta mas extensible y util.

Estado: pendiente. Definir un registro/schema de diagramas con tipos de entidades, atributos, reglas de link, direccion de layout, validaciones y acciones disponibles.

### F-024: Texto cortado en entidades

Feedback: en algunos elementos el texto se corta. Idealmente el tamano de la entidad deberia poder controlarse, o al menos deberia abrirse un pop-up o vista ampliada para ver el texto completo.

Estado: pendiente. Considerar resize manual de entidades, auto-height, tooltip/preview y editor ampliado.
