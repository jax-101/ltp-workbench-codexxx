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

Estado: pendiente. La pertenencia logica ya puede modificarse, pero la geometria actual no impone contencion ni exclusion.

Validacion 3A.1: confirmado visualmente que una entidad puede quedar encima de un frame al que no pertenece. Se mantiene como objetivo principal de 3B.

Validacion 3A.4: confirmado tambien el caso inverso: una entidad pertenece correctamente a `Goal Tree` y entra en su seleccion estructural, pero queda dibujada fuera del rectangulo. La pertenencia no debe alterarse por coordenadas; 3B ajustara la geometria del frame y su contenido.

Prueba visual automatizada 3A.5: el arrastre colectivo mueve correctamente tres nodos y conserva sus distancias, pero los superpone con entidades existentes en el frame destino. El escenario queda marcado como fallo hasta que 3B pueda ampliar el frame o desplazar contenido sin colisiones.

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

Feedback: con una o varias entidades seleccionadas, `Shift+Tab` debe recorrer ciclicamente su tipo.

Estado: pendiente para la iteracion 3C. La iteracion 3A ya aporta la seleccion general y el orden declarativo de tipos que necesita esta operacion.

Criterios de aceptacion:

- Solo se aplica a entidades y nunca a frames o links.
- Cada entidad avanza al siguiente tipo permitido por el diagrama.
- El ciclo y su orden proceden de la definicion del tipo de diagrama.
- La operacion funciona sobre una seleccion individual o multiple.
- Dentro de un campo de edicion, `Shift+Tab` conserva la navegacion normal de foco.
- Se respetan restricciones estructurales, como tipos unicos o cardinalidades.

### F-043: Enrutado de flechas sin cruces ni entidades atravesadas

Feedback: despues de aplicar Layout, las flechas no deberian cruzarse si es posible ni pasar por debajo de las entidades.

Estado: pendiente para la iteracion 3B. ELK minimiza cruces al colocar nodos, pero el renderer actual sustituye sus rutas por lineas rectas y no evita obstaculos.

Criterios de aceptacion:

- El layout minimiza cruces de links cuando existe una alternativa razonable.
- Ninguna ruta atraviesa el interior de una entidad.
- Las rutas respetan frames y otros obstaculos visibles.
- Las puntas terminan en el borde correcto del destino.
- La animacion de Layout interpola tambien las rutas sin ocultarlas bajo nodos.
- Cuando un cruce sea inevitable, se mantiene legible y estable.

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

Estado: pendiente para la iteracion 3B, donde se consolidaran las operaciones espaciales y la geometria compuesta.

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

Estado: implementado en el build `3A.6` y pendiente de validacion manual. Las pruebas visuales automatizadas cubren entidades, frames completos, `ROOT`, prevencion de ciclos y Undo/Redo. El ajuste geometrico del destino permanece dentro de F-036 para 3B.

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

Estado: implementado en el build `3A.5` y pendiente de validacion manual. `M` ya no representa un conjunto especial de fuentes de links; `L` transforma despues los nodos seleccionados en fuentes. El arrastre colectivo se guarda como una sola operacion reversible.

Criterios de aceptacion:

- Pulsar `M` entra en seleccion multiple y pulsarlo de nuevo cierra los hints sin limpiar la seleccion.
- Los hints de seleccion multiple admiten nodos, links y frames.
- `L` usa solamente los nodos de la seleccion general como fuentes y mantiene separado el estado de conexion.
- Arrastrar un nodo explicitamente seleccionado mueve todos los nodos explicitamente seleccionados conservando sus distancias relativas.
- El grupo cambia de frame en una unica transaccion y Undo lo devuelve completo.
- La contencion final y el crecimiento del frame cumplen F-036 en 3B.
