# Decision Log

Registro de decisiones de producto y arquitectura.

## 2026-07-13

### D-001: El sistema es la entidad estable

Decision: la app debe modelar el `System` como objeto estable. Los arboles son perspectivas, artefactos o rutas de analisis sobre ese sistema.

Razon: un mismo sistema puede analizarse desde Goal Tree, CRT, EC u otros arboles, y pueden existir forks de soluciones sin duplicar el sistema base.

### D-002: Separar System Profile y System Benchmark

Decision: el metadato del sistema se divide en `System Profile` y `System Benchmark`.

Razon: el Profile describe contexto, frontera, control e influencia. El Benchmark define lo que deberia ocurrir, normalmente mediante Goal Tree. Esta separacion permite derivar UDE reales al comparar benchmark contra realidad.

### D-003: Goal Tree sera el primer artefacto nativo de fase 1

Decision: la fase 1 se centrara en crear y editar un Goal Tree como primer System Benchmark.

Razon: el Goal Tree establece goal, CSF y NC; esto fundamenta correctamente los CRT posteriores.

### D-004: La app debe ser usable 100% sin raton

Decision: la navegacion, seleccion, edicion, conexion, creacion de frames, guardado y comandos deben poder ejecutarse con teclado.

Razon: el flujo debe priorizar pensamiento rapido y evitar friccion de diagramacion manual.

### D-005: Keyboard hint mode como mecanismo principal de seleccion

Decision: la app tendra un modo de hints que muestra letras sobre entidades, frames, conexiones y controles visibles.

Razon: permite seleccionar elementos visuales en un canvas grande sin usar raton.

### D-006: Cada arbol tiene frame principal y puede contener frames anidados

Decision: todo arbol tiene un frame principal. Dentro pueden existir frames anidados con entidades, conexiones y otros frames.

Razon: los arboles LTP pueden crecer mucho y necesitan agrupacion, foco, contraccion, expansion y trabajo por clusters.

### D-007: Las flechas son objetos de primer nivel

Decision: cada `Link` debe tener significado explicito, verbalizacion, assumptions, evidencia y estado de validacion.

Razon: en LTP, una flecha no es solo una linea visual; representa una relacion logica defendible. En EC contiene "because" assumptions, y en CRT/FRT sostiene causalidad y suficiencia.

### D-008: El MVP debe recortarse

Decision: la primera fase debe excluir CRT, EC, FRT, forks avanzados, CLR completa y biblioteca contextual.

Razon: el mayor riesgo esta en la experiencia de captura, teclado, frames, links ricos y layout. Hay que validarlo pronto con un scope estrecho.

### D-009: Metadato minimo de sistema

Decision: crear un sistema solo exige nombre. El System Profile minimo de fase 1 incluye nombre, owner/decision-maker, frontera breve y descripcion/proposito de trabajo.

Razon: permite empezar rapido sin perder el contexto minimo para construir un Goal Tree.

### D-010: Workspace con multiples sistemas

Decision: un workspace puede contener varios sistemas, cada uno en su propia subcarpeta.

Razon: facilita trabajar sistemas relacionados sin mezclar artefactos.

### D-011: CRT con benchmark provisional

Decision: en fase 2 se podra crear un CRT sin Goal Tree completo, pero marcado como benchmark provisional.

Razon: respeta rutas no lineales reales sin abandonar disciplina metodologica.

### D-012: Checks CLR por fases

Decision: fase 1 incluye claridad, entity existence ligera y verbalizacion de necessity links. Causalidad y suficiencia completas quedan para CRT/FRT.

Razon: Goal Tree usa necessity logic; la validacion causal completa corresponde a arboles de causa-efecto.

### D-013: Promote assumption to node

Decision: una assumption de una flecha podra convertirse en nodo explicito preservando trazabilidad al link original.

Razon: algunas assumptions requieren analisis como entidades propias.

### D-014: Atajos canonicos iniciales

Decision: fase 1 usara un set inicial de atajos: `Cmd/Ctrl+K`, `H`, `N`, `A`, `Shift+A`, `Enter`, `Esc`, `L`, `F`, `[`, `]`, `/`, `P`, `Cmd/Ctrl+Shift+L`.

Razon: cubren command palette, hints, nodos, edicion, links, frames, busqueda, pinning y layout sin depender del raton.

### D-015: Auto-layout por comando en fase 1

Decision: el auto-layout se ejecutara por comando en fase 1. La app puede colocar nodos nuevos cerca del contexto, pero no reordenara agresivamente sin orden del usuario.

Razon: reduce frustracion mientras se valida el comportamiento del layout.

### D-016: ELK.js como primera opcion de layout

Decision: evaluar ELK.js primero; Dagre queda como alternativa simple.

Razon: ELK.js encaja mejor con grafos jerarquicos y frames/compound graphs.

### D-017: Persistencia local legible

Decision: fase 1 usara archivos JSON legibles para datos y Markdown para exportaciones. No habra base de datos local.

Razon: facilita inspeccion, recuperacion y versionado externo.

## 2026-07-14

### D-018: Separar grafo logico y layout visual

Decision: el modelo guardara nodos, links y assumptions como grafo logico, y posiciones/rutas como `LayoutState` separado.

Razon: el auto-layout debe poder cambiar la visualizacion sin alterar la logica del arbol.

### D-019: Direccion logica de links en Goal Tree

Decision: en Goal Tree, un link apunta desde la condicion necesaria hacia el resultado que soporta.

Razon: permite verbalizar el link como "In order to achieve TARGET, we must have/do SOURCE" y conservar la relacion de soporte aunque el layout muestre el target arriba.

### D-020: Keyboard hints son efimeros

Decision: los keyboard hints no se guardan en el modelo de datos.

Razon: dependen de visibilidad, zoom, busqueda y densidad del canvas; deben generarse en runtime.

### D-021: Borrado confirmado con limpieza en cascada

Decision: borrar un link, nodo o frame requiere confirmacion. El borrado elimina tambien assumptions, links, referencias jerarquicas y datos de layout que dependan del elemento. El frame raiz no se puede borrar.

Razon: los elementos visuales representan un grafo logico; dejar referencias huerfanas produciria diagramas incoherentes y archivos dificiles de recuperar.

### D-022: Persistir el estado de navegacion

Decision: zoom, pan y apertura de paneles forman parte de `ViewState` y se guardan de forma diferida al navegar.

Razon: reabrir un arbol debe devolver al usuario al mismo contexto de trabajo sin convertir cada movimiento del viewport en una operacion visible de guardado.

### D-023: Hints visibles en coordenadas de pantalla

Decision: los keyboard hints se generan para los elementos que intersectan el viewport logico y se dibujan fuera de la capa escalada del canvas.

Razon: las etiquetas deben conservar legibilidad y tamano estable con cualquier zoom, y sus secuencias deben corresponder a lo que el usuario puede ver y seleccionar.

### D-024: Minimap anclado al editor

Decision: el minimapa se posiciona respecto al viewport fijo del editor. Solo su rectangulo interno cambia con zoom y pan.

Razon: escalar el diagrama no debe desplazar los controles de navegacion; el minimapa representa el canvas, pero no forma parte de el.

## 2026-07-15

### D-025: Viewport del minimapa basado en el area desplazable real

Decision: el rectangulo del minimapa se calcula con la proporcion entre el tamano visible del editor y su superficie real de scroll.

Razon: una conversion basada solo en coordenadas logicas puede cambiar numericamente sin comunicar de forma visible cuanto diagrama cabe en pantalla. La geometria real del scroll refleja directamente zoom, paneles y tamano de ventana.

### D-026: El inspector abierto para editar es un estado temporal

Decision: comenzar una edicion puede abrir el inspector, pero al aceptar o cancelar se restaura el estado que tenia antes.

Razon: la edicion necesita un campo visible y enfocado sin convertir una ayuda temporal en un cambio permanente de la disposicion elegida por el usuario.

### D-027: Direccion persistente y transicion local del layout

Decision: cada arbol guarda su direccion de layout. ELK calcula el resultado final y el renderer interpola localmente desde las posiciones actuales.

Razon: la direccion pertenece al diagrama, mientras que la animacion es una presentacion efimera. Separarlas mantiene el modelo limpio y permite que flechas, frames y nodos se muevan de forma sincronizada.

### D-028: La pertenencia a frames se actualiza como una operacion explicita

Decision: mover una entidad a otro frame actualiza tanto `node.frameId` como las listas `frame.nodeIds`. El arrastre y el selector del inspector ejecutan la misma operacion.

Razon: la posicion visual no basta para definir pertenencia. Una unica operacion de dominio evita discrepancias y conserva links y assumptions al reorganizar el diagrama.

### D-029: El frame raiz es un contexto ilimitado

Decision: todo diagrama tiene un frame raiz conceptual que siempre puede actuar como frame activo, pero no se representa como un rectangulo finito.

Razon: siempre debe existir un destino para crear y pegar sin imponer un limite artificial al canvas. El tamano navegable se deriva del contenido real.

### D-030: Pertenencia directa y contencion ancestral son conceptos distintos

Decision: una entidad pertenece directamente a un solo frame. Tambien se considera contenida por todos los frames ancestro de ese frame.

Razon: en una jerarquia anidada, una entidad debe poder estar dentro del frame hijo y, geometricamente, dentro del padre sin aparecer duplicada en sus listas de pertenencia directa.

### D-031: Separar insercion incremental y auto-layout

Decision: crear con `N` usa una colocacion incremental que preserva la forma existente. El comando Layout conserva la capacidad de reorganizar explicitamente todo el diagrama.

Razon: usar el auto-layout global para cada insercion violaria la estabilidad espacial. La insercion puede ampliar frames y trasladar grupos rigidamente sin recalcular su estructura interna.

La colocacion incremental usa el lado opuesto a la direccion configurada:

- `TB`: lado superior.
- `BT`: lado inferior.
- `LR`: lado izquierdo.
- `RL`: lado derecho.

### D-032: La seleccion de frame se resuelve como un cierre transitivo

Decision: seleccionar un frame incluye sus frames descendientes, sus entidades y los links cuyos dos extremos estan dentro del conjunto.

Razon: copiar, borrar, ocultar y otras operaciones deben compartir una unica definicion de contenido interno. Los links con un extremo externo no forman parte del cierre.

### D-033: Pegar crea un subgrafo nuevo en el frame activo

Decision: el portapapeles interno guarda una plantilla del subgrafo seleccionado. Pegar genera identificadores nuevos, conserva relaciones internas y coloca la copia en el frame activo cerca del viewport.

Razon: reutilizar identificadores o links externos corromperia el grafo. El frame activo y el viewport ofrecen un destino predecible incluso al copiar desde otro frame.

### D-034: Los ciclos de tipo pertenecen a la definicion del diagrama

Decision: el orden usado por `Shift+Tab`, los tipos permitidos y sus restricciones se obtienen de una definicion central por tipo de diagrama.

Razon: un ciclo hardcodeado para Goal Tree impediria extender la herramienta a CRT, EC y otros artefactos con vocabularios y reglas diferentes.

### D-035: La ayuda de teclado se deriva del mapa de comandos

Decision: cada comando define sus bindings y una etiqueta legible en la configuracion. El panel izquierdo genera automaticamente el listado completo desde esos datos.

Razon: mantener una lista manual separada hace probable que la interfaz muestre atajos obsoletos. Una unica fuente permite anadir, quitar o personalizar combinaciones sin editar el panel.

### D-036: H y el boton Hints comparten una unica alternancia

Decision: la tecla `H` queda reservada para abrir y cerrar hint mode, no se asigna como etiqueta de seleccion y ejecuta la misma accion que el boton Hints.

Razon: dos controles para el mismo estado deben producir identicas transiciones. Reservar `H` evita que cerrar hints seleccione accidentalmente un elemento etiquetado con esa letra.

### D-037: El enrutado de links forma parte de la geometria compuesta

Decision: la evitacion de entidades y la minimizacion de cruces se resolveran en 3B junto con la contencion de frames. El renderer consumira rutas calculadas en lugar de sustituirlas por lineas rectas.

Razon: una ruta no puede evitar correctamente nodos y frames sin conocer sus limites definitivos. Corregirla antes del layout compuesto produciria una segunda implementacion desechable.

### D-038: Minimizar y enfocar tienen persistencia diferente

Decision: minimizar un frame es estado persistente del diagrama. Poner foco es estado temporal de la vista del usuario.

Razon: la minimizacion cambia la representacion compartida del diagrama, mientras que el foco solo reduce distracciones durante una sesion de trabajo y no debe modificar lo que ven otros contextos.

### D-039: Las conexiones ocultas se representan mediante portales

Decision: cuando un extremo de un link queda oculto por minimizacion o por foco, el link termina en un portal etiquetado en el borde visible. La misma infraestructura se usa en ambos casos.

Razon: duplicar reglas para frames minimizados y vistas enfocadas produciria rutas y selecciones incoherentes. Un portal conserva direccion, multiplicidad e identidad del extremo oculto.

### D-040: Consultar entidades externas no cambia el foco

Decision: la vista enfocada dispone de un panel secundario para buscar, previsualizar y seleccionar entidades exteriores. Estas acciones no abandonan el frame activo salvo orden explicita del usuario.

Razon: el valor del foco es mantener el contexto de trabajo. Saltar al exterior para inspeccionar o conectar una entidad reintroduciria la distraccion que la vista pretende eliminar.

### D-041: La direccion es una preferencia aplicada por Layout

Decision: cambiar la direccion configura la siguiente ejecucion de Layout y marca visualmente esa operacion como pendiente. No reorganiza automaticamente el diagrama.

Razon: el auto-layout sigue siendo una accion explicita para evitar movimientos inesperados. El indicador pendiente comunica la diferencia entre guardar una preferencia y aplicarla.

### D-042: El dominio del minimapa incluye contenido y viewport

Decision: la escala del minimapa se calcula sobre la union entre los limites del contenido y la extension logica visible. El contenido, los links y el rectangulo del viewport usan la misma transformacion.

Razon: cuando el zoom se aleja mas que el tamano del diagrama, escalar solo contra el canvas mantiene el contenido artificialmente grande y deja de comunicar cuanto espacio real ocupa en pantalla.

### D-043: El zoom se ancla a la seleccion

Decision: al cambiar el zoom, el punto de anclaje es el centro del conjunto seleccionado. Si no existe seleccion, se mantiene el centro logico actual del viewport.

Razon: la seleccion representa el contexto activo del usuario y debe permanecer visible mientras cambia la escala. La regla alternativa conserva el comportamiento espacial actual cuando no hay un objetivo explicito.

### D-044: El dominio es independiente de Electron

Decision: reglas, validacion, comandos y transacciones viven en un nucleo Node sin dependencias del DOM. Electron, CLI y un futuro servidor MCP son adaptadores del mismo servicio de aplicacion.

Razon: automatizar la interfaz o duplicar reglas para terminal produciria comportamientos distintos y reduciria las garantias para agentes headless.

### D-045: Undo/Redo usa parches transaccionales

Decision: cada intencion semantica genera parches directos e inversos mediante Immer. No se implementan inversas manuales por operacion ni event sourcing completo como fuente principal.

Razon: los parches restauran borrados en cascada y cambios compuestos sin duplicar logica, manteniendo el JSON actual como estado canonico.

### D-046: La concurrencia se controla por revision e idempotencia

Decision: cada escritura declara `expectedRevision` y `commandId`. El repositorio bloquea el archivo, vuelve a comprobar la revision y escribe atomicamente.

Razon: una UI y un agente pueden operar en procesos diferentes. Las revisiones evitan sobrescrituras silenciosas y el ID permite reintentos seguros.

### D-047: El historial semantico no incluye ViewState

Decision: zoom, pan, paneles, hints y seleccion se persisten fuera de la pila de Undo/Redo. Al aplicar parches historicos se conserva el `ViewState` actual.

Razon: deshacer una edicion no debe transportar al usuario a otra zona del canvas ni cambiar la disposicion de trabajo elegida.

### D-048: Las transacciones declaran si su efecto es espacial

Decision: las entradas de historial incluyen metadatos de categoria. Undo/Redo reutiliza la transicion de Layout cuando la categoria es espacial, sin registrar la animacion como una nueva transaccion.

Razon: deducir el comportamiento visual desde una etiqueta como `Apply layout` es fragil y no escala a mover frames, pegar subgrafos u otras operaciones geometricas.

### D-049: Seleccion general y origenes de links son estados distintos

Decision: la seleccion de trabajo se representa mediante raices explicitas y un cierre derivado. Los nodos marcados como origen para crear links viven en un conjunto independiente.

Razon: seleccionar el contenido de un frame para borrar, copiar o inspeccionar no debe cambiar implicitamente los extremos de una conexion. Cada estado tiene reglas, apariencia y ciclo de vida propios.

### D-050: El cierre de seleccion es una regla compartida del nucleo

Decision: el cierre transitivo de frames se implementa como un modulo puro consumible por Node y por el renderer. Los modulos puros se cargan directamente en ambos entornos sin atravesar el preload.

Razon: borrar, copiar, CLI y UI deben obtener exactamente el mismo conjunto. Cargar codigo compatible con navegador mantiene una sola implementacion sin desactivar el sandbox de Electron.

### D-051: Las transiciones suspenden la persistencia intermedia de vista

Decision: Layout espera a que termine la cola de operaciones y bloquea guardados de ViewState durante su animacion. Solo se confirma el estado espacial final.

Razon: los renders intermedios pueden generar eventos de scroll y guardar una revision mientras el layout nuevo aun parte de la anterior. Esos estados son presentacion temporal, no intenciones persistibles.

### D-052: Cada entrega manual tiene identidad visible

Decision: la aplicacion muestra la version de producto y un identificador de build de prueba en la barra superior y en el titulo de la ventana. Ambos proceden de `package.json` mediante una consulta de solo lectura.

Razon: una version SemVer puede abarcar varias entregas internas. Un build visible permite confirmar de inmediato que la ventana abierta contiene la correccion que se pretende validar.

### D-053: La inicializacion asincrona comparte una promesa

Decision: el motor del workspace conserva tanto la instancia resuelta como la promesa de inicializacion en curso. Todas las solicitudes concurrentes esperan esa misma promesa.

Razon: comprobar solo si existe la instancia deja una ventana de carrera antes de asignarla. Dos llamadas iniciales pueden crear o reiniciar el mismo repositorio simultaneamente.

### D-054: El frame de creacion tiene un control explicito

Decision: el frame activo se mantiene independiente de la seleccion y se elige mediante un selector que incluye el frame raiz conceptual. Su nombre aparece tambien en el estado del canvas.

Razon: seleccionar un nodo no debe cambiar silenciosamente el destino de `N`, pero el usuario necesita ver y modificar ese contexto aunque el frame raiz no tenga borde dibujado.

### D-055: Crear links transfiere la seleccion de nodos a origenes

Decision: al pulsar `L`, los nodos elegidos explicitamente en la seleccion general se copian al conjunto separado de origenes. Seleccionar un frame no transfiere automaticamente todos sus descendientes.

Razon: mantiene separados ambos estados internos y, a la vez, respeta la expectativa de conectar directamente una seleccion multiple de nodos.

### D-056: La interfaz distingue seleccion explicita y cierre derivado

Decision: `Selected` cuenta las raices elegidas por el usuario e `Included` cuenta frames descendientes, entidades y links anadidos por las reglas de cierre. El segundo click sobre un frame seleccionado limpia la seleccion, pero no su contexto activo.

Razon: un total unico parecia contar el frame dos veces conceptualmente y ocultaba por que aparecian mas elementos. Separar intencion y consecuencia hace el modelo verificable.

Revision 2026-07-16: D-059 sustituye estos contadores cuando la seleccion principal es un frame. La separacion interna entre raices explicitas y cierre derivado se conserva, pero la interfaz presenta un inventario de dominio.

### D-057: Root de canvas y frame de arbol son conceptos distintos

Decision: el root conceptual pertenece al canvas compartido. Cada arbol se presenta mediante un frame anfitrion explicito, visible y finito que puede colocarse en el root o dentro de otro frame. Esta decision sustituye la parte de D-006 que trataba el frame principal del arbol como raiz total.

Razon: sobrecargar el root impide componer varios arboles y mezcla limites de navegacion con limites semanticos. La separacion permite jerarquia espacial global sin fusionar los grafos logicos.

### D-058: Los atajos usan defaults, overrides y validacion por ambito

Decision: el mapa integrado define defaults; un archivo de usuario declara overrides. Un motor normaliza combinaciones por plataforma y detecta colisiones dentro de ambitos como global, canvas, editor y modal.

Razon: un archivo editable sin validacion puede dejar comandos inaccesibles o capturar texto. Los ambitos permiten reutilizar combinaciones cuando los contextos son mutuamente excluyentes.

### D-059: El frame muestra un inventario semantico

Decision: al seleccionar un frame, la interfaz muestra entidades agrupadas por los tipos declarados por el diagrama, junto con subframes y links internos. El propio frame no forma parte del inventario.

Razon: `Selected` e `Included` describen el mecanismo de seleccion, pero no ayudan a comprender el contenido del frame.

### D-060: Reparenting tiene comandos propios y hints de frames

Decision: `Cmd+P` mueve la seleccion un nivel al padre. `Cmd+F` abre un modo de destino cuyos hints representan exclusivamente frames validos y el root conceptual. `L` permanece reservado para links.

Razon: reutilizar `L` para conectar o mover segun el tipo del target haria posible una mutacion espacial accidental. Un comando separado expresa la intencion antes de elegir destino.

### D-061: Contenedor espacial y pertenencia logica son independientes

Decision: mover una entidad o frame cambia su ubicacion en la jerarquia del canvas sin cambiar automaticamente `treeId` ni su pertenencia semantica al diagrama. El root puede actuar como area espacial sin frame finito.

Razon: esta separacion permite sacar temporalmente elementos de un frame, componer varios arboles y preservar las reglas de cada grafo. Mover contenido a otro arbol requerira una operacion semantica distinta.

### D-062: M activa seleccion general, no fuentes de links

Decision: `M` alterna un modo de seleccion multiple sobre los elementos generales. Al pulsar `L`, los nodos de esa seleccion se copian al estado separado de fuentes de conexion.

Razon: la apariencia de seleccion hacia esperar que copiar, borrar o arrastrar afectara al grupo. Reservar internamente `M` solo para fuentes de links creaba un estado visualmente amplio pero funcionalmente estrecho.

### D-063: Layout se resuelve recursivamente por contenedor

Decision: cada frame organiza primero sus entidades directas y subframes; los links se colapsan al hijo directo que los representa en ese nivel. ELK relaciona los bloques y los frames operativos compactan su contenido segun la direccion. El resultado se expande despues a coordenadas absolutas.

Razon: un unico grafo plano no puede garantizar contencion ni exclusion. La recursion usa la misma jerarquia que el dominio, limita el alcance de cada calculo y prepara el canvas para varios arboles.

### D-064: Las transacciones espaciales declaran categoria

Decision: cada entrada de historial conserva una categoria independiente de su etiqueta visible. Layout usa `spatial.layout`, y el renderer decide animar Undo/Redo a partir de esa categoria.

Razon: deducir comportamiento desde textos como `Apply layout` es fragil ante traduccion o renombrado. La categoria convierte la animacion en parte estable del contrato de la operacion.

### D-065: Las rutas usan la geometria mas simple que satisface las restricciones

Decision: cada link intenta primero una recta entre los lados preferentes que determina la direccion del diagrama. Solo usa una ruta ortogonal cuando la recta invade una entidad o cruza otra ruta de forma evitable.

Razon: minimizar cruces no implica maximizar codos. Las rectas preservan mejor la lectura del arbol cuando el layout ya ha separado correctamente sus capas.

### D-066: Fijar un frame conserva posicion, no dimensiones obsoletas

Decision: Layout mantiene las coordenadas de un frame fijado, pero recalcula su ancho y alto a partir del contenido actual, los subframes y los margenes definidos.

Razon: conservar simultaneamente posicion y tamano impide que el frame se ajuste tras borrar, mover o reorganizar entidades. El pin expresa un ancla espacial, no un bloqueo de su caja.

### D-067: Layout elige entre varias soluciones mediante una funcion de calidad

Decision: los frames de diagrama con suficiente complejidad ejecutan varias configuraciones deterministas de ELK. Se comparan por cruces, entidades atravesadas, longitud, area y estabilidad. La variante relajada que invertia atajos aciclicos queda retirada por `D-073`; todas las candidatas reciben el mismo DAG preparado.

Razon: una unica ejecucion de un algoritmo heuristico puede producir una ordenacion mediocre. La diversidad de candidatos debe optimizar la geometria sin cambiar las restricciones semanticas del grafo.

### D-068: Los casos visuales de referencia son fixtures de dominio

Decision: el ejemplo complejo de Goal Tree se conserva como un workspace JSON independiente y versionado. Las pruebas de modelo, Layout y renderer cargan el mismo archivo en lugar de reconstruir una aproximacion distinta en cada suite.

Razon: una captura sirve para comunicar el problema, pero no fija con precision entidades, links ni expectativas. Un fixture compartido convierte el ejemplo en un contrato reproducible y tambien puede consumirse desde herramientas headless.

### D-069: Capas semanticas y puertos distribuidos forman parte del layout

Decision: la definicion de Goal Tree declara una estratificacion por distancia al Goal. Los links que comparten un lado de una entidad reciben puertos ordenados y separados. Las puntas compensan el zoom para conservar un tamano estable en pantalla.

Razon: cero cruces no basta si un CSF aparece mezclado con NC o varias puntas terminan superpuestas. La jerarquia de dominio, la separacion de llegadas y la escala perceptiva son restricciones distintas que deben verificarse expresamente.

### D-070: La disposicion actual compite contra ELK con un umbral de mejora

Decision: Layout evalua `CURRENT` y todas las variantes ELK mediante una puntuacion ponderada. Entre layouts factibles, el candidato ELK ganador se aplica solo si su coste es al menos un 15% menor que el actual. Un `CURRENT` que incumple una restriccion dura, incluida la direccion de un DAG, no puede acogerse al umbral.

Razon: recalcular no equivale a mejorar. Un umbral explicito protege el mapa mental del usuario frente a diferencias pequenas o ruido heuristico, mientras permite reemplazar composiciones claramente deficientes.

### D-071: Las pruebas visuales aleatorias son deterministas y diagnosticas

Decision: los escenarios visuales pseudoaleatorios declaran una semilla, una densidad de links y una estructura de frames. La prueba exige generacion y colocacion repetibles, pero registra los defectos de calidad como `needs work` mientras sirven de linea base y aun no forman parte del contrato de aceptacion.

Razon: una captura aleatoria irrepetible no permite depurar ni comparar versiones. Al mismo tiempo, hacer fallar toda la suite por un defecto que la propia prueba acaba de descubrir impediria usarla como instrumento intermedio. Separar ejecucion correcta de evaluacion visual conserva ambos significados.

### D-072: El borrado frecuente usa Undo en lugar de confirmacion modal

Decision: borrar una seleccion valida es inmediato. La aplicacion conserva las protecciones estructurales y registra el borrado como una transaccion atomica reversible, pero no solicita confirmacion previa.

Razon: un dialogo en cada borrado interrumpe un flujo de edicion intensivo. Cuando la operacion puede deshacerse completamente y los elementos irremplazables estan protegidos, Undo ofrece recuperacion sin convertir cada accion normal en una decision modal.

### D-073: La direccion es estricta salvo para restaurar ciclos

Decision: antes de invocar ELK, el coordinador calcula un orden aciclico. En un DAG conserva todas las aristas. Si detecta ciclos, aplica una aproximacion determinista de feedback arc set, invierte solo esas aristas en el grafo de layout y calcula rangos por el camino mas largo al destino. Tras obtener posiciones, enruta todos los links con sus extremos semanticos originales.

Razon: una flecha invertida en un DAG comunica una dependencia distinta y no puede intercambiarse por compacidad. Un ciclo, en cambio, hace matematicamente imposible que todas las aristas avancen sobre un unico eje; registrar la ruptura temporal hace explicable y comprobable la excepcion inevitable.

### D-074: La ruta geometrica y su trazo visual son contratos separados

Decision: el coordinador persiste una ruta neutral formada por puntos y libre de obstaculos. El renderer puede proyectarla como polilinea ortogonal o como curva suave. Los enlaces directos usan Bezier cubico con tangentes perpendiculares; los desvios usan curvas cuadraticas acotadas por la longitud de cada tramo.

Razon: pedir a cada estilo visual que vuelva a resolver navegacion, cruces y obstaculos duplicaria la parte mas delicada del sistema. Separar topologia de representacion permite comparar legibilidad sin alterar posiciones, semantica, historial o garantias geometricas.

### D-075: Puertos, posiciones de capa y tamano de frame son variables del layout

Decision: los extremos no se fijan al centro de una cara. Se proyectan hacia el nodo opuesto, se ordenan y se separan dentro de la cara preferente. ELK compara variantes compactas y ampliadas que desplazan entidades sobre el eje transversal de su capa; el frame adopta despues la caja del candidato elegido. El renderer reserva un tramo terminal recto cuyo minimo se calcula en pantalla para no quedar oculto por la punta.

Razon: tratar puertos, coordenadas transversales y limites del contenedor como constantes elimina grados de libertad que pueden evitar cruces sin cambiar capas ni semantica. Optimizarlos conjuntamente permite mejorar legibilidad antes de introducir desvios adicionales.

### D-076: El ciclo multiple sincroniza antes de avanzar

Decision: `Shift+Tab` usa el orden de tipos del registro. Sobre una entidad avanza desde el tipo actual; sobre varias inicia una sesion de ciclo que las lleva al primer tipo repetible y despues incrementa un indice comun. Cambiar la seleccion reinicia esa sesion. El cambio completo se ejecuta mediante `nodes.update-type` como una transaccion atomica.

Razon: avanzar cada entidad desde un tipo distinto conserva la heterogeneidad y hace dificil predecir el resultado colectivo. Sincronizar crea una operacion de clasificacion rapida, mientras la transaccion unica garantiza que historial, validacion y futuras interfaces headless observen una sola intencion.

### D-077: La insercion reserva espacio para sus controles temporales

Decision: la colocacion consecutiva de `N` compara rectangulos completos y usa una cuadricula con 44 unidades de separacion. Esta reserva incluye el area superior donde aparecen los hints. Si una nueva fila rebasa un frame finito, se amplian ese frame y sus ancestros para conservar contencion.

Razon: evitar que dos origenes coincidan no evita que sus entidades o etiquetas se tapen. Los controles temporales tambien forman parte de la geometria de uso y deben influir en la separacion minima aunque no se persistan como elementos del dominio.

### D-078: La seleccion primaria tiene un lenguaje visual propio y estable con zoom

Decision: todos los elementos que son raices explicitas de la seleccion usan un azul exclusivo, un refuerzo de forma y un halo, mientras los elementos incorporados por el cierre de seleccion conservan una indicacion dorada secundaria. El ultimo elemento activo se mantiene como referencia del inspector, pero no determina por si solo el resaltado. Los trazos SVG de seleccion no escalan con el canvas y el control central de un link seleccionado no depende del estado global de hints.

Razon: reutilizar colores de Types obliga a interpretar el significado por tono y un trazo que se reduce con zoom deja de comunicar estado. La seleccion es una condicion operativa y debe reconocerse de inmediato por color, grosor y contorno, incluso sobre elementos semanticamente coloreados o en vistas alejadas.

### D-079: El registro de comandos es tambien el manifiesto de auditoria

Decision: la auditoria de teclado enumera comandos y bindings directamente desde `command-config.js`. Cada binding se ejecuta sobre un fixture reiniciado, comprueba una consecuencia semantica especifica y produce evidencia visual. Las capturas se regeneran localmente y el log estable se conserva en Git.

Razon: mantener manualmente otra lista de atajos permite que el panel, el matcher y las pruebas diverjan. Una unica fuente garantiza cobertura al crecer el registro, mientras los fixtures aislados evitan que operaciones destructivas o historicas contaminen casos posteriores.

### D-080: Los comandos de creacion relacional deben producir estructura completa

Decision: `A` crea una entidad de soporte y el link hacia la seleccion; `Shift+A` crea una condicion padre y el link desde la seleccion. Ambos dejan activa la nueva entidad y buscan una posicion libre que preserve contencion y exclusion de frames.

Razon: un comando llamado parent o supporting condition no esta completo si solo crea una caja. La relacion es parte de su significado, y una operacion semanticamente correcta sigue siendo defectuosa si el resultado aparece solapado o deforma su frame sobre elementos ajenos.

### D-081: El modo contextual posee las letras sin modificadores

Decision: mientras la seleccion multiple esta activa, cualquier letra sin modificadores se interpreta como parte de un hint antes de consultar comandos globales. `Enter` finaliza conservando la seleccion, `Esc` limpia primero el buffer parcial y `Ctrl+G` cancela y limpia. Los comandos con modificadores, como `Cmd+F`, permanecen disponibles.

Razon: una `M` no puede significar de forma determinista a la vez caracter de una etiqueta y cierre inmediato del modo. Dar propiedad de las letras al contexto elimina la ambiguedad para todo el alfabeto y evita mantener listas crecientes de excepciones.

### D-082: Los diagramas comparten kernel, no una forma semantica unica

Decision: Goal Tree, CRT, FRT, EC, PrT y TrT se modelaran como diagramas con elementos y relaciones n-arias definidos por un registro. Las junctions seran proyecciones seleccionables de relaciones y no nodos de contenido. Un compilador por definicion generara el `LayoutGraph` consumido por el unico backend ELK layered.

Razon: los diagramas alternan causa suficiente y condicion necesaria, admiten operadores y topologias diferentes y asignan significado distinto a ciclos, assumptions e injections. Añadir flags a links binarios o condicionales al renderer mezclaria dominio y presentacion, y haria fragiles copiar/pegar, CLI, validacion y layout.

### D-083: Los diagramas oficiales usan la misma arquitectura que los personales

Decision: Goal Tree, CRT, FRT, EC, PrT y TrT se entregaran como paquetes declarativos versionados. El runtime y la CLI los cargaran con el mismo compilador que las definiciones creadas o bifurcadas por el usuario. El futuro Diagram Studio editara esos paquetes, no codigo fuente ni un modelo paralelo.

Razon: hardcodear los diagramas oficiales y ofrecer extensibilidad solo para casos secundarios crea dos productos y dos niveles de capacidad. Una unica ruta de carga obliga a que el contrato sea suficiente, comprobable y portable. Prohibir JavaScript arbitrario mantiene seguridad, determinismo y compatibilidad headless.

### D-084: El formato publico se gana mediante verticales semanticas

Decision: `diagram-definition` permanecera como contrato interno hasta demostrar
paridad de Goal Tree, una implementacion vertical de CRT y un spike de EC sobre
el mismo kernel. El cambio de schema sera aditivo y reversible. Las operaciones
colectivas sobre relaciones n-arias se cerraran antes de congelar la version
publica, y Diagram Studio no comenzara hasta superar los gates de migracion,
seguridad y portabilidad.

Razon: una abstraccion probada solo con Goal Tree puede parecer generica y aun
ocultar supuestos binarios, jerarquicos o visuales. Publicarla o construir un
editor sobre ella demasiado pronto convierte cada descubrimiento metodologico
posterior en una ruptura de compatibilidad.

### D-085: La combinacion implicita depende del modo logico

Decision revisada el 2026-07-16: cada flecha directa sera una relacion `SIMPLE`.
El destino agregara las relaciones entrantes como `OR` en diagramas de
suficiencia y como `AND` en diagramas de necesidad. Una relacion n-aria agrupa
entradas mediante un junctor explicito `AND`, `OR`, `MAG` o `XOR`. Por tanto, las
causas independientes de CRT/FRT permanecen como relaciones separadas y no
muestran un junctor `OR` redundante.

Razon: la misma geometria de flechas entrantes tiene una lectura distinta segun
el modo logico. Confundir operador semantico con simbolo visible produce
diagramas metodologicamente incorrectos y obliga a dibujar elementos que no
aportan informacion.

### D-086: Agrupacion explicita y agregacion del destino son niveles distintos

Decision: el kernel compondra argumentos en dos niveles. Primero, cada relacion
convierte una o varias entradas en un argumento simple o agrupado. Segundo, la
entidad destino combina todos sus argumentos entrantes usando el default de su
`logicMode`. Las assumptions se asociaran a la relacion completa o a uno de sus
tramos, no al simbolo visual sintetico.

Razon: esta separacion expresa `A OR (B AND C)` y `A AND (B OR C)` sin nodos
ficticios, conserva una identidad independiente por flecha y evita confundir el
operador de un grupo con la regla general del diagrama.

### D-087: Un conflicto EC no es un junctor XOR

Decision: `CONFLICT` sera un tipo de relacion sin `combination`. Conectara los
dos wants y tendra presentacion propia. `XOR` permanecera disponible para grupos
causales o alternativas realmente mutuamente excluyentes, pero no se inferira
por el mero hecho de existir un conflicto.

Razon: una EC puede describir condiciones opuestas, pero tambien alternativas
que podrian coexistir si hubiera suficientes recursos. Codificar todo conflicto
como XOR convertiria una restriccion contextual en una imposibilidad logica.

### D-088: La doble representacion solo existe dentro de una migracion controlada

Decision: la primera migracion al kernel sera aditiva y conservara intacto el
modelo `0.2`. La proyeccion semantica incluira una huella de los campos de
origen y sera inicialmente de lectura. No se habilitaran escrituras
independientes sobre kernel y links legacy; un unico commit transaccional debera
actualizar la fuente canonica y su proyeccion de compatibilidad.

Razon: mantener dos grafos editables permite divergencias silenciosas que una
migracion aparentemente reversible no puede resolver. Una envoltura temporal
con deteccion de obsolescencia permite probar el nuevo contrato y volver atras
sin datos perdidos, mientras se construye el punto de escritura definitivo.

### D-089: La EC tiene roles y geometria canonicos

Decision: una Evaporating Cloud asignara roles unicos `A=OBJECTIVE`,
`B/C=NEED` y `D/D'=WANT`. El compilador de layout preservara tres columnas y
dos ramas paralelas: `D -> B -> A` y `D' -> C -> A`. El conflicto conectara
exclusivamente `D` y `D'`; no se permitira cruzar wants con el need de la otra
rama aunque las cardinalidades sigan siendo validas.

Razon: contar Types y enlaces comprueba una topologia debil, pero no la gramatica
de la herramienta LTP. En una EC la posicion comunica el papel argumental y
permite leer cada rama completa sin ambiguedad. Un layout libre puede producir
un grafo conectado que ya no sea una Cloud metodologicamente reconocible.

### D-090: Cada break point de EC posee assumptions inspeccionables

Decision: cada flecha de necesidad y cada conflicto entre prerequisites sera un
subject independiente de assumptions. En la EC bipolar son las cuatro flechas
rectas y el conflicto `D-D'`; una EC multipartita anade los subjects de sus
ramas y conflictos concretos. Una EC `ACCEPTED` no podra dejar ninguno sin
cobertura. Las flechas rectas usaran scope `RELATION`; el conflicto exigira
scope `CONFLICT` y una formulacion que explique que falta para permitir ambas
posiciones.

Razon: las assumptions no decoran la Cloud; son el material sobre el que se
descubre una injection. El conflicto requiere una pregunta diferente de una
flecha de necesidad, y mezclar ambos scopes induce respuestas que defienden una
rama en vez de explicar por que las dos posiciones no pueden coexistir.

### D-091: Cada proyecto abierto posee una unica WorkspaceSession

Decision: el proceso principal mantendra un `WorkspaceManager` indexado por el
locator canonico de cada carpeta. Dos aperturas del mismo proyecto compartiran
repositorio, motor, revision e historial; proyectos distintos conservaran
sesiones completamente aisladas.

Razon: crear un motor por ventana permite que dos copias del mismo proyecto
divergieran en memoria. Usar un unico motor global impide trabajar con proyectos
en paralelo y mezcla Undo, revision y futuro contexto LLM.

### D-092: Documento, vista y ventana son identidades distintas

Decision: un documento identifica un arbol persistente; una vista identifica
zoom, pan, seleccion y frame enfocado; una ventana aloja una o mas vistas. Un
mismo documento podra tener varias vistas simultaneas sin duplicar datos.

Razon: pestanas, multimonitor y foco de frames son composiciones de vistas, no
copias del arbol. Mezclar estado visual con identidad documental provoca
sobrescrituras, Undo espacial inesperado y documentos duplicados.

### D-093: CRT usa semantica nativa y una proyeccion visual regenerable

Decision: los nuevos diagramas nacen con semanticKernel.storageMode = NATIVE.
Nodos, enlaces y junctions del canvas son una proyeccion con huella de frescura.
Goal Tree conserva temporalmente LEGACY_PROJECTION hasta completar su migracion.

Razon: una relacion n-aria no puede reconstruirse con garantias desde segmentos
visuales. Declarar la autoridad evita escrituras en ambos sentidos y permite que
layout, renderer y formatos futuros cambien sin modificar el razonamiento.

### D-094: Los junctions pertenecen a la relacion que proyectan

Decision: un junction se identifica como junction:<relationId>, y sus tramos
como <relationId>:input:<elementId> y <relationId>:output:<elementId>.
Seleccionar o borrar el junction opera sobre la relacion; el junction no
participa en Type ni en el inventario semantico.

Razon: el simbolo debe tener identidad estable para layout, seleccion, rutas y
pruebas, pero no representa una afirmacion independiente del usuario.

### D-095: Las restricciones canonicas se compilan sobre ELK

Decision: ELK layered permanece como motor unico. Las definiciones pueden
declarar columnas y ramas paralelas; un compilador neutral las transforma en
particiones de rango, carriles y predicados de factibilidad aplicados a cada
candidato antes de su puntuacion. Una disposicion que viola estas restricciones
no se conserva por estabilidad aunque su mejora ponderada sea inferior al 15%.

Razon: la estabilidad protege el mapa mental entre layouts validos, pero no
puede legitimar una EC con ramas cruzadas. Separar constraint, generacion y
puntuacion evita tanto las coordenadas hardcodeadas como un motor especial.

### D-096: CONFLICT se renderiza pero no ordena las capas

Decision: `CONFLICT` se proyecta como un enlace visual no direccional con estilo
propio y sin punta de flecha. Participa en seleccion, assumptions, routing,
geometria, borrado y export, pero queda excluido del ranking causal y del conteo
de excepciones de direccion.

Razon: D-D' expresa incompatibilidad contextual, no precedencia ni necesidad.
Tratarlo como flecha de layout introduce un ciclo falso; ocultarlo eliminaria
uno de los cinco break points de la Cloud.

### D-097: Assumptions es una superficie principal de trabajo

Decision: cada linea mostrara un indicador compacto de cantidad y estado de sus
assumptions. La inspeccion detallada tendra dos niveles: contexto de la linea y
Assumption Workbench global. Ambos seran completamente operables con teclado y
compartiran comandos de dominio y Undo/Redo.

Razon: en EC, la linea solo expresa la relacion asumida; el trabajo de romper la
Cloud ocurre al explicitar e invalidar lo que la sostiene. Ocultar assumptions
en un inspector secundario convierte el contenido central del metodo en
metadatos y dificulta detectar break points sin cobertura.

### D-098: Invalidar una assumption no equivale a borrarla

Decision: las assumptions tendran un estado de revision que distinga al menos
borrador, soportada, desafiada e invalidada. Invalidar preservara statement,
subject, fuentes, notas, historial e injections relacionadas. El borrado se
reservara para errores de captura o duplicados.

Razon: una assumption invalidada es la evidencia que explica por que una
injection puede evaporar el conflicto. Eliminarla destruye la trazabilidad del
razonamiento y hace imposible revisar o revertir la decision.

### D-099: Los atajos de assumptions usan un scope contextual

Decision: el canvas, el contexto de una linea y el Assumption Workbench tendran
scopes de comando explicitos. Dentro del contexto, teclas como `N`, `Enter` y
`Delete` operaran sobre assumptions; al cerrarlo recuperaran su significado en
el canvas. Keyboard, Command Palette y pruebas se generaran del mismo registro.

Razon: reutilizar teclas familiares dentro de un modo bien identificado reduce
carga cognitiva sin crear colisiones. Resolverlo con listeners ad hoc haria que
la misma pulsacion pudiera crear un nodo y una assumption o que la auditoria no
reflejara el comportamiento real.

### D-100: Navegacion bidimensional dentro del contexto de assumptions

Decision: `ArrowUp` y `ArrowDown` recorreran assumptions de la linea activa;
`ArrowLeft` y `ArrowRight` cambiaran a la linea logica anterior o siguiente.
`Ctrl+P/N/B/F` seran aliases en las mismas cuatro direcciones. Fuera del
contexto conservaran su funcion de pan; dentro de un editor mantendran el
movimiento nativo del cursor. `H` y `M` usaran el mismo motor de hints
existente, pero limitaran sus targets al scope activo.

Razon: las flechas son mas accesibles que corchetes en distintas distribuciones
de teclado y expresan naturalmente las dos dimensiones del Workbench. Un motor
de hints compartido mantiene seleccion simple y multiple coherentes, incluida
la prioridad contextual de letras que formen parte de una etiqueta. La
precedencia `editor > assumptions > canvas` evita capturar comandos de edicion
o confundir `Ctrl+F` con `Cmd+F`.

### D-101: La cardinalidad EC se modela con ramas, no con nuevos roles rigidos

Decision: cada pareja requirement-prerequisite tiene un `branchId` estable y
forma `WANT -> NEED -> OBJECTIVE`. Los conflictos permanecen binarios entre
wants de ramas concretas y deben formar un grafo conectado. Los roles
`B/C/D/D'` o `R1/R2/R3/P1/P2/P3` son etiquetas visibles unicas, no claves
estructurales.

Razon: Dettmer admite EC con tres o mas posiciones, pero recomienda resolver
conflictos por parejas y reevaluar las restantes. Inventar `D''`, `D'''` o una
relacion ternaria hardcodeada mezclaria notacion con identidad, complicaria
assumptions por conflicto y obligaria a reescribir layout y validacion para cada
cardinalidad.

### D-102: El estado agregado de una linea no sustituye el detalle

Decision: cada linea muestra cantidad y un estado agregado con precedencia
`INVALIDATED > CHALLENGED > SUPPORTED > DRAFT`; cero assumptions se representa
como `uncovered`. El inspector y el Workbench conservan siempre los estados
individuales.

Razon: el canvas necesita senalar rapidamente donde trabajar sin convertir una
mezcla de assumptions en una conclusion binaria. La precedencia hace visibles
los riesgos, mientras el detalle evita inferir que todas las assumptions estan
invalidadas o soportadas por el color de la linea.
