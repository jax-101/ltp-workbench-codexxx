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

## Iteracion 3B: geometria de frames e insercion incremental

Incluye:

- F-036: contencion y exclusion geometrica estrictas.
- F-038: insercion direccional sin alterar la forma existente.
- F-043: rutas de links con minimizacion de cruces y evitacion de obstaculos.
- F-047: indicacion de direccion pendiente de aplicar.
- F-052: transiciones animadas al deshacer y rehacer operaciones espaciales.
- F-057: mover seleccion al padre con `Cmd+P` o a un frame elegido con `Cmd+F`.
- Completar F-035 con garantias espaciales al mover entidades entre frames.
- Layout compuesto por frames y soporte de frames anidados.

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

- F-015: frame minimizado como resumen persistente.
- Portales de borde compartidos por frames minimizados y vistas de foco.

Criterios de aceptacion:

- Minimizar oculta detalle interno y conserva conexiones externas visibles.
- Las conexiones agrupadas muestran su cantidad y pueden inspeccionarse.
- Expandir restaura exactamente la geometria anterior.
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

## Iteracion 5: diagramas extensibles

Incluye:

- F-023: registro declarativo de tipos de diagrama.
- Configuracion de tipos de nodo, atributos, links permitidos, logica, verbalizacion, validaciones y layout.
- Personalizacion de combinaciones de teclas sobre el registro interno de comandos.
- Goal Tree como primera definicion; CRT y EC como siguientes validaciones de la infraestructura.

## Dependencias principales

- Estado de vista -> preservar scroll -> zoom/pan -> minimapa.
- Registro de comandos -> teclado estable -> atajos configurables.
- Seleccion general -> cierre de frame -> copiar/borrar/cambiar tipo.
- Frame activo -> raiz ilimitada -> insercion incremental -> layout compuesto.
- Contencion de frames -> vista enfocada -> colapso -> rutas externas.
- Registro minimo de diagramas -> ciclo de tipos -> registro completo -> CRT/EC.
