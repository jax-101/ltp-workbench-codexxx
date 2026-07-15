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
