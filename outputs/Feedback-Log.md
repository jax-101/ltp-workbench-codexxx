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

Estado: incorporado al PRD y refinado en el build 3A.2. `M` mantiene el modo explicito de origenes y `L` tambien puede tomar los nodos de la seleccion general como origenes para elegir un destino.

## 2026-07-14

### F-010: Keyboard hints de dos letras no funcionan correctamente

Feedback: cuando un elemento requiere una seleccion con dos letras, por ejemplo `AA`, la segunda letra no se interpreta como parte del hint y puede disparar otra accion, como crear un nuevo elemento.

Estado: implementado en la iteracion 1, con validacion inicial positiva el 2026-07-14. Los hints visibles ahora forman un conjunto sin prefijos ambiguos y las teclas del modo hint no llegan a otros comandos.

### F-011: La vista salta al origen al usar hints o seleccionar elementos

Feedback: si la vista se ha desplazado a otra zona del canvas, al pulsar `H` o seleccionar otro elemento la vista vuelve automaticamente al punto superior izquierdo.

Estado: implementado en la iteracion 1, con validacion inicial positiva el 2026-07-14. El viewport se captura antes de renderizar y se restaura despues de los cambios de seleccion o modo.

### F-012: Minimap para navegacion del canvas

Feedback: se echa de menos una vista de minimapa para orientarse y navegar diagramas grandes.

Estado: implementado en la iteracion 2 y validado por el usuario como parte de la version 2.2 el 2026-07-15.

### F-013: Paneles laterales plegables

Feedback: los laterales izquierdo y derecho deberian poder ocultarse y desplegarse mediante boton o combinacion de teclado.

Estado: implementado en la iteracion 2 y validado por el usuario como parte de la version 2.2 el 2026-07-15. Ambos paneles disponen de control visible, atajos y estado persistente.

### F-014: Borrado de links y entidades

Feedback: no se pueden borrar links una vez creados ni entidades del diagrama.

Estado: implementado en la iteracion 2 y validado por el usuario como parte de la version 2.2 el 2026-07-15. El borrado exige confirmacion, protege el frame raiz y limpia en cascada relaciones, assumptions, jerarquias y layout.

### F-015: Frames colapsables con preservacion de conexiones

Feedback: los frames deberian poder minimizarse a un cuadrado mas pequeno. Al colapsar un frame, desaparecen de la vista los elementos internos, pero se mantienen las flechas que entran y salen del frame.

Estado: pendiente para la iteracion 3D. El frame minimizado se tratara como una representacion resumen persistente de todo su contenido.

Criterios de aceptacion:

- Minimizar oculta nodos, frames descendientes y links completamente internos.
- Los links externos terminan en el borde del frame minimizado.
- El resumen muestra nombre, cantidad de elementos y conexiones externas.
- Las conexiones agrupadas indican su multiplicidad y pueden inspeccionarse.
- Expandir restaura exactamente las posiciones y rutas anteriores.
- Un frame minimizado puede abrirse directamente en vista de foco.

### F-016: Vista enfocada de un frame

Feedback: se deberia poder seleccionar un frame y cambiar a una vista unicamente de ese frame.

Estado: pendiente para la iteracion 3D. La vista de foco sera un estado temporal de navegacion que dedica el canvas al frame sin modificar el diagrama.

Criterios de aceptacion:

- El contenido del frame ocupa el area central disponible sin elementos externos que distraigan.
- Breadcrumbs visibles permiten subir al padre o salir del foco.
- Inspector, hints, minimapa y comandos siguen disponibles dentro del alcance enfocado.
- Los links externos terminan en portales etiquetados en el borde.
- Consultar un portal no saca automaticamente al usuario de la vista.
- Cerrar el foco restaura zoom, pan y contexto exterior de forma predecible.

### F-017: Jerarquia visible de frames

Feedback: los frames deberian tener una jerarquia clara y navegable.

Estado: pendiente para la iteracion 3D. La jerarquia se mostrara mediante breadcrumbs y un navegador de frames que soporte niveles anidados.

Criterios de aceptacion:

- Siempre se distingue el frame activo, sus ancestros y sus descendientes directos.
- Se puede entrar, subir o volver a la vista general sin perder seleccion accidentalmente.
- Frames minimizados y enfocados conservan su posicion dentro de la jerarquia.
- La navegacion funciona con raton, teclado y hints.

### F-018: Links como flechas visibles

Feedback: los links entre entidades deberian verse como flechas, no solo lineas. Actualmente no se aprecia la punta de flecha.

Estado: implementado en la iteracion 1, con validacion inicial positiva el 2026-07-14. Los links terminan en el borde del nodo y usan marcadores SVG de mayor contraste.

### F-019: Configuracion editable de atajos de teclado

Feedback: en vez de hardcodear combinaciones de teclas, conviene plantear un archivo de configuracion donde modificarlas.

Estado: base implementada en la iteracion 1, pendiente de evolucion. Los comandos y etiquetas leen sus atajos desde `src/renderer/command-config.js`, y el panel Keyboard se genera desde esa misma fuente. Falta un archivo de usuario, normalizacion por plataforma, ambitos de comando, deteccion de colisiones y recuperacion ante configuracion invalida. Se completara al inicio de 3C antes de anadir mas operaciones colectivas.

### F-020: Zoom y desplazamiento solo con teclado

Feedback: se echa de menos zoom y la posibilidad de desplazar la ventana/canvas usando solo el teclado.

Estado: implementado en la iteracion 2 y validado por el usuario como parte de la version 2.2 el 2026-07-15.

### F-021: Animacion del auto-layout

Feedback: seria valioso ver como los elementos se mueven a su nueva posicion cuando se ejecuta Layout, en vez de saltar instantaneamente.

Estado: implementado en la iteracion 2.2 y validado por el usuario el 2026-07-15. El resultado de ELK se interpola durante una transicion breve; nodos, frames, flechas y puntos de interaccion se actualizan durante el movimiento.

### F-022: Direccion preferente por tipo de diagrama

Feedback: cada diagrama tiene una direccion preferente de flechas. Por ejemplo, el Goal Tree es de arriba a abajo.

Estado: implementado en la iteracion 2.2 y validado por el usuario el 2026-07-15. Goal Tree usa `TB` por defecto y cada arbol puede elegir `TB`, `BT`, `LR` o `RL` antes de ejecutar Layout.

### F-023: Infraestructura extensible para tipos de diagrama

Feedback: cada diagrama tiene una lista de elementos con atributos propios, por ejemplo CSF y NC para Goal Tree. Seria interesante disponer de una infraestructura para definir nuevos diagramas y configurar Goal Tree, CRT, EC, etc. Esto haria la herramienta mas extensible y util.

Estado: implementacion parcial en la iteracion 3A. Goal Tree ya obtiene tipos permitidos, etiquetas, orden y direccion predeterminada de un registro central compartido por Node y la interfaz. Siguen pendientes los atributos por tipo, reglas de link, validaciones y acciones para completar la infraestructura.

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

Feedback: al pulsar `N`, el nuevo nodo debe aparecer cerca de la esquina superior izquierda de la zona visible. Al crear varias entidades seguidas dentro de un frame deben quedar suficientemente separadas para que las etiquetas de `M` sean legibles.

Estado: implementado en la iteracion 1.1 y reforzado en `3C.8`. La posicion usa una cuadricula libre calculada con las cajas completas y reserva espacio para los hints.

Criterios de aceptacion:

- El nodo nuevo aparece visible sin mover automaticamente el viewport.
- Varios nodos consecutivos conservan al menos 44 unidades entre sus cajas.
- Los hints de `M` de las entidades recien creadas no se superponen.
- La posicion se mantiene dentro del frame activo cuando sea posible.
- El frame y sus ancestros crecen para contener una fila adicional sin ejecutar Layout.

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

Estado: implementado en la iteracion 2.1 y validado por el usuario como parte de la version 2.2 el 2026-07-15. Los hints se limitan al viewport logico, se regeneran al cambiar zoom y se dibujan en una capa de pantalla de tamano constante.

Criterios de aceptacion:

- El numero y las etiquetas de hints no cambian al variar el zoom si el conjunto de elementos no ha cambiado.
- Todos los elementos seleccionables del alcance actual reciben un hint.
- Las secuencias siguen seleccionando su elemento entre 35% y 250% de zoom.
- Cambiar zoom no deja un buffer o mensaje de error anterior activo.

### F-030: Ocultar los controles L de los links fuera del modo hint

Feedback: los circulos `L` visibles sobre cada link generan ruido visual. Deberian permanecer ocultos por defecto y aparecer al activar `H`.

Estado: implementado en la iteracion 2.1 y validado por el usuario como parte de la version 2.2 el 2026-07-15. El area interactiva permanece disponible, pero el circulo solo aparece durante hint mode, hover o foco.

Criterios de aceptacion:

- En navegacion normal no se muestran circulos `L`.
- Al pulsar `H`, cada link seleccionable muestra su indicador y su hint.
- La flecha y su estado seleccionado siguen siendo visibles sin el circulo.
- El link se puede seguir seleccionando con raton mediante un area de interaccion discreta.

### F-031: El minimapa se desplaza al cambiar zoom

Feedback: al cambiar el zoom del canvas, la ventana de navegacion o minimapa cambia de posicion en la interfaz.

Estado: implementado en la iteracion 2.1 y validado por el usuario como parte de la version 2.2 el 2026-07-15. El editor ocupa una altura estable y el minimapa queda anclado al viewport, no al canvas escalado.

Criterios de aceptacion:

- El minimapa permanece fijo en la misma esquina al acercar o alejar.
- Su posicion no depende del tamano escalado del canvas.
- Abrir o cerrar paneles lo recoloca una sola vez respecto al nuevo viewport, sin saltos durante el zoom.

### F-032: El viewport del minimapa no cambia de tamano con el zoom

Feedback: el rectangulo que representa la pantalla visible mantiene el mismo tamano en el minimapa al cambiar el zoom.

Estado: reabierto tras la primera validacion visual, corregido de nuevo en la iteracion 2.2 y validado por el usuario el 2026-07-15. La nueva version calcula el rectangulo desde la proporcion real entre area visible y area desplazable.

Criterios de aceptacion:

- Al acercar, el rectangulo del viewport se hace mas pequeno.
- Al alejar, el rectangulo se hace mas grande.
- El rectangulo mantiene una posicion coherente con la zona visible.
- Click, arrastre, zoom y pan mantienen minimapa y canvas sincronizados.

### F-033: Desplazamiento con flechas y atajos Ctrl

Feedback: el canvas debe poder desplazarse con las flechas o con `Ctrl+P` arriba, `Ctrl+N` abajo, `Ctrl+F` derecha y `Ctrl+B` izquierda.

Estado: implementado en la iteracion 2.2 y validado por el usuario el 2026-07-15. Ambos juegos de teclas usan los mismos comandos de pan y no se ejecutan mientras el foco esta en un campo de texto.

Criterios de aceptacion:

- Las cuatro flechas desplazan el viewport en su direccion.
- Los cuatro atajos `Ctrl` producen el mismo resultado.
- Los atajos no modifican el texto durante la edicion.
- Los hints no capturan las letras cuando se mantiene pulsado `Ctrl`.

### F-034: Apertura temporal del inspector al editar

Feedback: al editar una entidad, el panel derecho debe abrirse automaticamente. Al confirmar con `Enter`, debe recuperar su estado anterior.

Estado: implementado en la iteracion 2.2 y validado por el usuario el 2026-07-15. El editor recuerda si el inspector estaba abierto antes de comenzar y restaura ese estado al aceptar o cancelar.

Criterios de aceptacion:

- `Enter` abre el inspector si estaba cerrado y enfoca el campo principal.
- Confirmar con `Enter` vuelve a cerrarlo si inicialmente estaba cerrado.
- Si ya estaba abierto, permanece abierto al terminar.
- Cancelar la edicion tambien restaura el estado anterior.

### F-035: Mover entidades entre frames

Feedback: debe ser posible introducir entidades en un frame y extraerlas posteriormente.

Estado: comportamiento base implementado en la iteracion 2.2 y validado por el usuario el 2026-07-15. Los nodos se pueden arrastrar entre frames o reasignar con el selector `Frame` del inspector. Las garantias geometricas adicionales quedan recogidas en F-036.

Criterios de aceptacion:

- Al soltar un nodo, el frame de destino se resalta y pasa a contenerlo.
- Soltarlo fuera de un frame hijo permite devolverlo al frame raiz o padre visible.
- El selector del inspector ofrece una alternativa precisa al arrastre.
- Cambiar la pertenencia conserva links, assumptions y el resto de datos de la entidad.

### F-036: Contencion geometrica estricta de frames

Feedback: un frame debe contener completamente todas las entidades que le pertenecen. Una entidad que no pertenece al frame ni a uno de sus descendientes no puede quedar visualmente dentro de sus limites.

Estado: implementado en el build `3B.0` y refinado en `3B.1`, pendiente de validacion manual. Layout usa la jerarquia completa del canvas; el validador comprueba contencion, exclusion y colisiones. El arrastre colectivo busca espacio libre, amplia el destino y propaga el crecimiento por sus ancestros. Un frame fijado conserva su posicion, pero vuelve a ajustar sus dimensiones al contenido.

Validacion 3A.1: confirmado visualmente que una entidad puede quedar encima de un frame al que no pertenece. Se mantiene como objetivo principal de 3B.

Validacion 3A.4: confirmado tambien el caso inverso: una entidad pertenece correctamente a `Goal Tree` y entra en su seleccion estructural, pero queda dibujada fuera del rectangulo. La pertenencia no debe alterarse por coordenadas; 3B ajustara la geometria del frame y su contenido.

Prueba visual automatizada 3A.5: el arrastre colectivo mueve correctamente tres nodos y conserva sus distancias, pero los superpone con entidades existentes en el frame destino. El escenario queda marcado como fallo hasta que 3B pueda ampliar el frame o desplazar contenido sin colisiones.

Validacion 3A.6: despues de reasignar entidades o frames con `Cmd+P` y `Cmd+F`, Layout no recompone correctamente el canvas. El algoritmo actual dispone todos los nodos como un unico grafo y solo recalcula el subarbol del frame anfitrion del arbol; ignora la composicion espacial de `ROOT`, frames hermanos y jerarquias reasignadas. Los frames fijados tampoco pueden adaptar sus limites.

Criterios de aceptacion:

- Cada entidad queda completamente dentro del frame al que pertenece directamente.
- Las entidades de frames descendientes pueden estar dentro de sus frames ancestro.
- Ninguna entidad ajena o de una rama distinta invade el interior de un frame.
- Arrastrar, pegar, crear y ejecutar Layout mantienen estas invariantes.
- Los frames anidados quedan completamente contenidos por su frame padre.

### F-037: Frame raiz ilimitado y contexto activo

Feedback: siempre debe existir un frame base infinito. Crear una entidad con `N` requiere un frame de contexto seleccionado.

Estado: refinado en el build 3A.3 y validado sobre el canvas compuesto el 2026-07-16. El root global no se dibuja ni entra en los limites del canvas o minimapa. Un selector y un boton `Root` permiten activarlo explicitamente; el canvas muestra siempre el contexto usado por `N`.

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

Validacion 3A.1: confirmado que la seleccion multiple se representa correctamente, pero Delete solo actua sobre el elemento principal. La operacion colectiva sigue planificada para 3C.

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

Estado: implementado en la iteracion 3A y pendiente de validacion final. La seleccion general admite nodos, links y frames; seleccionar un frame calcula en el nucleo sus descendientes, entidades y links internos. El build 3A.3 separa los contadores `Selected` e `Included` y un segundo click sobre el frame limpia la seleccion sin cambiar el frame activo.

Criterios de aceptacion:

- Seleccionar un frame incluye sus frames descendientes y todas sus entidades.
- Se incluyen los links cuyos dos extremos estan dentro del conjunto.
- Los links con un extremo externo quedan fuera de la seleccion interna.
- La interfaz distingue el frame principal de los elementos incluidos automaticamente.
- Copiar, borrar y otras operaciones usan exactamente el mismo cierre de seleccion.

### F-042: Ciclar el tipo con Shift+Tab

Feedback: con una entidad seleccionada, `Shift+Tab` avanza desde su tipo actual. Con varias entidades, la primera pulsacion sincroniza todas en el inicio de la lista y las siguientes recorren juntas la lista de forma ciclica.

Estado: implementado en `3C.7` sobre la seleccion general y el orden declarativo de tipos.

Criterios de aceptacion:

- Solo se aplica a entidades y nunca a frames o links.
- Una entidad avanza al siguiente tipo permitido desde su valor actual.
- Varias entidades se sincronizan primero en el primer tipo repetible permitido y despues avanzan juntas.
- El ciclo y su orden proceden de la definicion del tipo de diagrama.
- La operacion funciona sobre una seleccion individual o multiple.
- Dentro de un campo de edicion, `Shift+Tab` conserva la navegacion normal de foco.
- Se respetan restricciones estructurales: un tipo `unique` no puede aplicarse a varias entidades ni duplicarse.
- Todo el grupo cambia en una transaccion y un unico Undo lo restaura.

### F-043: Enrutado de flechas sin cruces ni entidades atravesadas

Feedback: despues de aplicar Layout, las flechas no deberian cruzarse si es posible ni pasar por debajo de las entidades.

Estado: refinado en los builds `3B.1`, `3B.2` y `3C.4`, pendiente de validacion manual. Layout intenta primero una recta; si atraviesa una entidad o cruza otra ruta de forma evitable, calcula un desvio ortogonal. En diagramas complejos ejecuta nueve variantes deterministas de ELK y selecciona por cruces, obstaculos, longitud y area. Desde `3C.4`, la direccion es estricta para grafos aciclicos y las excepciones solo pueden proceder de enlaces restaurados tras romper temporalmente un ciclo. La misma regla de puertos se mantiene durante el arrastre manual.

Criterios de aceptacion:

- El layout minimiza cruces de links cuando existe una alternativa razonable.
- Ninguna ruta atraviesa el interior de una entidad.
- Las rutas respetan frames y otros obstaculos visibles.
- Las puntas terminan en el borde correcto del destino.
- La animacion de Layout interpola tambien las rutas sin ocultarlas bajo nodos.
- Cuando un cruce sea inevitable, se mantiene legible y estable.
- Una conexion recta se conserva cuando no invade entidades ni introduce cruces.
- Los lados de salida y entrada coinciden con la direccion preferente del diagrama.
- Las excepciones direccionales quedan cuantificadas y solo se aceptan cuando corresponden a rupturas temporales de ciclos detectados.

### F-044: Listado completo de atajos en el panel izquierdo

Feedback: todas las combinaciones de teclado deben aparecer debajo de Keyboard en el panel izquierdo.

Estado: implementado en la iteracion 2.3 y validado por el usuario el 2026-07-15. La lista se genera desde el mismo mapa de comandos y etiquetas que utiliza el teclado.

Criterios de aceptacion:

- Cada comando configurado aparece exactamente una vez.
- Se muestran todas las combinaciones alternativas del comando.
- Modificar la configuracion actualiza la lista sin editar el panel.
- La lista puede plegarse y el panel conserva un scroll util.

### F-045: El boton Hints debe alternar su estado

Feedback: la tecla `H` muestra y oculta correctamente los hints, pero el boton Hints solo los activa.

Estado: implementado en la iteracion 2.3 y validado por el usuario el 2026-07-15. Tecla y boton comparten la misma accion de alternancia.

Criterios de aceptacion:

- Pulsar el boton con hints ocultos los muestra.
- Pulsarlo de nuevo los oculta y limpia cualquier secuencia parcial.
- El boton indica visualmente y mediante `aria-pressed` si estan activos.
- `H` produce exactamente la misma transicion sin seleccionar accidentalmente un hint.

### F-046: Trabajar con entidades externas desde una vista de foco

Feedback: desde el foco de un frame se debe poder consultar, buscar y conectar con entidades exteriores sin abandonar esa vista.

Estado: pendiente para la iteracion 3D. Requiere portales de links externos y un selector secundario de entidades fuera del alcance.

Criterios de aceptacion:

- Un panel secundario busca entidades externas por texto, tipo y frame.
- Los resultados muestran suficiente contexto para distinguir entidades similares.
- Se puede previsualizar una entidad externa sin cambiar el foco.
- Al crear un link, el origen puede estar dentro y el destino fuera, o viceversa.
- Elegir el destino externo completa la conexion sin desplazar el canvas enfocado.
- Los nuevos links aparecen como portales en el borde y como links normales fuera del foco.
- El flujo completo funciona con teclado y keyboard hints.

### F-047: Indicar una direccion pendiente de aplicar

Feedback: cambiar la direccion preferente no reorganiza inmediatamente el diagrama; es necesario ejecutar Layout con el boton o su atajo. La interfaz debe hacer visible esta relacion.

Estado: pendiente para la iteracion 3B, junto con la consolidacion del layout direccional.

Criterios de aceptacion:

- Cambiar la direccion marca el diagrama como pendiente de Layout.
- El boton Layout muestra un estado visual discreto hasta aplicar la preferencia.
- El estado se limpia al completar Layout correctamente.
- La interfaz no da a entender que el diagrama ya ha sido reorganizado.
- Boton y `Cmd/Ctrl+Shift+L` aplican la misma direccion pendiente.

### F-048: El minimapa debe mostrar la escala relativa al alejar

Feedback: al alejar suficientemente el zoom, el rectangulo del viewport cambia de tamano, pero el resto del diagrama conserva el mismo tamano en el minimapa. Se espera que el diagrama se vea mas pequeno para representar que ocupa solo una parte de la pantalla real.

Estado: implementado en la iteracion 2.4 y validado por el usuario el 2026-07-15. El dominio del minimapa abarca tanto el contenido como la extension logica del viewport y aplica una unica transformacion a todos sus elementos.

Criterios de aceptacion:

- Si el viewport logico es mayor que el contenido, el diagrama se reduce dentro del minimapa.
- El espacio visible alrededor del contenido queda representado de forma proporcional.
- El contenido y el rectangulo del viewport comparten origen, escala y limites.
- Acercar, alejar, desplazar y navegar desde el minimapa no producen saltos.
- El comportamiento sigue siendo correcto con paneles laterales abiertos o cerrados.

### F-049: Centrar el zoom sobre la seleccion

Feedback: al acercar o alejar, si existe algun elemento seleccionado, la pantalla debe ir centrandose sobre ese elemento para no perder el contexto de trabajo.

Estado: implementado en la iteracion 3A y pendiente de validacion manual. El zoom usa el centro geometrico de la seleccion general y conserva el centro logico del viewport cuando la seleccion esta vacia.

Criterios de aceptacion:

- Una entidad seleccionada permanece centrada al acercar o alejar.
- Un frame seleccionado usa el centro de sus limites visibles.
- Un link seleccionado usa el centro de su ruta o etiqueta.
- Una seleccion multiple usa el centro del conjunto seleccionado.
- Sin seleccion se conserva el centro logico actual del viewport.
- El anclaje funciona con botones, atajos y cualquier control de zoom configurado.

### F-050: Deshacer y rehacer operaciones

Feedback: la herramienta debe contemplar opciones de deshacer y rehacer como capacidad transversal.

Estado: infraestructura inicial implementada en la iteracion 3.0 y validada por el usuario el 2026-07-15. Las operaciones existentes quedan cubiertas mediante transacciones compatibles y la edicion de nodos ya usa un comando granular.

Criterios de aceptacion:

- `Cmd/Ctrl+Z` deshace la ultima transaccion semantica.
- `Cmd/Ctrl+Shift+Z` y `Cmd/Ctrl+Y` rehacen la transaccion.
- Los botones indican si existe una accion disponible y muestran su nombre.
- Editar texto, crear, mover, borrar y aplicar Layout se registran como intenciones reconocibles.
- Zoom, pan, seleccion, hints y paneles no aparecen en el historial semantico.
- Una accion nueva despues de deshacer limpia la pila de rehacer.
- El historial de sesion tiene un limite de memoria y no sustituye a checkpoints duraderos.

### F-051: Nucleo headless para terminal y agentes

Feedback: en una fase posterior se debe poder consultar y modificar arboles desde terminal, con garantias suficientes para que agentes de IA trabajen sin interfaz grafica.

Estado: arquitectura base implementada en la iteracion 3.0 y aceptada junto con esa iteracion el 2026-07-15. Existe una CLI inicial para validar, listar arboles, actualizar nodos y aplicar comandos JSON con `--dry-run`. La cobertura completa de comandos, permisos, auditoria duradera y MCP queda planificada para fases posteriores.

Criterios de aceptacion:

- Electron y CLI consumen el mismo registro de comandos y validador.
- Todo comando de escritura usa ID idempotente y revision esperada.
- El almacenamiento rechaza revisiones obsoletas bajo bloqueo de archivo.
- La escritura usa archivo temporal, sincronizacion y sustitucion atomica.
- Los errores y consultas tienen una representacion JSON estable.
- Un agente puede previsualizar el resultado y las invariantes sin modificar archivos.
- Ningun adaptador necesita modificar directamente el JSON para ejecutar operaciones soportadas.

### F-052: Animar Undo/Redo de operaciones espaciales

Feedback: al deshacer o rehacer un Layout se debe poder ver tambien la transicion de vuelta o hacia delante, en lugar de saltar instantaneamente entre geometrias.

Estado: implementado para Layout en el build `3B.0` y pendiente de validacion manual. La categoria `spatial.layout` viaja en la transaccion y Undo/Redo reutiliza la misma interpolacion de nodos, frames y links sin crear historial adicional.

Criterios de aceptacion:

- Deshacer Layout interpola desde la geometria actual hasta la anterior.
- Rehacer Layout reproduce la transicion hacia la geometria restaurada.
- Nodos, frames, links y puntas de flecha permanecen sincronizados durante el movimiento.
- La animacion no crea una nueva entrada en Undo/Redo.
- Las transacciones declaran su categoria espacial; el renderer no la deduce del texto de la etiqueta.
- `prefers-reduced-motion` mantiene un cambio inmediato y correcto.

### F-053: Identidad visible de la version en pruebas

Feedback: debe poder verse dentro de la aplicacion que version se esta probando para evitar validar por error una ventana o build anterior.

Estado: implementado como build `3A.1` y pendiente de validacion manual. La barra superior muestra version e identificador de build; el titulo de la ventana anade tambien el nombre descriptivo.

Criterios de aceptacion:

- La identidad es visible aunque los paneles laterales esten cerrados.
- Version e identificador proceden de metadatos centrales del paquete.
- La prueba smoke verifica el mismo texto que ve el usuario.
- Cada entrega manual incrementa el identificador de build.

### F-054: Seleccion por rectangulo

Feedback: debe poder dibujarse un rectangulo con el raton para seleccionar todos los elementos que caigan dentro.

Estado: pendiente para la iteracion 3C, junto con las operaciones colectivas sobre la seleccion.

Criterios de aceptacion:

- Arrastrar desde una zona vacia muestra un rectangulo de seleccion estable.
- Los nodos y frames contenidos o intersectados siguen una regla visual unica y predecible.
- Los links se incluyen cuando ambos extremos quedan seleccionados, no por cruzar el rectangulo.
- `Shift` o `Cmd` anaden al conjunto existente y el gesto simple lo sustituye.
- El gesto no desplaza nodos ni navega el minimapa accidentalmente.

### F-055: Root global y frame explicito por arbol

Feedback: el root debe ser un frame global, ilimitado y permanente. Cada arbol debe tener ademas un frame explicito propio, de forma que varios arboles puedan colocarse en el root o dentro de otro frame.

Estado: implementado en el build `3A.4` y validado manualmente el 2026-07-16. El canvas posee un root conceptual unico; el antiguo root del arbol se migra sin cambiar su identidad a un frame anfitrion visible y finito.

Criterios de aceptacion:

- El canvas tiene exactamente un root conceptual sin geometria finita.
- Cada arbol tiene un frame anfitrion explicito, visible y finito.
- Un frame anfitrion referencia el arbol que contiene.
- Varios arboles pueden ser hermanos o estar anidados dentro de otro frame no root.
- El selector de frame conserva el root y todos los frames explicitos como destinos validos.
- La pertenencia de nodos y links al arbol no se confunde con la jerarquia espacial del canvas.

### F-056: Resumen por categorias del frame seleccionado

Feedback: en lugar de contadores genericos `Selected` e `Included`, al seleccionar un frame conviene mostrar un resumen de su contenido por categoria o tipo.

Estado: implementado en el build `3A.4` y validado manualmente el 2026-07-16. El estado del canvas y el inspector muestran recuentos por tipo declarativo, subframes, links internos y assumptions relacionados.

Criterios de aceptacion:

- El resumen excluye el propio frame seleccionado.
- Muestra frames descendientes, links internos y entidades agrupadas por tipo declarativo.
- Goal Tree muestra al menos Goal, CSF, NC y Assumption.
- Las categorias con cero elementos pueden omitirse o mostrarse de forma secundaria.
- Los recuentos proceden del mismo cierre de seleccion usado por las operaciones colectivas.

### F-057: Mover la seleccion entre frames con teclado

Feedback: `Cmd+P` debe sacar la seleccion un nivel hacia su frame padre. `Cmd+F` debe mostrar exclusivamente frames, incluido el root, con hints para elegir el nuevo destino.

Estado: implementado en el build `3A.6` y validado manualmente el 2026-07-16 para `Cmd+P`, `Cmd+F` y la navegacion independiente con `Ctrl+P/F`. El build `3B.0` anade la recomposicion espacial posterior mediante Layout y queda pendiente de validacion manual.

Criterios de aceptacion:

- `Cmd+P` mueve cada raiz explicita seleccionada un nivel hacia su padre.
- Si se selecciona un frame, sus descendientes viajan con el sin reprocesarse individualmente.
- `Cmd+F` abre un modo de destino que muestra solo frames validos y un target sintetico `ROOT`.
- Elegir el destino ejecuta una unica transaccion reversible.
- Un frame no puede moverse dentro de si mismo ni de un descendiente.
- Los links conservan su identidad y recalculan su ruta.
- Mover una entidad al root cambia su contenedor espacial, pero no el arbol logico al que pertenece.
- `Ctrl+G` cancela el modo de destino sin modificar datos.

### F-058: Seleccion multiple general y arrastre colectivo

Feedback: `M` debe activar y desactivar una seleccion multiple general. Si se arrastra una entidad que pertenece a esa seleccion, deben desplazarse juntas todas las entidades seleccionadas.

Estado: interaccion implementada en `3A.5`; contencion y exclusion geometricas completadas en el build `3B.0`, pendientes de validacion manual. El arrastre colectivo conserva distancias, busca una posicion libre, crece el frame cuando es necesario y se guarda como una sola operacion reversible.

Criterios de aceptacion:

- Pulsar `M` entra en seleccion multiple y pulsarlo de nuevo cierra los hints sin limpiar la seleccion.
- Los hints de seleccion multiple admiten nodos, links y frames.
- `L` usa solamente los nodos de la seleccion general como fuentes y mantiene separado el estado de conexion.
- Arrastrar un nodo explicitamente seleccionado mueve todos los nodos explicitamente seleccionados conservando sus distancias relativas.
- El grupo cambia de frame en una unica transaccion y Undo lo devuelve completo.
- La contencion final y el crecimiento del frame cumplen F-036 en 3B.

### F-059: Caso complejo permanente para Layout y claridad de flechas

Feedback: reproducir como caso base el Goal Tree de referencia con un Goal, tres CSF y condiciones necesarias compartidas entre ramas. Los tres CSF apuntan directamente al Goal y sus puntas deben distinguirse.

Estado: implementado en `3B.3`. El fixture estable contiene 18 entidades y 21 links. La regresion visual carga este archivo, aplica Layout y comprueba capas, rutas, geometria y puntas de flecha.

Criterios de aceptacion:

- Los tres CSF apuntan directamente al Goal y ocupan una misma capa semantica.
- Las tres flechas llegan a puntos distintos del borde del Goal.
- Las puntas conservan al menos 10 px en pantalla al encajar un diagrama grande.
- El caso mantiene los links cruzados y los habilitadores compartidos de la referencia.
- Layout produce cero cruces independientes, no atraviesa entidades y conserva la mayoria de rutas rectas.
- El frame Goal Tree se ajusta para contener completamente el resultado.

### F-060: Layout solo sustituye una disposicion cuando mejora claramente

Feedback: una reduccion minima de cruces no debe dominar sobre la estabilidad del mapa mental, el espacio vacio y los enlaces excesivamente largos. Si ELK no mejora al menos un 15% la disposicion actual, debe conservarse el layout del usuario.

Estado: implementado en `3B.4`. La disposicion actual se evalua como candidato `CURRENT` con la misma funcion ponderada que las variantes ELK.

Criterios de aceptacion:

- El desplazamiento se mide de forma relativa al centroide, para no penalizar una traslacion rigida del diagrama.
- Los movimientos inferiores a 120 px no reciben penalizacion de estabilidad.
- La puntuacion incluye densidad, area vacia, longitud media y longitud maxima.
- Los enlaces que superan 480 px reciben una penalizacion cuadratica adicional.
- Cruces, obstaculos y excepciones direccionales permanecen en la funcion de coste, pero ningun cruce minimo decide por si solo.
- ELK sustituye `CURRENT` solamente cuando reduce la puntuacion al menos un 15%.
- Conservar `CURRENT` mantiene todas las posiciones relativas y permite reajustar el frame para preservar contencion.

### F-061: Cada frame debe optimizarse como una unidad jerarquica

Feedback: Layout debe organizar el contenido de cada frame de forma practica. Un frame anidado debe participar en el layout de su padre como una entidad completa, con sus conexiones externas proyectadas sobre el borde, y no como un conjunto plano de nodos internos.

Estado: linea base diagnostica implementada tras `3B.4`; correccion prevista para `3B.5`. Cuatro escenarios deterministas generan conexiones aleatorias y capturan estados antes/despues. Las semillas `4103` y `4104` reproducen solapamientos y perdida de contencion con frames anidados.

Criterios de aceptacion:

- Cada frame calcula primero un layout interno compacto y conserva una proporcion util.
- El frame resultante se trata como una caja indivisible al organizar su padre.
- Trasladar el frame desde el nivel padre mueve rigidamente todo su contenido.
- Los links externos usan puertos de frontera y conservan sus entidades reales como extremos semanticos.
- La puntuacion y el umbral del 15% se aplican en cada nivel de la jerarquia.
- Aplicar Layout no convierte una cuadricula interna legible en una columna salvo que la topologia lo exija y la puntuacion demuestre una mejora clara.
- Frames hermanos y anidados no se solapan, y ningun nodo queda dentro de un frame al que no pertenece.

### F-062: Borrado inmediato con Ctrl+D

Feedback: la confirmacion modal al borrar distrae demasiado. El borrado debe ejecutarse directamente y admitir `Ctrl+D`, ademas de `Delete` y `Backspace`.

Estado: implementado en `3B.4.1`.

Criterios de aceptacion:

- `Delete`, `Backspace` y `Ctrl+D` ejecutan exactamente el mismo comando.
- No aparece ninguna ventana de confirmacion.
- Nodos, links y frames no protegidos se borran en una unica transaccion.
- Los links, assumptions y datos de layout dependientes se eliminan atomicamente.
- Undo restaura la operacion completa.
- El root conceptual y el frame principal del arbol siguen protegidos.
- Los atajos de borrado no se ejecutan mientras se edita un campo de texto.

### F-063: Frame minimizado como entidad compuesta reversible

Feedback: un frame debe poder minimizarse ocultando sus entidades y links internos, pero manteniendo visibles las flechas que entran y salen. Al expandir debe recuperarse el mapa mental anterior. La minimizacion debe tener prioridad frente a seguir optimizando todos los detalles expandidos.

Estado: implementado en `3C.0` sobre el adaptador neutral de motores. ELK sigue siendo el motor de produccion y el experimento Cola permanece aislado en su rama.

Criterios de aceptacion:

- El frame minimizado se representa como una caja compacta y participa como una entidad unica en el layout de su padre.
- Nodos, frames y links internos dejan de renderizarse, pero permanecen intactos en el documento.
- Cada link externo conserva sus extremos semanticos y proyecta visualmente el extremo oculto al borde del frame.
- Minimap, hints y centrado utilizan la misma nocion de visibilidad que el canvas.
- `-` y el inspector alternan minimizar y expandir sin conflicto con `Cmd/Ctrl+-` para zoom.
- Undo y Redo animan ambas transiciones como una unica operacion espacial.
- Expandir conserva posiciones relativas, ajusta el frame para contener todo y recalcula rutas que no atraviesen entidades.
- La prueba visual completa termina en `PASS` y conserva el resto de flujos del prototipo.

### F-064: Layout practico dentro de cada frame

Feedback: al crear un frame dentro de Goal Tree y meter tres entidades, Layout las colocaba siempre en vertical en vez de optimizar el espacio interior.

Estado: corregido en `3C.1`. La causa era un postprocesado posterior a ELK que convertia cualquier `container` en una sola columna para diagramas verticales.

Criterios de aceptacion:

- Un frame conectado conserva las capas calculadas por ELK y evalua sus variantes como el frame principal.
- Tres entidades desconectadas forman una cuadricula compacta de dos columnas y dos filas.
- El frame se reajusta a su contenido y participa como una caja completa en el layout de su padre.
- Si cambia el tamano del frame hijo, el padre no puede conservar posiciones que produzcan solapamientos.
- Nodos y frames permanecen contenidos y las rutas no atraviesan entidades.
- El resultado es determinista y se verifica con fixture algoritmico y captura de Electron.

### F-065: Cmd+X alterna la minimizacion de un frame

Feedback: `Cmd+X` debe minimizar el frame seleccionado y, al pulsarlo de nuevo, expandirlo.

Estado: implementado en `3C.2`.

Criterios de aceptacion:

- `Cmd+X` alterna el estado del frame seleccionado en macOS.
- `Ctrl+X` ofrece el equivalente multiplataforma.
- El segundo uso recupera el frame mediante la misma transicion reversible.
- Dentro de inputs y textareas, el atajo conserva la accion nativa de cortar texto.
- `Cmd+-` continua reservado al zoom y `-` permanece como alternativa sin modificador.
- La ayuda de teclado muestra ambos bindings.

### F-066: El frame de contexto no debe quedar ocultamente seleccionado por M

Feedback: tras seleccionar varias entidades con `M` y pulsar `Cmd+F`, uno de los frames visibles no recibia letra. Solo aparecian Root, Goal Tree y otro frame.

Estado: corregido en `3C.3`. El frame ausente seguia siendo una raiz de seleccion explicita heredada del contexto activo. Por ello se excluia correctamente como destino para impedir que un frame entrase dentro de si mismo, aunque la interfaz parecia mostrar solo las entidades elegidas.

Criterios de aceptacion:

- Si `M` empieza con un frame seleccionado y la primera eleccion es una entidad, ese frame se interpreta como contexto provisional y deja de ser una raiz de seleccion.
- Las siguientes entidades se acumulan sin volver a incorporar el frame activo.
- `Cmd+F` muestra Root y todos los frames validos, incluido el antiguo frame de contexto.
- Si el usuario elige otro frame como primer elemento durante `M`, la seleccion de frames sigue siendo intencional y se conserva.
- Un frame seleccionado explicitamente y sus descendientes continuan excluidos como destinos para impedir ciclos.
- La barra de estado y el cierre de seleccion reflejan solamente las raices que realmente se moveran.

### F-067: Capas estrictas y ruptura explicita de ciclos

Feedback: en direccion `Bottom to Top`, una flecha que llegaba al nodo `MIRARLO` apuntaba hacia abajo aunque el grafo no tenia bucles. Si no hay ciclos, todas las relaciones deben seguir la direccion preferente. Si existe un ciclo, Layout puede romper temporalmente la relacion mas adecuada, colocar el grafo y restaurarla despues.

Estado: implementado en `3C.4`. Se ha eliminado la variante relajada que invertia atajos aciclicos para ahorrar capas. El registro de Goal Tree declara ahora una estrategia `greedyFeedbackArc`; el coordinador obtiene un DAG de layout, calcula rangos por el camino mas largo al destino y conserva intactos los links semanticos.

Criterios de aceptacion:

- Un DAG tiene `0 directionExceptions` y `0 cycleBreaks` en cualquiera de las cuatro direcciones.
- Cada enlace aciclico conecta capas estrictamente consecutivas o separadas en la direccion preferente.
- Los atajos pueden crear capas adicionales, pero nunca una flecha invertida.
- Un ciclo se transforma temporalmente en DAG mediante un conjunto determinista y reducido de aristas de retorno.
- Las aristas rotas solo cambian para la entrada de ELK; origen, destino e identidad de los links persistidos no se modifican.
- Tras restaurar el ciclo, las unicas excepciones direccionales permitidas corresponden a `cycleBreaks` registrados.
- El umbral de estabilidad del 15% solo compara layouts factibles; no conserva una disposicion aciclica con flechas invertidas.
- Frames anidados aplican la misma regla dentro de cada nivel jerarquico.

### F-068: Flechas curvas configurables

Feedback: interesa evaluar flechas curvas en lugar de rutas ortogonales.

Estado: implementado como experimento reversible en `3C.5`. `CURVED` es la proyeccion inicial de Goal Tree y `ORTHOGONAL` permanece disponible en la barra superior. Ambos modos consumen la misma ruta neutral calculada por el coordinador.

Criterios de aceptacion:

- Cambiar entre `Curved` y `Orthogonal` no ejecuta Layout ni mueve entidades o frames.
- Enlaces directos usan curvas cubicas con tangentes perpendiculares en origen y destino.
- Rutas con desvio redondean sus esquinas sin abandonar el corredor libre de obstaculos.
- Las puntas conservan orientacion, tamano estable con zoom y puertos distribuidos.
- Las curvas no atraviesan entidades visibles ni detalles ocultos de frames minimizados.
- Layout, Undo y Redo mantienen los enlaces unidos a sus extremos durante la transicion.
- La preferencia se persiste en `tree.layout.settings.routingStyle` y es independiente de la semantica de los links.
- El registro declarativo de cada diagrama puede elegir estilo inicial y estilos admitidos.

### F-069: Puertos adaptativos y tramos terminales rectos

Feedback: una flecha curva debe conservar la perpendicularidad hasta el inicio visible de la punta. Los puntos de entrada y salida pueden desplazarse por la cara preferente, los nodos pueden deslizarse dentro de su capa y el frame puede crecer si asi se reducen cruces.

Estado: implementado en `3C.6`.

Criterios de aceptacion:

- El tramo anterior a la punta permanece recto y perpendicular durante al menos 14 px visibles en cualquier nivel de zoom admitido.
- Los puertos se proyectan hacia el otro extremo, se mantienen dentro de margenes seguros y conservan una separacion minima.
- Varios links sobre una cara ordenan sus puertos como sus extremos opuestos para evitar cruces locales.
- Todas las conexiones respetan las caras preferentes de la direccion del diagrama.
- Las variantes ELK incluyen separacion compacta y ampliada sobre el eje de cada capa.
- La funcion de calidad compara cruces, obstaculos, longitud, espacio y estabilidad usando los puertos adaptativos.
- El frame se ajusta a las dimensiones del candidato ganador sin perder contencion.
- El caso complejo conserva capas, cero cruces independientes y cero curvas atravesando entidades.
