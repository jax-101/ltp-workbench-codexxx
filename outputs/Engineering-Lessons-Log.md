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

### L-050: La aleatoriedad visual necesita semilla y un oraculo gradual

Fecha: 2026-07-16

Evidencia: cuatro grafos con conexiones pseudoaleatorias mostraron un salto desde cero problemas geometricos en frames hermanos hasta 22 y 21 problemas al anidar frames. Sin semillas fijas, los casos `4103` y `4104` no habrian podido repetirse; si la prueba solo comprobara que Electron termino, la regresion habria quedado oculta, y si exigiera ya cero defectos no podria funcionar como linea base intermedia.

Aprendizaje: una prueba aleatoria se vuelve una herramienta de ingenieria cuando combina reproducibilidad con un oraculo apropiado a la madurez del sistema. Conviene separar invariantes que ya deben bloquear la entrega de metricas diagnosticas que todavia describen el trabajo pendiente.

Aplicacion futura: registrar semilla y parametros junto a cada evidencia; conservar escenarios representativos; afirmar determinismo e integridad desde el principio; y promover gradualmente cruces, colisiones o umbrales perceptivos desde observaciones a criterios obligatorios cuando se implemente la correccion.

### L-051: La reversibilidad puede sustituir confirmaciones repetitivas

Fecha: 2026-07-16

Evidencia: borrar un nodo, link o frame abria siempre un dialogo, incluso cuando el usuario estaba limpiando el diagrama de forma deliberada. La operacion ya se guardaba como una transaccion atomica y el root estaba protegido, por lo que la confirmacion anadia friccion sin cubrir un riesgo no recuperable.

Aprendizaje: las confirmaciones son adecuadas para acciones irreversibles, excepcionales o de gran alcance incierto. En operaciones frecuentes y completamente reversibles, una proteccion estructural combinada con Undo reduce errores sin interrumpir cada intencion.

Aplicacion futura: clasificar acciones destructivas por reversibilidad y alcance; proteger invariantes de dominio; mostrar el resultado inmediatamente; y reservar modales para perdidas que Undo no pueda restaurar con garantias.

### L-052: Comparar motores exige conservar el resto del sistema

Fecha: 2026-07-16

Evidencia: ELK clasico, ELK interactivo y WebCola produjeron posiciones distintas, pero todos heredaron fortalezas y defectos del mismo coordinador recursivo y enrutador. Cambiar el motor no elimino por si solo los problemas geometricos del escenario `fan-in`.

Aprendizaje: una comparacion de componentes solo es valida si entrada, puntuacion, invariantes y postprocesado permanecen constantes. Tambien permite reconocer cuando el cuello de botella esta fuera del componente sustituido.

Aplicacion futura: definir contratos estrechos, inyectar implementaciones, ejecutar fixtures identicos y atribuir cada metrica a la fase que realmente la produce.

### L-053: Las capacidades nativas no garantizan su composicion

Fecha: 2026-07-16

Evidencia: WebCola soporta grupos, restricciones direccionales y eliminacion de solapamientos. Cada capacidad funciono por separado, pero al alinear rangos globales dentro de grupos anidados aparecieron colisiones entre grupos hermanos.

Aprendizaje: una lista de funcionalidades de una biblioteca no demuestra que todas puedan satisfacerse simultaneamente sobre el modelo concreto del producto. Las interacciones entre restricciones son parte esencial de la evaluacion.

Aplicacion futura: construir primero el caso combinado mas exigente, definir invariantes duros y conservar candidatos alternativos para que una preferencia no invalide la geometria.

### L-054: Una abstraccion reversible conserva valor aunque el experimento pierda

Fecha: 2026-07-16

Evidencia: aislar ELK detras de un generador de candidatos permitio introducir Cola sin modificar seleccion, routing, Undo o interfaz. La conclusion fue no sustituir ELK, pero el contrato sigue facilitando pruebas headless y motores futuros.

Aprendizaje: un experimento arquitectonicamente aislado puede producir una mejora permanente sin obligar a adoptar la tecnologia evaluada. La reversibilidad reduce tanto el riesgo como el coste de aprender.

Aplicacion futura: separar primero el limite estable, confirmar paridad con la implementacion original y hacer que la tecnologia experimental viva detras de ese limite.

### L-055: Colapsar complejidad puede valer mas que optimizarla

Fecha: 2026-07-16

Evidencia: en el experimento, representar un frame minimizado como una sola entidad redujo muchos mas cruces que sustituir ELK por otro motor manteniendo todos los detalles expandidos.

Aprendizaje: cuando la complejidad visual procede de demasiadas relaciones simultaneas, una representacion jerarquica adecuada puede superar a una optimizacion geometrica mas sofisticada.

Aplicacion futura: permitir niveles de detalle, proyectar relaciones a limites de grupos y medir la legibilidad tanto con estructuras expandidas como resumidas.

### L-056: Restaurar la intencion no obliga a restaurar un defecto

Fecha: 2026-07-16

Evidencia: minimizar y volver a expandir conservaba exactamente las posiciones relativas, pero la fixture inicial tenia un frame demasiado pequeno y rutas que atravesaban nodos. La primera restauracion fiel devolvio tambien esas violaciones.

Aprendizaje: una operacion reversible debe distinguir el estado significativo para el usuario de la geometria derivada. Se puede preservar el mapa mental y, a la vez, recalcular limites y rutas para restablecer invariantes.

Aplicacion futura: declarar que campos son identidad, cuales expresan intencion y cuales son proyecciones regenerables; probar la ida y vuelta desde estados imperfectos, no solo desde estados ya normalizados.

### L-057: El postprocesado puede anular al optimizador

Fecha: 2026-07-16

Evidencia: ELK calculaba el contenido de cada frame, pero una funcion ejecutada despues sustituia sus posiciones y colocaba todos los elementos de un contenedor en una sola columna. Cambiar opciones de ELK no podia corregir el resultado visible.

Aprendizaje: la calidad final pertenece a toda la tuberia, no solo al algoritmo principal. Cualquier fase posterior que modifica geometria debe respetar la topologia o volver a evaluarse con las mismas metricas e invariantes.

Aplicacion futura: capturar salidas entre fases, probar el resultado final y limitar los postprocesados a casos explicitamente definidos, como el empaquetado de elementos desconectados.

### L-058: Un candidato estable debe seguir siendo factible

Fecha: 2026-07-16

Evidencia: al compactar un frame hijo aumento su anchura. El padre intento conservar sus coordenadas anteriores por estabilidad, pero esas coordenadas aplicadas a las cajas nuevas hacian que varios frames se solaparan.

Aprendizaje: en optimizacion jerarquica, una posicion anterior no es automaticamente un candidato valido cuando cambian las dimensiones de sus componentes. Las restricciones duras deben comprobarse antes de comparar puntuaciones o aplicar umbrales de mejora.

Aplicacion futura: recalcular cajas de abajo arriba, descartar candidatos infactibles y aplicar estabilidad solo entre soluciones que cumplen contencion, exclusion y ausencia de solapamientos.

### L-059: El contexto activo y la seleccion explicita son estados distintos

Fecha: 2026-07-16

Evidencia: al entrar en seleccion multiple desde un frame activo, ese frame permanecia como raiz explicita mientras el usuario elegia entidades. `Cmd+F` lo excluia correctamente para evitar un ciclo, pero la interfaz solo hacia evidente la seleccion de las entidades y el frame parecia desaparecer sin motivo de la lista de destinos.

Aprendizaje: el lugar donde se crea o edita no debe confundirse con el conjunto sobre el que actuara el siguiente comando. Cuando ambos estados comparten representacion, una preseleccion conveniente puede convertirse en una restriccion invisible y producir un comportamiento tecnicamente coherente pero incomprensible.

Aplicacion futura: modelar por separado contexto, foco, seleccion provisional y seleccion confirmada; mostrar el alcance efectivo de cada comando; y probar transiciones en las que una seleccion comienza desde un contenedor activo.

### L-060: Una preferencia visual puede ser una restriccion semantica

Fecha: 2026-07-16

Evidencia: la funcion de calidad permitia invertir una arista aciclica a cambio de ahorrar una capa y reducir longitud. La puntuacion era geometricamente razonable, pero la flecha descendente hacia `MIRARLO` contradecia la lectura causal del Goal Tree.

Aprendizaje: no toda metrica debe vivir en una suma ponderada. Si violar una propiedad cambia el significado del modelo, esa propiedad debe filtrar candidatos como restriccion dura antes de comparar cruces, area o estabilidad. Las excepciones inevitables deben quedar ligadas a una causa estructural verificable, como un ciclo.

Aplicacion futura: separar factibilidad de calidad; documentar que restricciones proceden del dominio; registrar las relajaciones temporales; y probar tanto el caso sin excepciones como el caso minimo que obliga a una.

### L-061: Separar geometria y representacion hace baratos los experimentos visuales

Fecha: 2026-07-16

Evidencia: el enrutador ya calculaba puertos, corredores y desvios libres de obstaculos. Al conservar esos puntos y transformar solo el `path` SVG fue posible comparar flechas curvas y ortogonales sin tocar ELK, posiciones, links, Undo o el modelo headless.

Aprendizaje: una decision visual reversible debe apoyarse sobre un contrato geometrico neutral. Si el aspecto esta acoplado al algoritmo que resuelve restricciones, cada experimento reabre problemas ya solucionados y resulta dificil atribuir mejoras o regresiones.

Aplicacion futura: persistir intencion y geometria estable; derivar el trazo en la capa de presentacion; ofrecer comparacion con los mismos datos; y verificar tanto percepcion visual como invariantes mediante muestreo de la curva final.

### L-062: Los grados de libertad pequenos deben entrar en la optimizacion

Fecha: 2026-07-16

Evidencia: las flechas ya llegaban a la cara correcta, pero los puertos uniformes y una unica separacion transversal obligaban a curvar antes de tiempo y desaprovechaban espacio disponible. Proyectar puertos, mantener su orden y comparar capas compactas y ampliadas mejoro las entradas sin cambiar rangos.

Aprendizaje: antes de sustituir el algoritmo principal conviene identificar que variables se han fijado artificialmente. Puertos deslizantes, orden dentro de una capa y tamano del contenedor pueden eliminar conflictos locales con menos impacto que crear codos o mover nodos entre niveles.

Aplicacion futura: enumerar variables libres y restricciones duras por separado; generar una diversidad acotada de candidatos; puntuar la geometria que realmente se renderiza; y exigir pruebas perceptivas en unidades de pantalla cuando intervienen zoom o marcadores.

### L-063: Una edicion colectiva necesita una referencia comun

Fecha: 2026-07-16

Evidencia: ciclar independientemente el tipo de varios nodos mantenia sus diferencias iniciales. El usuario esperaba que la primera pulsacion normalizara el grupo y que las siguientes lo recorrieran como una unidad.

Aprendizaje: una operacion masiva no siempre equivale a repetir una operacion individual. Cuando el objetivo es clasificar un grupo, conviene definir un estado inicial comun, una secuencia compartida y una frontera transaccional unica.

Aplicacion futura: especificar por separado semantica individual y colectiva; reiniciar sesiones al cambiar su alcance; validar cardinalidades antes de mutar; y probar que un solo Undo revierte el lote completo.

### L-064: Evitar coincidencias de origen no garantiza una interfaz sin solapes

Fecha: 2026-07-16

Evidencia: la insercion consideraba libre una posicion a solo 18 unidades de otra porque comparaba la distancia entre origenes con un umbral de 12. Las entidades de 250 por 72 y sus hints quedaban practicamente superpuestos.

Aprendizaje: la deteccion espacial debe comparar las cajas reales, sus margenes funcionales y los elementos transitorios que participan en la interaccion. Un punto libre puede seguir produciendo una composicion inutilizable.

Aplicacion futura: modelar zonas ocupadas y de seguridad; probar secuencias repetidas, no solo una insercion; y verificar controles superpuestos en coordenadas de pantalla cuando mantienen tamano constante con zoom.

### L-065: Un estado operativo no debe competir con el color semantico

Fecha: 2026-07-16

Evidencia: el borde seleccionado reutilizaba tonos cercanos a los Types y el trazo SVG se hacia mas fino al alejar el zoom. La seleccion existia en el modelo, pero dejaba de percibirse con rapidez tanto en entidades como en links.

Aprendizaje: los estados de interaccion deben tener un canal visual propio, redundante y estable en pantalla. Color, grosor, halo y controles persistentes se complementan; depender de una sola variacion cromatica o de unidades que escalan con el contenido fragiliza la interfaz.

Aplicacion futura: reservar colores para estados operativos; reforzarlos con forma o contorno; definir en unidades de pantalla los detalles criticos; y comprobar estilos calculados junto con capturas a distintos niveles de zoom.

### L-066: El elemento activo no equivale al conjunto seleccionado

Fecha: 2026-07-16

Evidencia: la seleccion multiple conservaba correctamente todas sus raices para mover, borrar o cambiar Type, pero el renderer aplicaba la clase principal solo al ultimo elemento activo. Los demas se mostraban como contenido incluido y parecian no estar seleccionados.

Aprendizaje: foco, elemento activo, raices explicitas y cierre derivado son estados relacionados pero distintos. Colapsarlos en una unica referencia produce interfaces que ejecutan una operacion colectiva sin comunicar correctamente su alcance.

Aplicacion futura: modelar cada estado por separado; derivar el estilo de pertenencia desde el conjunto correspondiente; reservar el elemento activo para inspector o foco; y probar selecciones de al menos dos elementos tanto por teclado como por raton.

### L-067: Una auditoria debe comprobar consecuencias, no eventos

Fecha: 2026-07-16

Evidencia: `Cmd+K` era reconocido por el matcher y mostraba un mensaje, pero no existia ninguna paleta. Una prueba limitada a `commandForEvent` lo habria declarado correcto. La auditoria semantica exigio dialogo visible, busqueda enfocada y lista completa, y descubrio el placeholder.

Aprendizaje: capturar una entrada no demuestra que una funcionalidad exista. Las pruebas de interaccion deben formular el resultado observable prometido y medir estado de dominio, modo de interfaz, foco y representacion visual segun corresponda.

Aplicacion futura: derivar casos del registro real; declarar una consecuencia por comando; probar bindings alternativos por separado; y tratar placeholders o no-ops como fallos aunque el dispatcher funcione.

### L-068: Las pruebas asincronas de UI necesitan una frontera de estabilidad

Fecha: 2026-07-16

Evidencia: la primera pasada marco minimizar, preview y creacion de soporte como fallos parciales. Dos casos observaban un render intermedio y otro buscaba el objeto activo equivocado despues de que la operacion pasara del nodo al link.

Aprendizaje: esperar un tiempo fijo no garantiza que una cadena de guardados, renders y animaciones haya terminado. La prueba debe observar la cola hasta que permanezca estable y consultar el estado que representa la intencion, no una referencia incidental de foco.

Aplicacion futura: exponer promesas o estados de finalizacion; esperar colas estables y animaciones cerradas; usar selectores de contrato; y conservar la primera evidencia para distinguir defectos del producto de defectos del test.

### L-069: La inspeccion visual puede descubrir una violacion estructural posterior al PASS

Fecha: 2026-07-16

Evidencia: `A` y `Shift+A` llegaron a `PASS` al crear nodo y link sin solape, pero las capturas mostraron primero una entidad fuera del viewport y despues un frame ampliado sobre elementos ajenos. Incorporar exclusion de frames y visibilidad al criterio produjo una colocacion valida.

Aprendizaje: las aserciones funcionales y geometricas pueden omitir una composicion visual absurda. La captura no es decoracion de la prueba: sirve para descubrir invariantes que aun no se habian expresado y convertirlos despues en comprobaciones automaticas.

Aplicacion futura: revisar visualmente casos representativos tras cada nueva suite; traducir cada defecto observado a una invariante; comprobar cajas completas y pertenencia; y no cerrar una prueba solo porque el dato final sea correcto.

### L-070: El contexto activo debe poseer las teclas que usa como datos

Fecha: 2026-07-16

Evidencia: durante la seleccion multiple, una `M` intermedia de un hint se resolvia antes como el comando global que cerraba el modo. Excluir letras concretas del alfabeto evitaba algunos choques, pero reducia el espacio de etiquetas y dejaba el mismo riesgo para otros comandos.

Aprendizaje: cuando una interfaz modal interpreta caracteres como datos, ese contexto debe recibirlos antes que los atajos globales. Si una misma tecla pretende ser simultaneamente dato y salida del modo, la interaccion es ambigua por construccion.

Aplicacion futura: ordenar el enrutamiento por contexto; reservar teclas no ambiguas como `Enter` y `Esc` para finalizar o cancelar; mantener comandos modificados disponibles; y probar secuencias que contengan cada tecla global relevante.

### L-071: La extensibilidad debe modelar diferencias estructurales, no solo catalogos

Fecha: 2026-07-16

Evidencia: el registro inicial podia cambiar Types, etiquetas y direccion de Goal Tree, pero CRT/FRT necesitan relaciones `AND/OR` y ciclos, EC tiene una topologia canonica y PrT cambia el proceso logico. Ninguna lista de Types resuelve esas diferencias sin introducir excepciones en el resto del sistema.

Aprendizaje: una arquitectura extensible no se valida añadiendo otro nombre al catalogo, sino incorporando un segundo caso que difiera en estructura. El punto comun adecuado suele ser un contrato intermedio: semantica especifica por encima y servicios genericos por debajo.

Aplicacion futura: elegir fixtures que fuercen aridad, topologia y reglas distintas; separar relaciones de su representacion visual; compilar a un modelo neutral para motores externos; y probar el segundo dominio antes de estabilizar operaciones transversales como copiar, borrar o exportar.

### L-072: Un sistema extensible debe usar sus extensiones para sus propios casos oficiales

Fecha: 2026-07-16

Evidencia: mantener Goal Tree y los futuros diagramas TOC dentro del codigo permitiria diseñar un formato de usuario aparentemente extensible que nunca afrontara los requisitos completos del producto. El primer caso real que quedara fuera revelaria tarde las diferencias entre ambas rutas.

Aprendizaje: la mejor prueba de una arquitectura de extensiones es que el propio producto dependa de ella. Los built-ins deben ser paquetes cargados por el mismo contrato, con las mismas validaciones y limites que los artefactos de terceros.

Aplicacion futura: dogfood del formato desde la primera migracion; fijar versiones por instancia; compartir compilador entre UI y CLI; evitar codigo arbitrario en datos; y definir explicitamente la frontera entre capacidades componibles y nuevas primitives que requieren codigo de confianza.

### L-073: Un contrato extensible se estabiliza despues de sus contraejemplos

Fecha: 2026-07-16

Evidencia: la arquitectura propuesta podia describir Goal Tree y anticipaba
relaciones n-arias, pero CRT introduce suficiencia y junctions, mientras EC
fuerza topologia canonica, conflicto y assumptions con cardinalidades distintas.
Definir el formato publico antes de ejecutar esos casos dejaba decisiones
semanticas importantes escondidas como enums aparentemente estables.

Aprendizaje: una extension API no se valida con el caso del que fue extraida.
Necesita al menos un segundo caso estructuralmente distinto y un contraejemplo
que tensione sus limites antes de prometer compatibilidad.

Aplicacion futura: mantener el contrato interno; congelar fixtures-oraculo;
implementar verticales completas; definir criterios que invaliden la hipotesis;
y publicar el formato solo cuando varias extensiones reales funcionen sin ramas
privilegiadas ni cambios en las primitivas base.

### L-074: Un operador semantico no siempre necesita un simbolo visible

Fecha: 2026-07-16

Evidencia: en CRT y FRT, varias flechas directas representan causas `OR`
independientes sin junctor. En diagramas de necesidad, las mismas flechas se
leen como `AND`. Describir `OR` simplemente como un junctor rotulado introducia
una contradiccion entre semantica y notacion.

Aprendizaje: el valor por defecto de un contexto puede ser semantico sin tener
representacion propia. Un elemento visual explicito solo es necesario para
agrupar o sobrescribir ese valor.

Aplicacion futura: separar modo, operador y render; declarar defaults por
dominio; evitar simbolos redundantes; y probar la verbalizacion junto a la
captura visual para comprobar que una geometria no adquiere dos significados
accidentalmente.

### L-075: Agregar argumentos y agrupar premisas son operaciones distintas

Fecha: 2026-07-16

Evidencia: modelar las flechas directas como una sola relacion `OR` explicaba el
resultado, pero dificultaba assumptions por flecha y composiciones como
`A OR (B AND C)`. Separar cada flecha simple del grupo `B+C` conserva ambos
niveles sin crear entidades ficticias.

Aprendizaje: cuando una expresion combina operadores, el contenedor no debe
absorber la estructura interna de sus operandos. La agregacion del destino y la
agrupacion de entradas necesitan identidades y reglas distintas.

Aplicacion futura: modelar argumentos como unidades componibles; derivar los
defaults del contexto; asociar metadatos al argumento real; y probar expresiones
mixtas antes de congelar un schema aparentemente generico.

### L-076: Una incompatibilidad contextual no es siempre un XOR

Fecha: 2026-07-16

Evidencia: la primera version del contrato asignaba `XOR` al conflicto de una
Evaporating Cloud. Sin embargo, algunos conflictos son alternativas que podrian
coexistir con mas recursos; su incompatibilidad procede de la situacion actual,
no de una exclusividad logica permanente.

Aprendizaje: una etiqueta de dominio familiar no debe traducirse automaticamente
a un operador formal. La relacion, la restriccion contextual y la notacion
necesitan contratos separados.

Aplicacion futura: exigir ejemplos y contraejemplos antes de asignar operadores;
permitir que las restricciones cambien sin reescribir la semantica base; y
probar la verbalizacion de cada proyeccion, no solo su estructura.

### L-077: Una migracion dual necesita una sola autoridad de escritura

Fecha: 2026-07-16

Evidencia: el kernel nuevo puede convivir aditivamente con nodos y links `0.2`,
pero ambos contienen afirmaciones, extremos y assumptions capaces de cambiar.
Sin una huella, una edicion legacy haria obsoleta la proyeccion; con dos rutas de
escritura, ni siquiera seria posible decidir automaticamente cual prevalece.

Aprendizaje: duplicar una representacion durante una migracion es seguro solo
si una copia es derivada, se puede demostrar su frescura y todas las escrituras
atraviesan una autoridad transaccional unica.

Aplicacion futura: comenzar con preview de lectura; conservar downgrade exacto;
calcular fingerprints sobre semantica y no sobre geometria; rechazar estados
obsoletos; y activar edicion unicamente cuando fuente y proyeccion se actualicen
atomica y reversiblemente.

### L-078: Los textos derivados forman parte de la atomicidad semantica

Fecha: 2026-07-16

Evidencia: el primer comando generico podia cambiar el statement de un elemento
o los extremos de una relacion y mantener IDs, kernel y link sincronizados,
pero `meaning` y `verbalization` seguian describiendo la relacion anterior.

Aprendizaje: la consistencia referencial no basta cuando un modelo persiste
explicaciones derivadas. Una mutacion semantica debe actualizar o invalidar en
la misma transaccion todas las verbalizaciones, indices y proyecciones que
dependen de ella.

Aplicacion futura: declarar dependencias derivadas; centralizar su generacion;
incluirlas en fingerprints y Undo/Redo; y probar el significado resultante, no
solo que los IDs apunten a objetos existentes.

### L-079: Algunos diagramas tienen una gramatica espacial, no solo un grafo

Fecha: 2026-07-16

Evidencia: el primer oraculo EC contenia los cinco elementos y las relaciones
correctas por Type, pero no obligaba a mantener `B-D` y `C-D'` en filas
paralelas. Un layout podia intercambiar ramas o dispersar los roles y seguir
superando la validacion puramente topologica.

Aprendizaje: cuando la posicion transmite papel argumental, el contrato de
dominio debe declarar roles, ranks y alineaciones. Dejarlo como preferencia del
layout elimina informacion aunque no se pierda ningun nodo o enlace.

Aplicacion futura: separar coordenadas libres de constraints semanticos;
validar roles antes del layout; compilar ranks canonicos al grafo neutral; y
crear oraculos visuales que fallen ante ramas cruzadas o intercambiadas.

### L-080: Las assumptions de una relacion son datos de trabajo de primer nivel

Fecha: 2026-07-16

Evidencia: las fuentes de EC describen cinco break points y recomiendan revelar
varias assumptions por flecha. Ademas, la pregunta para `D-D'` no es la misma
que para una flecha recta: busca que falta para que ambos wants coexistan.

Aprendizaje: asociar una lista de notas al diagrama no preserva el razonamiento.
Cada argumento necesita identidad, scope, prompt, estado de revision y
trazabilidad hacia la injection que lo desafia.

Aplicacion futura: modelar assumptions como objetos seleccionables; medir
cobertura por relacion; distinguir prompts por tipo de subject; permitir drafts
incompletos pero impedir aceptacion silenciosa; y probar borrado, copia y Undo
de la assumption junto con su relacion.

### L-081: Una migracion se activa en el limite transaccional, no en la UI

Fecha: 2026-07-17

Evidencia: activar el kernel solo durante la apertura dejaba una salida por la
que `workspace.replace` podia introducir una copia antigua sin proyeccion. La
UI normal no lo hacia, pero CLI, fixtures o clientes futuros si podian hacerlo.

Aprendizaje: un invariante de persistencia debe ser garantizado por la ultima
frontera comun antes de validar y guardar. Las superficies de entrada no son un
lugar suficiente para imponerlo.

Aplicacion futura: normalizar cada candidato dentro de la transaccion; probar
clientes antiguos; hacer idempotente la reparacion; y validar el estado ya
normalizado antes del commit atomico.

### L-082: Una recomendacion metodologica no es un error de integridad

Fecha: 2026-07-17

Evidencia: reducir temporalmente un Goal Tree de tres a dos CSF producia una
advertencia correcta, pero el validador de workspace la convertia en rechazo de
la operacion. El diagrama seguia siendo estructural y semanticamente valido.

Aprendizaje: mezclar warnings y errores hace que una guia de calidad se
convierta accidentalmente en una restriccion del modelo. La severidad forma
parte del contrato y debe conservarse en todas las capas.

Aplicacion futura: bloquear commits solo ante errores; mostrar recomendaciones
sin impedir el trabajo incremental; y probar explicitamente que cada warning
permite persistir mientras su mutacion equivalente de error hace rollback.

### L-083: Las acciones disponibles deben respetar el contexto semantico

Fecha: 2026-07-17

Evidencia: el ciclo de Types permitia convertir un nodo conectado en una
assumption, aunque una assumption promovida es una anotacion y no un extremo
causal. Filtrar esa opcion para selecciones conectadas mantuvo el atajo y evito
crear estados que el kernel debia rechazar.

Aprendizaje: una lista de comandos o Types globalmente valida puede contener
opciones invalidas para la seleccion actual. La UX debe expresar las mismas
precondiciones que el dominio, sin esperar al error de guardado.

Aplicacion futura: calcular capacidades desde seleccion y relaciones; compartir
el mismo predicado entre UI y pruebas; conservar una validacion defensiva en el
core; y explicar por que una opcion no aparece cuando sea necesario.

### L-084: Una ventana no es una sesion y una vista no es un documento

Fecha: 2026-07-17

Evidencia: el prototipo podia usar un motor global y `trees[0]` mientras solo
existian una ventana y un arbol. Pestañas, multimonitor y proyectos paralelos
convertirian ambos atajos en mezcla de historial o copias divergentes.

Aprendizaje: identidad de proceso, sesion, documento, vista y ventana deben
separarse antes de implementar navegacion multidocumento. Una ventana aloja
vistas; no posee la fuente de verdad.

Aplicacion futura: una sesion por locator canonico; un motor compartido por las
ventanas del proyecto; IDs explicitos en comandos; estado visual por vista; y
pruebas con dos proyectos y dos vistas del mismo documento antes de construir
la interfaz final.

## Proximas entradas

Las nuevas lecciones se anadiran cronologicamente a partir de `L-085`. Si una experiencia refina una entrada existente, se actualizara esa entrada y se anotara la fecha de revision en lugar de duplicar el principio.

## Plantilla

```text
### L-XXX: Titulo generalizable

Fecha: YYYY-MM-DD

Evidencia: que ocurrio en el proyecto.

Aprendizaje: que principio revela y por que importa.

Aplicacion futura: como usarlo o comprobarlo en otros proyectos.
```
