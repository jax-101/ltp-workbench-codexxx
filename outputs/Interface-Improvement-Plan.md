# Interface Improvement Plan

Plan de evolucion del prototipo a partir del feedback F-010 a F-047. Estas son iteraciones de interfaz y no sustituyen las fases de producto definidas en el PRD.

## Principios de ejecucion

- Mantener `main` estable y trabajar cada iteracion en una rama.
- Entregar cambios pequenos que puedan probarse en el prototipo.
- Validar primero el uso con teclado y despues el acabado visual.
- Registrar el feedback posterior en `outputs/Feedback-Log.md`.
- Mantener `inputs/` y los PDF fuera de GitHub.

## Iteracion 1: estabilidad de seleccion y lectura

Estado: implementada y validada inicialmente el 2026-07-14.

Incluye:

- F-010: hints de una o varias letras sin conflictos con otros comandos.
- F-011: conservar la posicion del canvas entre selecciones y renders.
- F-018: dibujar puntas de flecha visibles en el borde de las entidades.
- F-019: separar comandos y combinaciones de teclas.
- F-024: permitir consultar el texto completo de una entidad.

Criterios de aceptacion:

- Un hint como `AA` se puede completar sin ejecutar el hint `A` ni crear entidades.
- Ningun hint es prefijo de otro hint visible.
- Mostrar hints o cambiar la seleccion no modifica el scroll del canvas.
- Cada link muestra claramente su direccion y termina en el borde del nodo destino.
- El texto completo de un nodo puede abrirse con raton o teclado.
- Los atajos se leen desde un mapa de comandos separado del controlador de teclado.

## Iteracion 1.1: flujo de edicion con teclado

Esta iteracion corta se valida antes de comenzar la iteracion 2.

Estado: implementada y validada por el usuario el 2026-07-15.

Incluye:

- F-025: `Enter` confirma la edicion y `Shift+Enter` crea una linea.
- F-026: `Espacio` alterna el pop-up y `Enter` continua la edicion en el inspector.
- F-027: los nodos nuevos aparecen dentro del viewport actual.
- F-028: `Ctrl+G` cancela el contexto activo y puede limpiar la seleccion.

Criterios de aceptacion:

- El ciclo seleccionar -> editar -> confirmar puede completarse sin raton.
- El pop-up puede abrirse, cerrarse y convertirse en edicion sin usar `Esc`.
- Crear un nodo no obliga a buscarlo fuera de la zona visible.
- La cancelacion tiene el mismo resultado tanto con `Ctrl+G` como con `Esc`, salvo que `Ctrl+G` puede limpiar la seleccion en navegacion.

## Iteracion 2: edicion y navegacion

Estado: implementada y validada por el usuario como parte de la version 2.2 el 2026-07-15.

Incluye:

- F-014: borrado seguro de links, entidades y frames.
- F-020: zoom, pan, centrar seleccion y ajustar a pantalla con teclado.
- F-013: paneles laterales plegables.
- F-012: minimapa sincronizado con el viewport.

Criterios de aceptacion:

- El borrado limpia relaciones y referencias sin dejar datos huerfanos.
- Todas las operaciones principales de navegacion funcionan sin raton.
- El estado de vista se conserva al guardar y reabrir.

## Iteracion 2.1: estabilizacion de hints y minimapa

Esta iteracion corta se completa antes de integrar la iteracion 2 en `main`.

Estado: implementada y validada por el usuario como parte de la version 2.2 el 2026-07-15.

Incluye:

- F-029: corregir hints incompletos despues de usar zoom.
- F-030: ocultar los indicadores `L` salvo durante hint mode.
- F-031: mantener el minimapa anclado al viewport.
- F-032: escalar correctamente el rectangulo visible del minimapa.

Criterios de aceptacion:

- Los hints conservan cantidad, secuencia y seleccion a cualquier zoom soportado.
- Los links no anaden ruido visual fuera de hint mode.
- El minimapa no cambia de posicion durante zoom.
- Su rectangulo representa correctamente el area logica visible.

## Iteracion 2.2: interaccion, pertenencia y layout visible

Estado: implementada y validada por el usuario el 2026-07-15.

Incluye:

- F-032: segunda correccion del tamano visible del viewport del minimapa.
- F-033: desplazamiento con flechas y con `Ctrl+P/N/F/B`.
- F-034: apertura temporal del inspector durante la edicion.
- F-035: entrada y salida de entidades mediante arrastre o selector de frame.
- F-021: transicion animada de nodos, frames y links al ejecutar Layout.
- F-022: direccion de layout configurable, con Goal Tree de arriba abajo por defecto.

Criterios de aceptacion:

- El rectangulo del minimapa cambia de tamano de forma claramente visible al variar el zoom.
- La navegacion alternativa funciona sin interferir con la edicion ni los hints.
- El inspector recupera exactamente su estado previo al terminar de editar.
- Cambiar una entidad de frame conserva sus conexiones y actualiza ambas listas de pertenencia.
- El auto-layout muestra el recorrido de los elementos y las flechas lo acompanan.
- ELK respeta la direccion elegida para el arbol.

## Iteracion 2.3: cierre de controles y ayuda de teclado

Estado: implementada y validada por el usuario el 2026-07-15.

Incluye:

- F-044: listado completo y plegable de atajos en el panel izquierdo.
- F-045: alternancia de hints compartida por tecla y boton.
- Registrar F-043 para resolver el enrutado de links con la geometria de 3B.

Criterios de aceptacion:

- El panel refleja todos los comandos y alternativas de la configuracion real.
- La ayuda puede plegarse sin perder acceso al resto del panel.
- `H` y el boton Hints abren y cierran el mismo estado.
- Cerrar hints limpia el buffer y actualiza el estado visual del boton.

## Iteracion 2.4: escala contextual del minimapa

Estado: implementada y validada por el usuario el 2026-07-15.

Incluye:

- F-048: hacer que el minimapa represente tambien la extension logica visible al alejar el zoom mas alla del contenido.

Criterios de aceptacion:

- Al alejar y ver espacio alrededor del diagrama, su representacion se hace proporcionalmente mas pequena dentro del minimapa.
- El rectangulo del viewport y el contenido usan el mismo dominio espacial y permanecen alineados.
- Al acercar, el minimapa sigue mostrando el contenido completo y el rectangulo reduce su tamano.
- Click, arrastre, pan y ajuste a pantalla conservan su correspondencia con el canvas.

## Iteracion 3.0: nucleo transaccional y acceso headless

Estado: infraestructura inicial implementada y validada por el usuario el 2026-07-15.

Incluye:

- F-050: deshacer y rehacer cambios semanticos con parches directos e inversos.
- F-051: nucleo de dominio independiente de Electron y primera CLI JSON.
- Revision optimista, command IDs idempotentes, validacion previa al commit y escritura atomica con bloqueo.
- Cola de operaciones para coordinar vista, edicion y persistencia.
- Migracion granular de `node.update`; el resto de operaciones entra temporalmente como transaccion compatible.

Criterios de aceptacion:

- `Cmd/Ctrl+Z` deshace y `Cmd/Ctrl+Shift+Z` o `Cmd/Ctrl+Y` rehacen fuera de campos de texto.
- Los campos de texto conservan su historial nativo mientras se editan.
- Undo/Redo no modifica zoom, pan ni disposicion de paneles.
- Un comando invalido o concurrente no deja cambios parciales.
- Repetir un `commandId` no duplica una operacion.
- La CLI valida, consulta y previsualiza comandos usando el mismo nucleo que Electron.

## Iteracion 3A: seleccion y contexto estructural

Estado: implementada y pendiente de validacion manual.

Incluye:

- F-041: seleccion transitiva del contenido de un frame.
- F-037: frame raiz ilimitado y frame activo permanente.
- F-049: zoom anclado al centro de la seleccion cuando exista.
- Modelo de seleccion general para nodos, links y frames.
- Parte minima de F-023: tipos permitidos, orden de ciclo y direccion por tipo de diagrama.

Criterios de aceptacion:

- La seleccion representa cualquier combinacion de elementos sin reutilizar el modo de fuentes de links.
- Seleccionar un frame calcula siempre el mismo conjunto de descendientes y links internos.
- Todo comando conoce el frame activo aunque la seleccion actual sea un nodo o link.
- El zoom mantiene centrada la seleccion y conserva el centro del viewport cuando no hay seleccion.
- El frame raiz no impone limites visuales al canvas.
- Goal Tree obtiene sus tipos y orden desde una definicion central.

Antes de 3B se completa la siguiente correccion de modelo.

## Iteracion 3A.4: canvas compuesto y resumen estructural

Estado: implementada como build `3A.4`; pruebas automaticas superadas y pendiente de validacion manual.

Incluye:

- F-055: root global ilimitado y frame anfitrion explicito por arbol.
- F-056: resumen del frame por categorias y tipos.
- Migracion compatible del ejemplo y del workspace manual.
- Conservacion del selector de frame como control del contexto de creacion.

Criterios de aceptacion:

- Root global, frame de arbol y frames internos tienen identidades y responsabilidades distintas.
- El Goal Tree actual aparece dentro de un frame finito propio.
- La jerarquia admite varios frames de arbol sin duplicar el root conceptual.
- Seleccionar el frame del arbol muestra el resumen de Goal, CSF, NC, Assumption, subframes y links internos.
- Los datos actuales migran sin perder nodos, links, posiciones ni frame activo.

Antes de 3B se completa la siguiente iteracion de teclado.

## Iteracion 3A.6: reasignacion de frames con teclado

Estado: implementada como build `3A.6` y validada manualmente el 2026-07-16. La reasignacion logica funciona; la recomposicion espacial posterior queda como primer objetivo de 3B.

Incluye:

- F-057: subir las raices seleccionadas al padre con `Cmd+P`.
- F-057: elegir un frame destino con `Cmd+F` y hints exclusivos de frames.
- Destino sintetico `ROOT`, prevencion de ciclos y una sola operacion de Undo/Redo.
- Separacion estricta entre `Cmd+P/F` estructural y `Ctrl+P/F` de navegacion.

Criterios de aceptacion:

- Una entidad cambia de contenedor sin cambiar de arbol logico ni perder links.
- Un frame viaja con todo su subarbol y no puede entrar en si mismo ni en sus descendientes.
- Una seleccion combinada procesa solo sus raices explicitas, sin duplicar movimientos.
- `Cmd+P` y `Cmd+F` no interfieren con el desplazamiento por `Ctrl+P` y `Ctrl+F`.
- Cada reasignacion completa se deshace y rehace como una sola intencion.

## Iteracion 3B: geometria de frames e insercion incremental

Prioridad inicial: sustituir el layout plano por un layout compuesto que trate `ROOT`, frames hermanos, frames anidados y entidades directas como una sola jerarquia espacial.

### Build 3B.0: layout compuesto

Estado: implementado; pruebas de nucleo, smoke y regresion visual superadas. Pendiente de validacion manual.

Incluye:

- Layout recursivo por contenedor con ELK para relacionar bloques y compactacion direccional dentro de frames operativos.
- Contencion y exclusion verificadas para `ROOT`, frames hermanos, frames anidados y entidades directas.
- Pins de frames conservados como anclas; el contenido puede hacer crecer el contenedor.
- Arrastre colectivo sin colisiones locales y propagacion del crecimiento a los ancestros.
- Rutas ortogonales que evitan entidades y penalizan cruces.
- Transiciones de ida, Undo y Redo para Layout mediante categoria transaccional explicita.

### Build 3B.1: rutas legibles y frames ajustados

Estado: implementado; pendiente de validacion manual.

Incluye:

- Rectas como primera opcion cuando no atraviesan entidades ni cruzan otras rutas.
- Rutas ortogonales reservadas para conflictos que requieren un desvio.
- Puertos coherentes con `Top to Bottom`, `Bottom to Top`, `Left to Right` y `Right to Left`.
- La misma direccion de puertos durante Layout, transiciones y arrastre manual.
- Recalculo del tamano de frames fijados sin mover su posicion.
- Regresion especifica con siete links en `Bottom to Top` y frame anfitrion sobredimensionado.

### Build 3B.2: optimizacion multiarranque de cruces

Estado: implementado; pendiente de validacion manual.

Incluye:

- Nueve candidatos deterministas por frame de diagrama complejo, combinando semillas y colocadores de ELK.
- Variante estricta y variante con jerarquia direccional relajada basada en distancia minima al Goal.
- Seleccion lexicografica por cruces, entidades atravesadas, excepciones direccionales, longitud y area.
- Metricas finales persistidas: cruces, codos, rectas, longitud y excepciones de direccion.
- Regresion del caso de 10 entidades y 11 links: tres capas, cero cruces, cero codos y una excepcion.

### Build 3B.3: caso complejo de Goal Tree

Estado: implementado; regresion visual automatizada superada. Pendiente de validacion manual.

Incluye:

- Fixture versionado de 18 entidades y 21 links basado en el Goal Tree complejo de referencia.
- Tres CSF conectados directamente al Goal y alineados en una capa semantica.
- Estratificacion configurable por diagrama mediante distancia al nodo objetivo.
- Puertos distribuidos cuando varias conexiones comparten un lado de una entidad.
- Puntas de flecha con tamano estable en pantalla al cambiar el zoom.
- Regresion compartida entre validacion de modelo, pruebas de Layout y capturas visuales.
- Resultado de referencia: cero cruces, 20 rutas rectas, dos codos y cero problemas geometricos.

### Build 3B.4: estabilidad del mapa mental

Estado: implementado; pendiente de validacion manual.

Incluye:

- Sustitucion de la prioridad lexicografica por una puntuacion ponderada y explicable.
- Penalizacion de desplazamiento relativo por encima de 120 px.
- Penalizacion de area vacia y baja densidad del diagrama.
- Penalizacion fuerte y cuadratica del enlace mas largo por encima de 480 px.
- Candidato `CURRENT` evaluado junto a todas las variantes ELK.
- Umbral de mejora minima del 15% antes de reemplazar la disposicion actual.
- Estado visible que informa cuando Layout conserva el mapa actual.
- Regresiones para una disposicion estable que debe conservarse y otra dispersa que ELK debe sustituir.

### Build 3B.4.1: borrado inmediato

Estado: implementado.

Incluye:

- Eliminacion completa del dialogo de confirmacion de borrado.
- `Ctrl+D` como tercer binding del comando, junto con `Delete` y `Backspace`.
- Limpieza atomica de dependencias y restauracion completa mediante Undo.
- Proteccion conservada para root y frame principal del arbol.
- Prueba automatizada del atajo, ausencia del modal y borrado en cascada.

### Build 3B.5: frames como unidades de layout

Estado: linea base visual y generador determinista implementados; correccion del motor pendiente.

Incluye:

- Cuatro escenarios reproducibles: sparse `4101`, cross-frame `4102`, nested `4103` y fan-in `4104`.
- Capturas antes/despues con conexiones aleatorias, frames hermanos y frames anidados.
- Metricas de cruces, codos, rectas, longitud, columnas internas, proporcion de frames y problemas geometricos.
- Layout interno de abajo arriba para cada frame.
- Proyeccion del frame calculado como una caja indivisible en el nivel padre.
- Puertos de frontera para recomponer enlaces entre niveles.
- Puntuacion ponderada y umbral de mejora aplicados por contenedor.

Linea base observada en `3B.4`:

- `4101`: 3 cruces, 30 codos y un frame convertido en columna, sin violaciones geometricas.
- `4102`: 22 cruces, 68 codos y dos frames convertidos en columnas, sin violaciones geometricas.
- `4103`: 75 cruces, 72 codos y 22 problemas geometricos con anidacion.
- `4104`: 76 cruces, 82 codos y 21 problemas geometricos con fan-in y anidacion.

Seguimiento de la iteracion:

- F-036: contencion y exclusion geometrica estrictas implementadas en 3B.0.
- F-038: insercion direccional sin alterar la forma existente.
- F-043: rutas simples en 3B.1, optimizacion multiarranque en 3B.2 y caso complejo permanente en 3B.3.
- F-059: fixture complejo, capas semanticas y puntas separadas implementados en 3B.3.
- F-060: puntuacion ponderada, candidato actual y umbral del 15% implementados en 3B.4.
- F-061: linea base aleatoria implementada; composicion jerarquica robusta pendiente en 3B.5.
- F-047: indicacion de direccion pendiente de aplicar.
- F-052: transiciones animadas de Layout, Undo y Redo implementadas en 3B.0.
- F-057: recolocacion espacial dentro del frame destino implementada en 3B.0.
- F-058: contencion geometrica del arrastre colectivo implementada en 3B.0.
- F-035: garantias espaciales al mover entidades entre frames implementadas en 3B.0.
- Layout compuesto por frames y soporte de frames anidados implementado en 3B.0.

Criterios de aceptacion:

- Todas las operaciones mantienen las invariantes de pertenencia y contencion.
- `N` coloca segun la direccion del diagrama sin solapar ni ejecutar Layout global.
- Los frames se amplian y los grupos vecinos se trasladan rigidamente cuando falta espacio.
- El auto-layout completo usa los frames como contenedores, no como limites calculados a posteriori.
- Los tests verifican contencion, exclusion y preservacion de distancias relativas.
- Las rutas no atraviesan entidades y minimizan cruces dentro de las restricciones del diagrama.
- Cambiar la direccion deja claro que Layout debe ejecutarse y limpia el estado al completarse.
- Undo/Redo de Layout y otras operaciones espaciales reutiliza la animacion sin crear nuevas entradas de historial.
- El selector de destino muestra solo frames validos, incluido el root, y nunca permite ciclos.

### Build 3C.0: frames minimizados como entidades compuestas

Estado: implementado y validado automaticamente y visualmente.

Incluye:

- Estado persistente `collapsed` independiente del motor de layout.
- Caja compacta estable que participa en el layout del frame padre como una entidad.
- Ocultacion de nodos, frames y links internos sin eliminarlos del modelo.
- Proyeccion de links externos sobre el borde del frame compacto.
- Restauracion de posiciones relativas, ajuste de limites y recalculo de rutas al expandir.
- Minimizacion y expansion desde el inspector o con `-`.
- Undo y Redo animados como una unica operacion espacial.
- Canvas, minimapa, hints, seleccion y centrado basados en la misma proyeccion visible.

Evidencia:

- Regresion algoritmica de ida y vuelta sobre la fixture estable.
- Bateria visual `3C.0` con 34 escenarios en estado `PASS`.
- Capturas especificas de minimizar, Undo, Redo y expandir en `outputs/test-evidence/3C.0`.

### Build 3C.1: layout interno de cada frame

Estado: implementado y validado automaticamente y visualmente.

Incluye:

- Eliminacion del postprocesado que forzaba los contenedores a una sola columna.
- Variantes ELK y umbral de estabilidad aplicados tambien a frames internos conectados.
- Cuadricula compacta determinista para entidades sin conexiones internas.
- Recalculo ascendente cuando cambia el tamano de un frame hijo.
- Rechazo del candidato `CURRENT` si las nuevas cajas ya se solapan.

Evidencia:

- Regresiones con tres entidades desconectadas y con fan-in interno.
- Los escenarios aleatorios `4101` a `4104` terminan con cero problemas geometricos.
- Bateria visual `3C.1` con 35 escenarios en estado `PASS`.
- Captura `27-internal-frame-layout.png`: dos columnas, dos filas y contencion completa.

### Build 3C.2: alternar frame con Cmd+X

Estado: implementado.

Incluye:

- `Cmd+X` en macOS y `Ctrl+X` en otros sistemas para minimizar o expandir el frame seleccionado.
- `-` se conserva como atajo alternativo.
- Los campos de texto mantienen el comportamiento nativo de cortar.
- La regresion visual de minimizar y expandir usa el nuevo atajo principal.

### Build 3C.3: destinos de frame tras seleccion multiple

Estado: implementado y validado automaticamente y visualmente.

Incluye:

- Separacion entre el frame activo usado como contexto y las raices seleccionadas para mover.
- Eliminacion del frame provisional cuando `M` comienza a acumular entidades.
- Conservacion de la proteccion contra mover un frame dentro de si mismo o de sus descendientes.
- Regresion funcional del estado ambiguo y captura visual con todos los destinos validos etiquetados.

Evidencia:

- Smoke test con dos entidades seleccionadas y el antiguo frame de contexto disponible como destino.
- Bateria visual `3C.3` con 36 escenarios en estado `PASS`.
- Captura `28-multi-entity-frame-targets.png`: Root, Goal Tree y el frame de contexto muestran hints `A`, `B` y `C`.

### Build 3C.4: capas estrictas y ciclos

Estado: implementado y validado automaticamente y visualmente.

Incluye:

- Eliminacion de inversiones de enlaces aciclicos usadas anteriormente para ahorrar capas.
- Ranking por camino mas largo que garantiza avance estricto de cada arista del DAG.
- Ruptura determinista de ciclos mediante `greedyFeedbackArc`, declarada en el registro del diagrama.
- Restauracion de los links semanticos despues de calcular posiciones.
- Rechazo de `CURRENT` por inviabilidad aunque ELK no supere el margen de mejora del 15%.
- Metricas `cycleBreaks`, `cycleBreakEdgeIds` y `forcedByDirection` para diagnostico.

Evidencia:

- El workspace que contenia `MIRARLO` termina con `0 directionExceptions` y `0 cycleBreaks`.
- Una regresion aciclica con atajo usa cuatro capas sin invertir relaciones.
- Una regresion ciclica de tres nodos conserva los tres links y registra una sola ruptura temporal.
- Bateria visual `3C.4` con 37 escenarios en estado `PASS`.
- Captura `29-cycle-breaking.png`: una unica excepcion visible y necesaria dentro del ciclo.

### Build 3C.5: representacion curva de links

Estado: implementado y validado automaticamente y visualmente.

Incluye:

- Selector persistente `Curved / Orthogonal` en la barra superior.
- `CURVED` como estilo inicial declarativo de Goal Tree.
- Bezier cubico para enlaces directos con salida y llegada perpendiculares.
- Redondeo cuadratico de rutas con obstaculos, conservando el corredor calculado.
- Curvas actualizadas durante Layout, Undo y Redo.
- Comparacion sin recalcular posiciones ni alterar links.

Evidencia:

- Smoke test verifica selector, comandos SVG curvos, modo ortogonal y transiciones.
- El caso complejo renderiza 21 curvas, evita todas las entidades y conserva tres llegadas distintas al Goal.
- Bateria visual `3C.5` con 37 escenarios en estado `PASS`.
- Captura `26-readable-routing.png`: Goal Tree complejo completo en modo `Curved`.

### Build 3C.6: puertos y capas adaptativos

Estado: implementado y validado automaticamente y visualmente.

Incluye:

- Tramos terminales rectos que permanecen visibles antes de la punta a cualquier zoom.
- Puertos proyectados hacia el otro extremo y distribuidos con orden y separacion minima.
- Variantes compactas y ampliadas de separacion transversal dentro de las capas ELK.
- Evaluacion de candidatos con los puertos reales sobre las caras preferentes.
- Ajuste automatico del frame al espacio utilizado por la variante ganadora.

Evidencia:

- La prueba geometrica verifica tres llegadas ordenadas y distintas al Goal.
- La prueba visual mide 14 px rectos y perpendiculares en salida y llegada.
- El caso complejo conserva 19 rutas rectas, cero cruces independientes y cero invasiones de entidades.
- Bateria visual `3C.6` con 37 escenarios en estado `PASS`.
- Captura `26-readable-routing.png`: puertos distribuidos y curvas enderezadas antes de cada punta.

### Build 3C.7: ciclo colectivo de Types

Estado: implementado y validado automaticamente.

Incluye:

- Binding declarativo `Shift+Tab` visible en el panel Keyboard.
- Avance individual desde el Type actual.
- Reinicio y recorrido sincronizado para selecciones multiples.
- Filtrado de Types `unique` incompatibles.
- Comando atomico `nodes.update-type` compartible con futuras interfaces headless.
- Undo y Redo del grupo como una sola operacion.

Evidencia:

- Prueba de nucleo para cambio multiple, Undo y rechazo de varios Goals.
- Smoke test de Electron verifica avance individual, reinicio, avance, ciclo y Undo atomico.

### Build 3C.8: insercion legible con N

Estado: implementado y validado automaticamente.

Incluye:

- Sustitucion del desplazamiento diagonal de 18 unidades por una cuadricula adaptada al viewport.
- Colision calculada con las cajas completas de las entidades.
- Margen funcional de 44 unidades para cajas y hints.
- Ampliacion recursiva de frames para mantener contencion.
- Insercion incremental sin ejecutar Layout ni mover entidades existentes.

Evidencia:

- Smoke test crea cuatro entidades consecutivas dentro del mismo contexto.
- Las cuatro conservan separacion de cajas y sus cuatro hints son simultaneamente legibles.

### Build 3C.9: seleccion de alto contraste

Estado: implementado y validado automaticamente.

Incluye:

- Color azul reservado para la seleccion principal de entidades, frames y links.
- Borde, fondo y halo redundantes para entidades seleccionadas.
- Diferenciacion entre seleccion principal e inclusion colectiva.
- Trazo de link seleccionado estable con zoom y punta ampliada.
- Control central del link seleccionado visible aunque `H` este desactivado.

Evidencia:

- Smoke test verifica borde, fondo y sombra de una entidad seleccionada.
- Smoke test verifica trazo de 5 px y control central visible en un link seleccionado.
- Bateria visual `3C.9` con 37 escenarios en estado `PASS`.

### Build 3C.10: resaltado de seleccion multiple explicita

Estado: implementado y validado automaticamente.

Incluye:

- Separacion entre el ultimo elemento activo y las raices explicitas de la seleccion.
- Resaltado azul simultaneo de todas las entidades, frames y links elegidos con `M` o seleccion aditiva.
- Indicacion dorada limitada a descendientes y links incorporados automaticamente.
- Misma semantica visual para seleccion por teclado y raton.

Evidencia:

- Smoke test verifica que dos entidades explicitas poseen `selected` y no `selection-included`.
- Captura `20-multi-selected.png` comprueba tres entidades resaltadas simultaneamente al 35%.
- Bateria visual `3C.10` con 37 escenarios en estado `PASS`.

### Build 3C.11: auditoria completa de teclado

Estado: implementado y validado automaticamente y por inspeccion visual.

Incluye:

- Suite derivada del registro con 34 comandos y 43 bindings.
- Workspace aislado, asercion semantica, PNG e informe por binding.
- Paleta de comandos funcional para `Cmd+K`.
- Creacion relacional completa con `A` y `Shift+A`.
- Colocacion adyacente sin solapes, dentro del viewport y sin invadir frames hermanos.
- Log de diagnostico con falsos positivos, causas y correcciones.

Evidencia:

- Auditoria de atajos `43/43 PASS` en macOS.
- Bateria general del prototipo en estado `PASS`.
- Bateria visual general `37/37 PASS`.
- Informes locales en `outputs/shortcut-audit/3C.11/` y `outputs/test-evidence/3C.11/`.

### Build 3C.12: prioridad contextual de hints

Estado: implementado y validado automaticamente y por inspeccion visual.

Incluye:

- Letras sin modificadores reservadas para hints mientras la seleccion multiple esta activa.
- `Enter` como finalizacion explicita que conserva la seleccion.
- `Esc` para limpiar primero una secuencia parcial y despues cancelar el modo.
- `Ctrl+G` para cancelar y limpiar el conjunto.
- Alfabeto completo disponible en seleccion multiple, incluidas `M`, `L` y `H`.

Evidencia:

- Smoke test con un hint sintetico `AM` en estado `PASS`.
- Auditoria completa `43/43 PASS`, con captura especifica de dos entidades seleccionadas.
- Regresion visual general `37/37 PASS`; el escenario 21 finaliza con `Enter` y el 25 conecta el grupo con `L`.

### 3C.13: arquitectura semantica multi-diagrama

Estado: investigacion y assessment completados; implementacion pendiente.

Motivo: CRT, FRT, EC, PrT y TrT no son variaciones cosmeticas de Goal Tree. Combinan logica de causa suficiente o condicion necesaria, relaciones `AND/OR`, ciclos, topologias canonicas, assumptions e injections. Las operaciones colectivas y headless no deben consolidarse sobre un modelo exclusivamente binario.

Incluye:

- Schema `0.3` basado en `diagrams`, `elements`, relaciones n-arias y `derivations` entre artefactos.
- Junctions como proyeccion visual de relaciones, no como afirmaciones ficticias.
- Registro con Types, atributos, relaciones, aridad, roles, reglas, acciones y layout por diagrama.
- Definiciones oficiales cargadas como datos mediante el mismo mecanismo que las definiciones del usuario.
- Compilador `Diagram -> LayoutGraph` que conserva un unico backend ELK layered.
- Validacion comun, validacion especifica y CLR progresiva.
- Migracion reversible del Goal Tree actual.

Criterios de aceptacion:

- Goal Tree `0.2` migra sin perder IDs, frames, posiciones, links, assumptions ni historial funcional.
- Un fixture CRT representa causas independientes, una junction `AND` y un loop sin trucos en los Types.
- Un fixture EC valida la topologia A-B-C-D-D', conflicto, assumptions e injection.
- Un fixture FRT representa injection, DE, precondition y negative branch.
- Copiar, borrar, Undo/Redo y CLI operan sobre relaciones n-arias de forma atomica.
- ELK recibe exclusivamente el grafo neutral compilado y no contiene condicionales de dominio.
- Goal Tree puede exportarse, volver a importarse y ejecutarse sin depender de una definicion hardcodeada.
- El assessment detallado queda en `outputs/Diagram-Architecture-Assessment.md`.

### 3C.13.1: gates de cierre 5-hats

Estado: revision completada; gates pendientes de ejecucion.

Antes de estabilizar el schema publico se cierran estos contratos:

- Glosario semantico ejecutable para necesidad, suficiencia, `AND` conceptual,
  causas adicionales `OR`, `MAG`, `XOR`, conflicto, assumptions y ruptura
  temporal de ciclos.
- Regla implicita por `logicMode`: entradas directas `OR` en suficiencia y `AND`
  en necesidad; un junctor solo agrupa o sobrescribe esa combinacion.
- Fixtures-oraculo de Goal Tree, CRT, EC y FRT con verbalizaciones, errores duros
  y advertencias metodologicas esperadas.
- Microfixtures de conformidad para `MAG` y `XOR`, incluida su notacion visual.
- Separacion explicita entre definicion, instancia semantica, layout, view state
  y estado efimero.
- Migracion aditiva y reversible desde `0.2`, con corpus de workspaces reales.
- Semantica atomica de seleccion, borrar, copiar/pegar y Undo para relaciones
  n-arias y junctions derivadas.
- Politica de version, serializacion canonica, hash, migradores y modo rescate.
- Threat model del loader: sin codigo arbitrario, rutas confinadas, schema y
  limites de tamano, profundidad y complejidad.
- Presupuestos medibles de apertura, validacion, layout y preview.

Gate: el contrato permanece interno hasta que Goal Tree conserve paridad, CRT
funcione de extremo a extremo sin ramas de dominio en operaciones comunes y un
spike de EC no obligue a cambiar la forma base del kernel.

### 3C.14: kernel semantico y prueba vertical CRT

Estado: planificado despues de 3C.13 y antes de copiar/pegar subgrafos.

Incluye:

- Migracion de schema y repositorio.
- Comandos genericos para elementos, relaciones y assumptions.
- Validadores declarativos y projection adapter.
- Render y edicion de junctions.
- Fixture CRT pequeno probado en nucleo, CLI, layout y captura visual.
- Goal Tree y CRT cargados desde paquetes declarativos versionados.

Gate: no se inicia la implementacion completa de EC/FRT hasta que Goal Tree y CRT compartan el mismo kernel sin ramas especificas en las operaciones comunes.

Subgates:

- `3C.14a`: kernel interno y migracion aditiva con paridad de Goal Tree.
- `3C.14b`: CRT vertical en core, CLI, renderer, teclado y layout.
- `3C.14c`: spike de EC para validar topologia, roles y assumptions antes de
  publicar el formato. Si exige cambiar el kernel, se repiten las pruebas de
  Goal Tree y CRT.

### 3C.15: formato de definicion y herramientas headless

Estado: planificado despues de la paridad Goal Tree, la vertical CRT, el spike
EC y las operaciones colectivas n-arias; antes del Diagram Studio visual.

Incluye:

- `diagram-definition.json` con version, capacidades requeridas, Types, relaciones, reglas, recetas, layout y presentacion.
- Loader unico para definiciones oficiales, personales y embebidas en un workspace.
- Pin de version, hash y snapshot para reproducibilidad.
- DSL declarativo sin JavaScript arbitrario.
- CLI para crear, validar, inspeccionar, probar y empaquetar definiciones.
- Fixture minimo creado sin editar el codigo fuente.
- Serializacion canonica, versiones inmutables y migradores versionados.
- Apertura read-only de rescate cuando una definicion falta o es incompatible.
- Limites de recursos, confinamiento de rutas y diagnosticos seguros para
  paquetes importados.

Criterios de aceptacion:

- Exportar e importar la definicion oficial de Goal Tree no cambia comportamiento ni datos.
- Una definicion nueva puede crearse y abrirse sin recompilar la aplicacion.
- Una definicion invalida produce errores localizados y no corrompe el workspace.
- Cambiar una definicion publicada crea una nueva version; las instancias existentes siguen fijadas a la anterior.
- CLI y aplicacion producen el mismo resultado de validacion y compilacion.
- El hash de una definicion es reproducible entre CLI y aplicacion.
- Una instancia puede previsualizar, aplicar y revertir una migracion de
  definicion sin perder datos.
- Un paquete invalido no impide abrir el workspace en modo seguro.

## Iteracion 3C: operaciones sobre selecciones

Incluye:

- F-039: borrado atomico con `Ctrl+D`.
- F-040: copia y pegado de subgrafos con `Ctrl+C` y `Ctrl+V`.
- F-042: ciclo de tipos con `Shift+Tab`.
- F-054: seleccion por rectangulo con el raton.
- F-019: archivo de atajos editable, ambitos y deteccion de colisiones.

Criterios de aceptacion:

- Todas las operaciones usan el mismo conjunto de seleccion general.
- Copiar y pegar remapea identificadores y conserva solo relaciones internas.
- Borrar presenta un impacto agregado y mantiene protegido el frame raiz.
- Cambiar tipos respeta la definicion y restricciones del diagrama.
- Ningun atajo interfiere con la edicion de texto.
- Una configuracion invalida informa de colisiones y conserva un keymap recuperable.
- Una seleccion parcial de una relacion n-aria tiene un cierre documentado y el
  mismo resultado en UI, CLI, copiar, borrar y Undo.

## Iteracion 3D: frames jerarquicos

Esta iteracion usa una misma infraestructura de proyeccion para representar conexiones cuyo otro extremo esta oculto por minimizacion o por foco.

### 3D.1: jerarquia y navegacion de foco

Incluye:

- F-017: arbol de frames, breadcrumbs y navegacion padre/hijo.
- F-016: vista enfocada de un frame como estado temporal de navegacion.

Criterios de aceptacion:

- Entrar en foco dedica el canvas al frame y conserva inspector, hints y minimapa.
- Breadcrumbs permiten subir o salir sin perder el contexto exterior.
- Zoom y pan de la vista general se restauran al cerrar el foco.

### 3D.2: minimizacion y portales de conexion

Incluye:

- F-015: frame minimizado como resumen persistente, implementado en `3C.0`.
- Portales de borde compartidos por frames minimizados y vistas de foco; la proyeccion basica esta implementada y queda pendiente agrupar e inspeccionar multiples conexiones.

Criterios de aceptacion:

- Minimizar oculta detalle interno y conserva conexiones externas visibles.
- Las conexiones agrupadas muestran su cantidad y pueden inspeccionarse.
- Expandir restaura las posiciones relativas, reajusta el limite para contenerlas y recalcula las rutas.
- Los portales distinguen claramente el destino externo de una entidad visible.

### 3D.3: trabajo con entidades externas

Incluye:

- F-046: busqueda, previsualizacion y conexion con entidades externas desde el foco.
- Panel secundario limitado al contenido exterior del frame activo.

Criterios de aceptacion:

- Se puede encontrar una entidad externa sin salir del foco.
- La previsualizacion no cambia el viewport ni el frame activo.
- Crear un link interior-exterior funciona con raton, teclado y hints.
- El link se representa como portal dentro del foco y como ruta normal en la vista general.

## Iteracion 4: layout

Incluye:

- Refinamiento de posiciones fijadas, espaciado y rutas de links.
- Optimizacion de cruces despues de consolidar el layout compuesto en 3B.
- Los fundamentos F-021 y F-022 ya entregados en la iteracion 2.2.

## Iteracion 5: Diagram Studio y diagramas oficiales

Incluye:

- Modo visual para crear, bifurcar, probar y versionar definiciones sin escribir codigo.
- Edicion de Types, atributos, relaciones, topologia, reglas, acciones, layout y presentacion.
- Preview vivo sobre fixtures y diagnostico de errores o capacidades ausentes.
- Biblioteca de definiciones oficiales, personales y del workspace.
- Implementacion de paquetes completos sobre el kernel y formato entregados en 3C.14/3C.15.
- FRT como siguiente paquete oficial y flujo trazable despues de las verticales
  Goal Tree, CRT y EC usadas para estabilizar el formato.
- PrT y TrT como validacion de condicion necesaria y pasos compuestos.
- Personalizacion de combinaciones de teclas sobre el registro interno de comandos.

Gate de entrada:

- Goal Tree, CRT y EC se cargan por el mismo contrato sin codigo privilegiado.
- El formato ha sobrevivido al menos una migracion de definicion ida/vuelta.
- Las operaciones colectivas, Undo/Redo y CLI cubren relaciones n-arias.
- Existen diagnosticos, limites de recursos y modo rescate para definiciones
  invalidas o ausentes.

Criterios de aceptacion:

- El Studio genera exactamente el mismo formato que consume la CLI.
- Crear un tipo de diagrama sencillo no requiere modificar ni recompilar LTP Workbench.
- Las definiciones oficiales no tienen privilegios tecnicos sobre las personales.
- El usuario puede hacer fork de una definicion oficial sin modificar el original.
- Las instancias declaran y conservan la version exacta de su definicion.

## Dependencias principales

- Estado de vista -> preservar scroll -> zoom/pan -> minimapa.
- Registro de comandos -> teclado estable -> atajos configurables.
- Seleccion general -> cierre de frame -> copiar/borrar/cambiar tipo.
- Frame activo -> raiz ilimitada -> insercion incremental -> layout compuesto.
- Contencion de frames -> vista enfocada -> colapso -> rutas externas.
- Assessment multi-diagrama -> fixtures-oraculo -> kernel interno y migracion
  aditiva -> paridad Goal Tree -> CRT vertical -> spike EC -> operaciones
  colectivas n-arias -> formato declarativo y CLI -> FRT y trazabilidad ->
  Diagram Studio -> PrT/TrT.
