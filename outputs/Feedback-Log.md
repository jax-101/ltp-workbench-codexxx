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

Estado: implementado en la iteracion 1, con validacion inicial positiva el 2026-07-14. Los hints visibles ahora forman un conjunto sin prefijos ambiguos y las teclas del modo hint no llegan a otros comandos.

### F-011: La vista salta al origen al usar hints o seleccionar elementos

Feedback: si la vista se ha desplazado a otra zona del canvas, al pulsar `H` o seleccionar otro elemento la vista vuelve automaticamente al punto superior izquierdo.

Estado: implementado en la iteracion 1, con validacion inicial positiva el 2026-07-14. El viewport se captura antes de renderizar y se restaura despues de los cambios de seleccion o modo.

### F-012: Minimap para navegacion del canvas

Feedback: se echa de menos una vista de minimapa para orientarse y navegar diagramas grandes.

Estado: implementado en la iteracion 2; la validacion de uso ha identificado los ajustes F-031 y F-032 antes de considerarlo cerrado.

### F-013: Paneles laterales plegables

Feedback: los laterales izquierdo y derecho deberian poder ocultarse y desplegarse mediante boton o combinacion de teclado.

Estado: implementado en la iteracion 2, pendiente de validacion de uso. Ambos paneles disponen de control visible, atajos y estado persistente.

### F-014: Borrado de links y entidades

Feedback: no se pueden borrar links una vez creados ni entidades del diagrama.

Estado: implementado en la iteracion 2, pendiente de validacion de uso. El borrado exige confirmacion, protege el frame raiz y limpia en cascada relaciones, assumptions, jerarquias y layout.

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

Estado: implementado en la iteracion 1, con validacion inicial positiva el 2026-07-14. Los links terminan en el borde del nodo y usan marcadores SVG de mayor contraste.

### F-019: Configuracion editable de atajos de teclado

Feedback: en vez de hardcodear combinaciones de teclas, conviene plantear un archivo de configuracion donde modificarlas.

Estado: base implementada en la iteracion 1, pendiente de evolucion. Los comandos leen sus atajos desde `src/renderer/command-config.js`; la personalizacion desde la interfaz queda para una iteracion posterior.

### F-020: Zoom y desplazamiento solo con teclado

Feedback: se echa de menos zoom y la posibilidad de desplazar la ventana/canvas usando solo el teclado.

Estado: implementado en la iteracion 2; la validacion de uso ha identificado las regresiones F-029, F-031 y F-032 antes de considerarlo cerrado.

### F-021: Animacion del auto-layout

Feedback: seria valioso ver como los elementos se mueven a su nueva posicion cuando se ejecuta Layout, en vez de saltar instantaneamente.

Estado: implementado en la iteracion 2.2, pendiente de validacion de uso. El resultado de ELK se interpola durante una transicion breve; nodos, frames, flechas y puntos de interaccion se actualizan durante el movimiento.

### F-022: Direccion preferente por tipo de diagrama

Feedback: cada diagrama tiene una direccion preferente de flechas. Por ejemplo, el Goal Tree es de arriba a abajo.

Estado: implementado en la iteracion 2.2, pendiente de validacion de uso. Goal Tree usa `TB` por defecto y cada arbol puede elegir `TB`, `BT`, `LR` o `RL` antes de ejecutar Layout.

### F-023: Infraestructura extensible para tipos de diagrama

Feedback: cada diagrama tiene una lista de elementos con atributos propios, por ejemplo CSF y NC para Goal Tree. Seria interesante disponer de una infraestructura para definir nuevos diagramas y configurar Goal Tree, CRT, EC, etc. Esto haria la herramienta mas extensible y util.

Estado: pendiente. Definir un registro/schema de diagramas con tipos de entidades, atributos, reglas de link, direccion de layout, validaciones y acciones disponibles.

### F-024: Texto cortado en entidades

Feedback: en algunos elementos el texto se corta. Idealmente el tamano de la entidad deberia poder controlarse, o al menos deberia abrirse un pop-up o vista ampliada para ver el texto completo.

Estado: solucion minima implementada en la iteracion 1, con validacion inicial positiva el 2026-07-14. El texto completo puede abrirse desde el inspector, con doble click o con la barra espaciadora. El refinamiento del flujo queda recogido en F-026.

### F-025: Enter confirma la edicion y Shift+Enter crea una linea

Feedback: al seleccionar una entidad, el primer `Enter` debe comenzar la edicion. Un segundo `Enter` debe aceptar los cambios y volver al modo de navegacion. `Shift+Enter` debe insertar un salto de linea sin cerrar la edicion.

Estado: implementado en la iteracion 1.1 y validado por el usuario el 2026-07-15. El inspector distingue entre confirmar con `Enter` y mantener la edicion con `Shift+Enter`.

Criterios de aceptacion:

- `Enter` sobre una entidad seleccionada enfoca su statement.
- `Enter` dentro del statement guarda el valor y devuelve el foco al canvas.
- `Shift+Enter` inserta un salto de linea y mantiene la edicion activa.

### F-026: Flujo de teclado del pop-up de texto completo

Feedback: la barra espaciadora debe alternar entre abrir y cerrar el pop-up. Al pulsar `Enter` dentro del pop-up, este debe cerrarse y la entidad debe quedar enfocada en el inspector, lista para continuar editandola.

Estado: implementado en la iteracion 1.1 y validado por el usuario el 2026-07-15. `Espacio` alterna la vista ampliada y `Enter` transfiere el foco al statement del inspector.

Criterios de aceptacion:

- `Espacio` abre el pop-up de la entidad seleccionada.
- Un segundo `Espacio` lo cierra sin cambiar la seleccion.
- `Enter` cierra el pop-up y enfoca el campo statement del inspector.
- `Esc` sigue disponible como alternativa para cerrar.

### F-027: Crear nodos dentro del viewport actual

Feedback: al pulsar `N`, el nuevo nodo debe aparecer cerca de la esquina superior izquierda de la zona del canvas que el usuario esta viendo, no en la posicion por defecto del frame si esta fuera de pantalla.

Estado: implementado en la iteracion 1.1 y validado por el usuario el 2026-07-15. La posicion inicial se calcula desde el viewport y se mantiene dentro del frame activo cuando hay espacio visible suficiente.

Criterios de aceptacion:

- El nodo nuevo aparece visible sin mover automaticamente el viewport.
- Varios nodos consecutivos se desplazan ligeramente para no solaparse por completo.
- La posicion se mantiene dentro del frame activo cuando sea posible.

### F-028: Ctrl+G como cancelacion comoda

Feedback: se propone `Ctrl+G` como comando para cancelar la seleccion o el modo activo. El usuario valora esta combinacion como alternativa mas comoda que `Esc`.

Estado: implementado en la iteracion 1.1 y validado por el usuario el 2026-07-15. `Ctrl+G` se ha anadido al mapa de comandos como cancelacion contextual y `Esc` se conserva.

Criterios de aceptacion:

- `Ctrl+G` cierra hints, conexion, seleccion multiple o pop-up segun el contexto.
- En navegacion normal limpia la seleccion actual.
- No modifica ni elimina datos.
- `Esc` conserva el comportamiento existente.

### F-029: Keyboard hints incompletos despues de usar zoom

Feedback: despues de jugar con el zoom, al pulsar `H` solo aparece el hint `A`. Al intentar escribir otra secuencia, la barra superior muestra `No hint matches that sequence`.

Estado: implementado en la iteracion 2.1, pendiente de validacion de uso. Los hints se limitan al viewport logico, se regeneran al cambiar zoom y se dibujan en una capa de pantalla de tamano constante.

Criterios de aceptacion:

- El numero y las etiquetas de hints no cambian al variar el zoom si el conjunto de elementos no ha cambiado.
- Todos los elementos seleccionables del alcance actual reciben un hint.
- Las secuencias siguen seleccionando su elemento entre 35% y 250% de zoom.
- Cambiar zoom no deja un buffer o mensaje de error anterior activo.

### F-030: Ocultar los controles L de los links fuera del modo hint

Feedback: los circulos `L` visibles sobre cada link generan ruido visual. Deberian permanecer ocultos por defecto y aparecer al activar `H`.

Estado: implementado en la iteracion 2.1, pendiente de validacion de uso. El area interactiva permanece disponible, pero el circulo solo aparece durante hint mode, hover o foco.

Criterios de aceptacion:

- En navegacion normal no se muestran circulos `L`.
- Al pulsar `H`, cada link seleccionable muestra su indicador y su hint.
- La flecha y su estado seleccionado siguen siendo visibles sin el circulo.
- El link se puede seguir seleccionando con raton mediante un area de interaccion discreta.

### F-031: El minimapa se desplaza al cambiar zoom

Feedback: al cambiar el zoom del canvas, la ventana de navegacion o minimapa cambia de posicion en la interfaz.

Estado: implementado en la iteracion 2.1, pendiente de validacion de uso. El editor ocupa una altura estable y el minimapa queda anclado al viewport, no al canvas escalado.

Criterios de aceptacion:

- El minimapa permanece fijo en la misma esquina al acercar o alejar.
- Su posicion no depende del tamano escalado del canvas.
- Abrir o cerrar paneles lo recoloca una sola vez respecto al nuevo viewport, sin saltos durante el zoom.

### F-032: El viewport del minimapa no cambia de tamano con el zoom

Feedback: el rectangulo que representa la pantalla visible mantiene el mismo tamano en el minimapa al cambiar el zoom.

Estado: reabierto tras la validacion visual del usuario y corregido de nuevo en la iteracion 2.2. La primera formula cambiaba numericamente pero no producia una diferencia visual suficiente. La nueva version calcula el rectangulo desde la proporcion real entre area visible y area desplazable, y exige un cambio visible en la prueba automatizada. Pendiente de nueva validacion manual.

Criterios de aceptacion:

- Al acercar, el rectangulo del viewport se hace mas pequeno.
- Al alejar, el rectangulo se hace mas grande.
- El rectangulo mantiene una posicion coherente con la zona visible.
- Click, arrastre, zoom y pan mantienen minimapa y canvas sincronizados.

### F-033: Desplazamiento con flechas y atajos Ctrl

Feedback: el canvas debe poder desplazarse con las flechas o con `Ctrl+P` arriba, `Ctrl+N` abajo, `Ctrl+F` derecha y `Ctrl+B` izquierda.

Estado: implementado en la iteracion 2.2, pendiente de validacion de uso. Ambos juegos de teclas usan los mismos comandos de pan y no se ejecutan mientras el foco esta en un campo de texto.

Criterios de aceptacion:

- Las cuatro flechas desplazan el viewport en su direccion.
- Los cuatro atajos `Ctrl` producen el mismo resultado.
- Los atajos no modifican el texto durante la edicion.
- Los hints no capturan las letras cuando se mantiene pulsado `Ctrl`.

### F-034: Apertura temporal del inspector al editar

Feedback: al editar una entidad, el panel derecho debe abrirse automaticamente. Al confirmar con `Enter`, debe recuperar su estado anterior.

Estado: implementado en la iteracion 2.2, pendiente de validacion de uso. El editor recuerda si el inspector estaba abierto antes de comenzar y restaura ese estado al aceptar o cancelar.

Criterios de aceptacion:

- `Enter` abre el inspector si estaba cerrado y enfoca el campo principal.
- Confirmar con `Enter` vuelve a cerrarlo si inicialmente estaba cerrado.
- Si ya estaba abierto, permanece abierto al terminar.
- Cancelar la edicion tambien restaura el estado anterior.

### F-035: Mover entidades entre frames

Feedback: debe ser posible introducir entidades en un frame y extraerlas posteriormente.

Estado: implementado parcialmente en la iteracion 2.2, pendiente de validacion de uso. Los nodos se pueden arrastrar entre frames o reasignar con el selector `Frame` del inspector. Las garantias geometricas adicionales quedan recogidas en F-036.

Criterios de aceptacion:

- Al soltar un nodo, el frame de destino se resalta y pasa a contenerlo.
- Soltarlo fuera de un frame hijo permite devolverlo al frame raiz o padre visible.
- El selector del inspector ofrece una alternativa precisa al arrastre.
- Cambiar la pertenencia conserva links, assumptions y el resto de datos de la entidad.

### F-036: Contencion geometrica estricta de frames

Feedback: un frame debe contener completamente todas las entidades que le pertenecen. Una entidad que no pertenece al frame ni a uno de sus descendientes no puede quedar visualmente dentro de sus limites.

Estado: pendiente. La pertenencia logica ya puede modificarse, pero la geometria actual no impone contencion ni exclusion.

Criterios de aceptacion:

- Cada entidad queda completamente dentro del frame al que pertenece directamente.
- Las entidades de frames descendientes pueden estar dentro de sus frames ancestro.
- Ninguna entidad ajena o de una rama distinta invade el interior de un frame.
- Arrastrar, pegar, crear y ejecutar Layout mantienen estas invariantes.
- Los frames anidados quedan completamente contenidos por su frame padre.

### F-037: Frame raiz ilimitado y contexto activo

Feedback: siempre debe existir un frame base infinito. Crear una entidad con `N` requiere un frame de contexto seleccionado.

Estado: pendiente. Actualmente existe un frame raiz finito y `N` usa `activeFrameId`, pero ambos conceptos deben unificarse como contexto activo permanente.

Criterios de aceptacion:

- Todo diagrama tiene un frame raiz conceptual sin borde ni tamano finito.
- Siempre existe exactamente un frame activo para crear y pegar.
- Seleccionar un nodo o link no elimina el frame activo.
- Si no se ha entrado en otro frame, `N` usa el frame raiz.
- El minimapa y el canvas crecen segun el contenido, no segun un rectangulo raiz artificial.

### F-038: Insercion direccional sin alterar la forma existente

Feedback: las entidades creadas con `N` deben aparecer en el lado opuesto a la direccion preferente del diagrama, separadas de las anteriores. Si falta espacio, el frame se amplia y otras partes del diagrama se desplazan sin cambiar su forma relativa.

Estado: pendiente. La creacion actual prioriza la esquina visible del viewport y no aplica direccion, expansion ni propagacion de espacio.

Criterios de aceptacion:

- `TB` inserta por el lado superior, `BT` por el inferior, `LR` por el izquierdo y `RL` por el derecho.
- Cada insercion respeta una separacion minima y nunca solapa entidades.
- Un frame finito se amplia cuando su contenido necesita espacio.
- Los grupos afectados pueden trasladarse rigidamente, conservando distancias y forma interna.
- Crear con `N` no ejecuta un auto-layout global.
- La nueva entidad queda visible o se ofrece una transicion comprensible hacia ella.

### F-039: Borrado de la seleccion con Ctrl+D

Feedback: `Ctrl+D` debe borrar la entidad o conjunto de elementos seleccionados.

Estado: pendiente. El borrado individual y en cascada existe, pero falta una seleccion general y el borrado atomico de conjuntos.

Criterios de aceptacion:

- `Ctrl+D` abre una unica confirmacion con el impacto total.
- Confirmar elimina la seleccion y sus dependencias sin duplicar recuentos.
- El frame raiz permanece protegido.
- Dentro de campos de texto, `Ctrl+D` no borra elementos del diagrama.
- Cancelar no modifica ningun dato.

### F-040: Copiar y pegar subgrafos

Feedback: `Ctrl+C` debe copiar los elementos seleccionados y `Ctrl+V` debe pegar una copia.

Estado: pendiente. Requiere seleccion general, remapeo de identificadores y colocacion sin solapamientos.

Criterios de aceptacion:

- Copiar incluye nodos, frames descendientes y links completamente internos.
- Los links hacia elementos externos no se duplican.
- Pegar crea identificadores nuevos y conserva jerarquia, atributos y assumptions internos.
- La copia se inserta en el frame activo cerca del viewport.
- Pegados sucesivos aplican un desplazamiento visible y no se superponen.
- El original nunca se modifica.

### F-041: Seleccion transitiva del contenido de un frame

Feedback: al seleccionar un frame deben quedar seleccionados tambien todos sus elementos y links internos.

Estado: pendiente. La seleccion multiple actual solo representa nodos origen para crear links y no sirve como seleccion general.

Criterios de aceptacion:

- Seleccionar un frame incluye sus frames descendientes y todas sus entidades.
- Se incluyen los links cuyos dos extremos estan dentro del conjunto.
- Los links con un extremo externo quedan fuera de la seleccion interna.
- La interfaz distingue el frame principal de los elementos incluidos automaticamente.
- Copiar, borrar y otras operaciones usan exactamente el mismo cierre de seleccion.

### F-042: Ciclar el tipo con Shift+Tab

Feedback: con una o varias entidades seleccionadas, `Shift+Tab` debe recorrer ciclicamente su tipo.

Estado: pendiente. Los tipos permitidos siguen hardcodeados y la seleccion multiple no es todavia general.

Criterios de aceptacion:

- Solo se aplica a entidades y nunca a frames o links.
- Cada entidad avanza al siguiente tipo permitido por el diagrama.
- El ciclo y su orden proceden de la definicion del tipo de diagrama.
- La operacion funciona sobre una seleccion individual o multiple.
- Dentro de un campo de edicion, `Shift+Tab` conserva la navegacion normal de foco.
- Se respetan restricciones estructurales, como tipos unicos o cardinalidades.
