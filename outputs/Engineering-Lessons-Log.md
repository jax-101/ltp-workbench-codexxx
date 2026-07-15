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

## Proximas entradas

Las nuevas lecciones se anadiran cronologicamente a partir de `L-027`. Si una experiencia refina una entrada existente, se actualizara esa entrada y se anotara la fecha de revision en lugar de duplicar el principio.

## Plantilla

```text
### L-XXX: Titulo generalizable

Fecha: YYYY-MM-DD

Evidencia: que ocurrio en el proyecto.

Aprendizaje: que principio revela y por que importa.

Aplicacion futura: como usarlo o comprobarlo en otros proyectos.
```
