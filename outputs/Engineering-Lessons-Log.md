# Engineering Lessons Log

## Proposito

Este documento captura aprendizajes reutilizables encontrados durante el desarrollo de LTP Workbench. No es un changelog ni un registro de decisiones del producto:

- `Feedback-Log.md` conserva necesidades y observaciones del usuario.
- `Decision-Log.md` conserva decisiones concretas del proyecto.
- Este log extrae principios aplicables a futuros productos de software.

## Regla de mantenimiento

Anadir una entrada cuando ocurra alguno de estos casos:

- una prueba o validacion revele una suposicion equivocada;
- una correccion local exponga un problema arquitectonico mas general;
- una decision reduzca riesgos para varias funcionalidades futuras;
- aparezca una tecnica que convenga reutilizar en otros proyectos;
- un intento falle de una forma que merezca no repetirse.

Cada entrada debe incluir evidencia, aprendizaje y aplicacion futura. No registrar detalles rutinarios ni repetir una nota de version.

## Retrospectiva consolidada: 2026-07-13 a 2026-07-15

### L-001: Recoger feedback sin estructurarlo prematuramente

Evidencia: las primeras observaciones se recogieron como una lista abierta y solo se agruparon cuando el usuario indico que estaban completas.

Aprendizaje: estructurar demasiado pronto puede imponer categorias antes de comprender el problema. Conviene separar una fase de captura fiel de otra de sintesis y priorizacion.

Aplicacion futura: mantener un inbox de feedback, confirmar el cierre de la captura y despues convertirlo en requisitos, dependencias e iteraciones.

### L-002: La validacion manual descubre semantica que los tests numericos no ven

Evidencia: el rectangulo del minimapa llego a cambiar numericamente con el zoom, pero seguia sin comunicar correctamente la proporcion visible. Fueron necesarias varias validaciones visuales para formular F-048.

Aprendizaje: un valor correcto no garantiza una representacion correcta. Las interfaces espaciales deben probarse por el significado que transmiten, no solo por cambios de coordenadas.

Aplicacion futura: combinar aserciones geometricas con pruebas manuales o capturas visuales que respondan preguntas perceptuales concretas.

### L-003: Integrar en `main` solo hitos validados reduce el coste de rectificacion

Evidencia: cada serie se trabajo en una rama, se probo manualmente y solo la serie 2.x validada avanzo a `main`.

Aprendizaje: una rama por iteracion crea un punto de control comprensible y evita que una validacion tardia contamine la linea estable.

Aplicacion futura: definir criterios de aceptacion antes de implementar, publicar la rama de prueba y promoverla solo tras una validacion explicita.

### L-004: Los modos de teclado necesitan un modelo de estados explicito

Evidencia: hints, edicion, conexion, seleccion multiple, preview y borrado compiten por las mismas teclas. Los fallos iniciales de hints de dos letras y de `H` mostraron ambiguedades entre comandos y secuencias.

Aprendizaje: una interfaz keyboard-first no es una coleccion de listeners. Es una maquina de estados con prioridades, teclas reservadas y reglas de entrada/salida.

Aplicacion futura: documentar modos, transiciones y precedencia; reservar el namespace de comandos; generar secuencias prefix-free; probar conflictos entre modos.

### L-005: Una unica fuente de verdad debe alimentar ejecucion y ayuda

Evidencia: el listado completo de atajos se genero desde el mismo mapa de comandos que usa el teclado.

Aprendizaje: la documentacion de interfaz mantenida a mano se desincroniza. La configuracion ejecutable debe producir etiquetas, ayuda, tests y futuras opciones de personalizacion.

Aplicacion futura: modelar cada comando con ID, descripcion, bindings, disponibilidad y handler; derivar de ahi menus, tooltips y paneles de ayuda.

### L-006: Las acciones no relacionadas no deben destruir el contexto espacial

Evidencia: seleccionar, usar hints o cambiar zoom llevaba inicialmente la vista al origen. Se decidio preservar viewport y, cuando exista seleccion, anclar el zoom a ella.

Aprendizaje: perder la zona de trabajo es una ruptura de contexto, aunque la accion principal funcione. La estabilidad espacial forma parte de la correccion funcional.

Aplicacion futura: toda operacion que renderice debe declarar si conserva, centra o sustituye el viewport; probarlo con el usuario situado lejos del origen.

### L-007: Las visualizaciones necesitan una transformacion compartida

Evidencia: contenido, viewport y navegacion del minimapa usaron formulas distintas y divergieron con zoom y paneles. La correccion final aplico un unico dominio y una unica transformacion.

Aprendizaje: si varias capas representan el mismo espacio, todas deben usar la misma funcion de coordenadas, escala y origen.

Aplicacion futura: encapsular transformaciones `world <-> screen <-> overview`; no recalcular proporciones independientemente en cada componente.

### L-008: El dominio de una vista general debe incluir contenido y viewport

Evidencia: al alejar mas que el tamano del diagrama, escalar el minimapa solo contra el contenido lo mantenia artificialmente grande.

Aprendizaje: una vista general representa la union de lo existente y lo visible. Si el viewport supera al contenido, tambien forma parte del dominio espacial.

Aplicacion futura: calcular limites como union de contenido, viewport y margenes relevantes antes de determinar la escala del minimapa.

### L-009: Estado semantico, estado de vista y estado efimero son categorias distintas

Evidencia: Undo/Redo debia restaurar entidades y layout sin modificar zoom, pan, paneles, hints o buffers de teclado.

Aprendizaje: persistir datos juntos no significa que compartan ciclo de vida. Mezclarlos en una misma historia produce saltos y efectos secundarios sorprendentes.

Aplicacion futura: clasificar cada campo por propiedad y duracion; definir persistencia, historial y sincronizacion por categoria.

### L-010: Los paneles temporales deben restaurar la eleccion previa del usuario

Evidencia: editar abre el inspector si estaba cerrado, pero al confirmar debe volver exactamente a su estado anterior.

Aprendizaje: una necesidad temporal no debe convertirse silenciosamente en una preferencia permanente.

Aplicacion futura: guardar el estado previo al entrar en un flujo modal o asistido y restaurarlo al confirmar o cancelar.

### L-011: La animacion funcional explica causalidad

Revision: 2026-07-15.

Evidencia: la transicion de Layout se considero necesaria para entender como se recolocaban nodos, frames y flechas. La validacion de Undo/Redo mostro que la misma continuidad se espera al recorrer el cambio en sentido inverso o volver a aplicarlo.

Aprendizaje: animar no es solo decorar. En operaciones espaciales, la continuidad visual permite relacionar estado anterior y posterior.

Aplicacion futura: animar la transformacion completa, incluidas dependencias como links, tanto al ejecutar como al recorrer el historial; etiquetar transacciones espaciales explicitamente; respetar `prefers-reduced-motion`; mantener un resultado final determinista.

### L-012: Separar insercion incremental y reorganizacion global

Evidencia: crear con `N` debe preservar la forma existente, mientras que Layout puede reorganizar explicitamente todo el diagrama.

Aprendizaje: una herramienta de pensamiento necesita estabilidad local. Aplicar auto-layout global en cada insercion destruye memoria espacial y control.

Aplicacion futura: ofrecer colocacion incremental para edicion cotidiana y una accion global separada, visible y reversible.

### L-013: Los contenedores visuales deben modelarse como estructura, no decoracion

Evidencia: frames implican pertenencia, jerarquia, seleccion transitiva, minimizacion, foco, portales y reglas estrictas de contencion.

Aprendizaje: cuando un rectangulo afecta operaciones y significado, es una entidad compuesta del dominio. Tratarlo como adorno acumula excepciones geometricas.

Aplicacion futura: definir primero invariantes de pertenencia y jerarquia; derivar seleccion, layout, copy/paste y renderizado desde el mismo modelo.

### L-014: Los links son objetos de primer nivel

Evidencia: borrar nodos exige limpiar links y assumptions; minimizar frames requiere portales; el layout necesita rutas que eviten obstaculos.

Aprendizaje: una relacion con atributos, validacion o interaccion no debe reducirse a una linea dibujada.

Aplicacion futura: dar identidad y ciclo de vida propios a las relaciones; validar referencias; separar significado logico de ruta visual.

### L-015: La configuracion declarativa desbloquea extensibilidad real

Evidencia: direccion, tipos permitidos y orden de `Shift+Tab` varian por tipo de diagrama y no deben quedar hardcodeados para Goal Tree.

Aprendizaje: una herramienta extensible necesita definiciones de dominio centrales antes de multiplicar condicionales en la UI.

Aplicacion futura: crear un registro versionado de tipos, atributos, reglas, direccion y comandos antes de incorporar nuevos artefactos.

### L-016: Undo/Redo debe introducirse antes de multiplicar mutaciones compuestas

Evidencia: seleccion multiple, borrar en cascada, copy/paste, mover frames y Layout iban a incrementar rapidamente los puntos de mutacion.

Aprendizaje: anadir historial despues obliga a inventar inversas fragiles para codigo disperso. La transaccion debe ser la puerta de entrada antes de ampliar operaciones.

Aplicacion futura: centralizar comandos y limites transaccionales al comienzo de la fase de edicion rica, no al final del producto.

### L-017: Los parches inversos son mas fiables que inversas manuales

Evidencia: Immer genera automaticamente parches directos e inversos incluso para reemplazos compatibles y borrados complejos.

Aprendizaje: escribir `undoDeleteFrame`, `undoMoveNode`, etc. duplica reglas y suele olvidar relaciones dependientes.

Aplicacion futura: ejecutar la intencion sobre un draft aislado, validar el resultado y almacenar los parches; reservar comandos inversos manuales para efectos externos no reversibles.

### L-018: Las carreras de persistencia aparecen en integracion, no en tests aislados

Evidencia: el primer smoke transaccional descubrio un conflicto entre guardado diferido de ViewState y una edicion semantica. Los tests puros del motor pasaban.

Aprendizaje: un motor correcto puede fallar al conectarse con timers, IPC y renders. Las escrituras asincronas necesitan orden total y snapshots de la intencion.

Aplicacion futura: serializar operaciones del cliente, capturar snapshots en el limite de la accion y probar deliberadamente timers solapados con comandos.

### L-019: Validar antes de commit convierte invariantes en garantias

Evidencia: el nucleo rechaza referencias rotas, pertenencia inconsistente, IDs duplicados y ciclos de frames antes de escribir.

Aprendizaje: corregir datos despues de guardarlos es mas caro que impedir estados imposibles. La validacion debe vivir en el nucleo, no solo en formularios.

Aplicacion futura: validar el agregado completo al final de cada transaccion y devolver errores estructurados con codigo y ruta.

### L-020: Headless debe ser un adaptador del producto, no una segunda implementacion

Evidencia: Electron y la CLI comparten registro de comandos, validador, motor transaccional y repositorio.

Aprendizaje: automatizar clics o duplicar reglas en scripts crea dos productos con garantias distintas.

Aplicacion futura: construir un nucleo sin DOM y conectar UI, CLI, API o MCP como adaptadores finos del mismo servicio.

### L-021: Los agentes necesitan contratos mas estrictos que los humanos

Evidencia: la CLI usa JSON, IDs estables, `commandId`, `expectedRevision`, `--dry-run` y errores con codigos.

Aprendizaje: un agente reintenta, opera con contexto parcial y puede actuar sobre datos obsoletos. Los prompts no sustituyen garantias de sistema.

Aplicacion futura: separar consultas y escrituras; exigir precondiciones; ofrecer preview/diff; hacer reintentos idempotentes; evitar selecciones ambiguas por nombre.

### L-022: Concurrencia segura requiere varias defensas coordinadas

Evidencia: revision optimista, bloqueo de archivo, segunda comprobacion bajo lock y sustitucion atomica se implementaron como capas complementarias.

Aprendizaje: un mutex en memoria no protege procesos distintos; un lock sin revision puede guardar una decision obsoleta; una revision sin escritura atomica no evita corrupcion.

Aplicacion futura: combinar compare-and-swap semantico, exclusion durante commit y escritura durable; probar dos escritores partiendo de la misma revision.

### L-023: Una migracion gradual necesita una capa de compatibilidad explicita

Evidencia: `node.update` ya es granular, mientras que mutaciones antiguas entran temporalmente como `workspace.replace` transaccional.

Aprendizaje: reescribir todo de una vez aumenta riesgo. Una frontera compatible permite obtener garantias pronto y migrar caso por caso.

Aplicacion futura: aplicar un patron strangler, medir que rutas siguen siendo legacy y retirarlas de forma planificada; no dejar la compatibilidad como arquitectura permanente.

### L-024: Pruebas automaticas y validacion humana cubren riesgos diferentes

Evidencia: tests de nucleo cubren rollback, idempotencia y concurrencia; smoke cubre IPC y UI; el usuario valida ergonomia y significado visual.

Aprendizaje: ninguna capa sustituye a las demas. La automatizacion garantiza propiedades repetibles; la validacion humana juzga comprension y flujo.

Aplicacion futura: mantener piramide de tests de dominio, integracion y smoke, seguida de una guia manual breve centrada en experiencia.

### L-025: Los entornos de prueba deben estar aislados de datos reales

Evidencia: smoke y prueba manual usan workspaces separados; los documentos fuente y PDFs permanecen fuera de Git mediante `.gitignore`.

Aprendizaje: probar sobre datos de usuario o publicar material fuente por accidente convierte una validacion tecnica en un riesgo operativo.

Aplicacion futura: usar rutas de datos distintas por entorno, fixtures reiniciables y reglas de publicacion conservadoras por defecto.

### L-026: Documentar con honestidad lo implementado y lo previsto

Evidencia: la arquitectura headless distingue el nucleo actual de batch transactions, auditoria duradera, permisos y MCP futuros.

Aprendizaje: una buena arquitectura no equivale a todas sus garantias futuras ya implementadas. Mezclar ambas dificulta evaluar riesgo real.

Aplicacion futura: mantener secciones separadas de estado actual, limitaciones y evolucion; vincular cada garantia importante a una prueba o criterio de aceptacion.

### L-027: Un mismo concepto de seleccion debe vivir fuera de la UI

Fecha: 2026-07-15

Evidencia: seleccionar un frame afecta a copiar, borrar, zoom, links internos y futuras operaciones headless. Implementarlo solo mediante clases CSS habria creado cierres diferentes por adaptador.

Aprendizaje: cuando una seleccion tiene semantica transitiva, es una consulta de dominio y no un detalle visual.

Aplicacion futura: representar raices explicitas, derivar el cierre con una funcion pura y hacer que UI, CLI y comandos consuman esa misma consulta.

### L-028: Los estados temporales de una animacion no deben persistirse

Fecha: 2026-07-15

Evidencia: la animacion de Layout produjo eventos de scroll que intentaron guardar ViewState sobre una revision intermedia y causaron un conflicto optimista.

Aprendizaje: una transicion visual puede ejecutar muchos renders validos para pintar, pero solo su inicio y su final son estados coherentes para persistencia.

Aplicacion futura: drenar la cola antes de una transicion, suspender autosaves durante ella y confirmar una sola instantanea final; probar la animacion con timers de persistencia activos.

### L-029: Compartir codigo no exige relajar el aislamiento del renderer

Fecha: 2026-07-15

Evidencia: el preload aislado de Electron no podia importar los nuevos modulos locales. Desactivar el sandbox lo habria resuelto, pero reduciendo una garantia de seguridad.

Aprendizaje: las reglas puras pueden publicarse en un formato compatible con Node y navegador y cargarse en ambos lados sin conceder acceso Node al renderer.

Aplicacion futura: mantener los modulos compartidos sin DOM ni Electron, ofrecer export CommonJS y global de navegador, y verificar que el preload conserva su superficie minima.

### L-030: Una prueba manual necesita identidad observable del build

Fecha: 2026-07-15

Evidencia: una aplicacion Electron anterior podia permanecer abierta mientras se publicaba una correccion nueva, sin una forma visual de distinguir ambas ventanas.

Aprendizaje: la trazabilidad de una validacion no puede depender de recordar cuando se abrio el proceso. La identidad ejecutada debe formar parte de la propia interfaz.

Aplicacion futura: mostrar version, build y canal desde una fuente central; incluirlos en capturas e informes de fallos; comprobar su presencia en smoke tests.

### L-031: Un singleton asincrono debe cachear la promesa en curso

Fecha: 2026-07-15

Evidencia: cargar workspace, historial e identidad en paralelo hizo que dos handlers vieran el motor aun vacio y reiniciaran el mismo archivo temporal simultaneamente.

Aprendizaje: cachear solo el resultado resuelto no protege el intervalo entre comenzar y terminar una inicializacion asincrona.

Aplicacion futura: asignar inmediatamente una promesa compartida, hacer que todos los consumidores la esperen y limpiarla al fallar para permitir un reintento controlado.

### L-032: Separar estados no obliga a exponer friccion al usuario

Fecha: 2026-07-16

Evidencia: la seleccion general y los origenes de links debian ser independientes, pero exigir rehacer manualmente la seleccion en modo conexion resultaba incomprensible.

Aprendizaje: dos estados pueden conservar contratos distintos y aun ofrecer una transicion explicita entre ellos cuando una accion expresa claramente la intencion.

Aplicacion futura: mantener modelos internos separados, definir conversiones unidireccionales en comandos concretos y evitar sincronizaciones implicitas permanentes.

### L-033: Los contadores deben explicar la procedencia del estado

Fecha: 2026-07-16

Evidencia: mostrar un unico total para un frame y todo su cierre hizo parecer que el frame se contaba incorrectamente a si mismo.

Aprendizaje: cuando una operacion deriva elementos automaticamente, un total agregado oculta la diferencia entre intencion del usuario y efecto calculado.

Aplicacion futura: mostrar por separado entradas explicitas y resultados derivados; usar etiquetas de dominio y comprobar que los recuentos ayudan a reconstruir la regla.

### L-034: Una raiz estructural no debe representar tambien contenido de dominio

Fecha: 2026-07-16

Evidencia: usar el frame Goal Tree como root infinito funcionaba con un unico arbol, pero impedia colocar varios arboles con frames propios en el mismo espacio.

Aprendizaje: una raiz tecnica define alcance y pertenencia; un contenedor de dominio tiene identidad, limites y comportamiento visibles. Fusionarlos crea restricciones ocultas al crecer el producto.

Aplicacion futura: separar root, contenedores y contenido referenciado; probar pronto composicion de dos elementos hermanos aunque el MVP solo muestre uno.

### L-035: Un keymap editable necesita semantica, no solo un archivo

Fecha: 2026-07-16

Evidencia: centralizar bindings en un archivo elimino hardcoding disperso, pero no resolvio colisiones, diferencias de plataforma ni conflictos entre canvas y campos de texto.

Aprendizaje: configurabilidad segura requiere normalizacion, ambitos, validacion y una ruta de recuperacion; leer JSON es solo transporte.

Aplicacion futura: validar overrides contra un registro de comandos, detectar colisiones por contexto y conservar defaults utilizables cuando la configuracion falla.

### L-036: Ubicacion espacial y propiedad semantica necesitan ejes distintos

Fecha: 2026-07-16

Evidencia: mover una entidad al root debe sacarla de un frame visible sin convertirla en entidad de otro arbol ni perder sus links.

Aprendizaje: usar una sola referencia para propiedad y posicion hace que reorganizar la interfaz cambie accidentalmente el dominio.

Aplicacion futura: modelar por separado el agregado logico y el contenedor visual; exigir un comando semantico explicito para transferir propiedad entre agregados.

### L-037: El comando debe declarar la intencion antes del target

Fecha: 2026-07-16

Evidencia: hacer que `L` conectara al elegir una entidad y moviera al elegir un frame ahorraba una tecla, pero convertia un error de hint en una mutacion diferente.

Aprendizaje: cuando dos acciones tienen riesgos y efectos distintos, el tipo del objeto seleccionado no debe decidir retrospectivamente que accion queria el usuario.

Aplicacion futura: entrar primero en un modo de accion explicito, filtrar despues los targets validos y conservar cancelacion y Undo/Redo.

### L-038: Una migracion debe preceder a la validacion en cada entrada

Fecha: 2026-07-16

Evidencia: separar Canvas y Tree hizo que los proyectos guardados con schema 0.1 dejaran de satisfacer las nuevas invariantes, y la aplicacion dispone de entradas distintas por Electron, CLI y fixtures de prueba.

Aprendizaje: una migracion compatible no es una utilidad aislada. Debe ser idempotente, preservar identidades y ejecutarse antes de construir el nucleo validado en todos los adaptadores que abren datos.

Aplicacion futura: probar schema antiguo, schema actual y doble migracion; centralizar la conversion; persistirla de forma atomica; y hacer que nuevas interfaces reutilicen el mismo limite de carga.

### L-039: La apariencia de seleccion debe prometer el mismo alcance operativo

Fecha: 2026-07-16

Evidencia: `M` resaltaba varios nodos como si formaran una seleccion, pero internamente solo los marcaba como fuentes de links; por eso arrastrar uno movia exclusivamente ese nodo.

Aprendizaje: cuando varios objetos comparten la apariencia convencional de seleccion, el usuario espera que las operaciones colectivas actuen sobre todos. Un estado especializado debe tener otra representacion o derivarse explicitamente de la seleccion general.

Aplicacion futura: definir una seleccion canonica reutilizada por mover, copiar y borrar; convertirla a estados especializados al iniciar cada comando; y probar que teclado y raton producen el mismo conjunto operativo.

### L-040: Una comprobacion de estado no sustituye la inspeccion geometrica

Fecha: 2026-07-16

Evidencia: la prueba automatizada confirmo que tres nodos cambiaban juntos de frame y conservaban sus distancias, pero la captura mostro que quedaban exactamente encima de entidades existentes.

Aprendizaje: validar IDs, pertenencia y coordenadas relativas puede producir un falso positivo visual. Las operaciones espaciales necesitan invariantes de contencion, colision y legibilidad, ademas de evidencia renderizada.

Aplicacion futura: combinar aserciones de dominio con deteccion geometrica y capturas; hacer fallar la prueba cuando haya solapamientos aunque la transaccion sea correcta; y revisar visualmente una muestra de los estados generados.

### L-041: Los modificadores parecidos no son semanticamente intercambiables

Fecha: 2026-07-16

Evidencia: la abstraccion `primary` trataba `Cmd` y `Ctrl` como equivalentes. Al anadir `Cmd+P` y `Cmd+F` para cambiar la estructura, tambien interceptaba `Ctrl+P` y `Ctrl+F`, reservados para desplazar el canvas.

Aprendizaje: normalizar atajos entre plataformas ayuda solo cuando representan la misma intencion. Si una plataforma asigna significados distintos a dos modificadores, el modelo de bindings debe conservar esa diferencia.

Aplicacion futura: modelar `Command`, `Control` y el modificador principal como conceptos separados; comprobar colisiones sobre eventos reales por plataforma y mostrar en la ayuda exactamente el binding que se ejecuta.

### L-042: Un modelo compuesto necesita un layout compuesto

Fecha: 2026-07-16

Evidencia: la reasignacion logica permitio mover entidades y frames entre contenedores, pero Layout seguia organizando todos los nodos como un grafo plano y recalculaba solamente el frame anfitrion del arbol. `ROOT`, frames hermanos y jerarquias nuevas quedaban fuera de su modelo espacial.

Aprendizaje: anadir jerarquia al dominio sin incorporarla al motor geometrico deja dos representaciones validas por separado pero contradictorias en pantalla. Calcular limites despues de un layout plano no equivale a disponer contenedores compuestos.

Aplicacion futura: hacer que el grafo de layout refleje la misma jerarquia que el modelo, probar movimientos entre ramas antes de cerrar la migracion y validar simultaneamente pertenencia, contencion, exclusion y estabilidad de grupos fijados.

### L-043: Geometria valida no implica composicion legible

Fecha: 2026-07-16

Evidencia: la primera version del layout compuesto superaba todas las invariantes, pero las capturas mostraban frames de casi 900 px y un diagrama de 2800 px porque entidades hermanas ocupaban la misma capa horizontal.

Aprendizaje: ausencia de solapamientos y contencion correcta son condiciones necesarias, no una medida suficiente de calidad. Densidad, proporcion y escala de trabajo deben formar parte de la revision visual.

Aplicacion futura: medir dimensiones y zoom resultante, capturar casos de fan-in y fan-out, y combinar el motor de grafos con estrategias de compactacion propias del contenedor o dominio.

### L-044: El crecimiento local debe propagarse por la jerarquia

Fecha: 2026-07-16

Evidencia: colocar un grupo sin colisiones dentro de su destino podia ampliar ese frame hasta invadir una entidad de su padre. Una prueba limitada a los miembros directos daba un falso positivo.

Aprendizaje: en geometria anidada, una mutacion local cambia la caja que observa cada ancestro. Restaurar invariantes exige revisar hermanos y propagar limites hasta la raiz conceptual.

Aplicacion futura: modelar cada frame como unidad rigida al desplazarlo, validar relaciones no ancestrales en todo el canvas y hacer que las pruebas informen tanto conflictos locales como globales.

### L-045: Optimizar una metrica visual puede empeorar la lectura

Fecha: 2026-07-16

Evidencia: el primer enrutador evitaba entidades y penalizaba cruces, pero convertia todas las conexiones en rutas ortogonales. El resultado era geometricamente valido y, aun asi, mucho mas dificil de seguir que las rectas provisionales mostradas al mover un nodo.

Aprendizaje: una regla como evitar cruces debe convivir con una funcion de coste perceptiva que premie simplicidad, continuidad y direccion. Cumplir restricciones duras no sustituye elegir la representacion mas clara entre las soluciones validas.

Aplicacion futura: probar primero la geometria minima, escalar a rutas complejas solo ante un conflicto demostrado y comparar siempre el resultado automatico con el estado provisional que el usuario considera legible.

### L-046: Las preferencias deben modelarse como costes, no como restricciones

Fecha: 2026-07-16

Evidencia: un nodo enlazaba directamente con el Goal y tambien con una condicion situada dos pasos por debajo. Forzar todas las flechas `Bottom to Top` lo colocaba en una cuarta capa y obligaba a un desvio largo; la composicion mas clara usaba tres capas y una sola flecha secundaria en sentido contrario.

Aprendizaje: cuando el producto habla de una direccion preferente, convertirla en una restriccion dura puede sacrificar legibilidad global. Una funcion de coste permite aceptar una excepcion pequena si elimina cruces, obstaculos y complejidad mucho mayores.

Aplicacion futura: declarar que reglas son invariantes y cuales preferencias; producir varias soluciones deterministas; compararlas con metricas ordenadas; y exponer las excepciones para que el resultado siga siendo explicable.

### L-047: Un ejemplo real se vuelve util cuando se convierte en contrato

Fecha: 2026-07-16

Evidencia: las primeras regresiones construian en codigo un grafo sintetico de 10 entidades. Una referencia real de 18 entidades revelo problemas que aquel caso no contenia: tipos mezclados entre capas, habilitadores compartidos, fan-in y puntas superpuestas.

Aprendizaje: una captura comunica una observacion, pero un fixture versionado conserva topologia, semantica y expectativas. Compartirlo entre validacion, pruebas algoritmicas y pruebas visuales evita que cada nivel compruebe un problema ligeramente distinto.

Aplicacion futura: convertir pronto los ejemplos representativos del usuario en datos estables; declarar aserciones de dominio ademas de metricas geometricas; y conservar casos pequenos solo para aislar propiedades especificas.

### L-048: La legibilidad se mide en pantalla, no solo en el canvas

Fecha: 2026-07-16

Evidencia: las puntas de flecha tenian una geometria correcta y marcadores presentes, pero al encajar el caso complejo al 36% quedaban reducidas a unos cuatro pixeles. La prueba tecnica pasaba mientras la direccion apenas podia verse.

Aprendizaje: zoom y transformaciones separan las unidades del modelo de los pixeles percibidos. Los indicadores de interaccion y direccion necesitan limites de tamano visual independientes de la escala del contenido.

Aplicacion futura: comprobar tamanos efectivos despues de aplicar zoom; compensar la escala de marcadores, handles y badges; y definir criterios perceptivos minimos junto a las aserciones estructurales.

### L-049: Una heuristica necesita una opcion de no actuar

Fecha: 2026-07-16

Evidencia: el layout multiarranque encontraba una solucion con cero cruces, pero dispersaba ramas bien ordenadas, creaba un gran espacio vacio y alargaba un enlace transversal. La seleccion lexicografica seguia considerandola ganadora porque un cruce tenia prioridad absoluta.

Aprendizaje: cuando una heuristica modifica trabajo humano, el estado actual debe ser un candidato real y la mejora debe superar un margen significativo. Sin una opcion de no actuar, el optimizador confunde diferencia con progreso.

Aplicacion futura: puntuar estabilidad, densidad y valores extremos ademas de promedios; comparar contra una linea base; exigir una mejora porcentual; y registrar por que se aplico o rechazo cada resultado automatico.

## Proximas entradas

Las nuevas lecciones se anadiran cronologicamente a partir de `L-050`. Si una experiencia refina una entrada existente, se actualizara esa entrada y se anotara la fecha de revision en lugar de duplicar el principio.

## Plantilla

```text
### L-XXX: Titulo generalizable

Fecha: YYYY-MM-DD

Evidencia: que ocurrio en el proyecto.

Aprendizaje: que principio revela y por que importa.

Aplicacion futura: como usarlo o comprobarlo en otros proyectos.
```
