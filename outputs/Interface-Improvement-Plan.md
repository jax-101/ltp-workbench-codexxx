# Interface Improvement Plan

Plan de evolucion del prototipo a partir del feedback F-010 a F-028. Estas son iteraciones de interfaz y no sustituyen las fases de producto definidas en el PRD.

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

Estado: implementada; pendiente de validacion manual.

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

Incluye:

- F-014: borrado seguro de links, entidades y frames.
- F-020: zoom, pan, centrar seleccion y ajustar a pantalla con teclado.
- F-013: paneles laterales plegables.
- F-012: minimapa sincronizado con el viewport.

Criterios de aceptacion:

- El borrado limpia relaciones y referencias sin dejar datos huerfanos.
- Todas las operaciones principales de navegacion funcionan sin raton.
- El estado de vista se conserva al guardar y reabrir.

## Iteracion 3: frames jerarquicos

Incluye:

- F-017: arbol de frames y breadcrumbs.
- F-016: vista enfocada de un frame.
- F-015: colapso de frames con conexiones externas preservadas.

Criterios de aceptacion:

- Se puede entrar y salir de cualquier nivel de frame.
- La vista enfocada solo muestra el contenido del frame activo.
- Un frame colapsado oculta sus descendientes y recibe en su borde los links externos.

## Iteracion 4: layout

Incluye:

- F-021: transicion animada del auto-layout.
- F-022: direccion preferente segun el tipo de diagrama.
- Layout por frame, respeto de posiciones fijadas y soporte de frames anidados.

## Iteracion 5: diagramas extensibles

Incluye:

- F-023: registro declarativo de tipos de diagrama.
- Configuracion de tipos de nodo, atributos, links permitidos, logica, verbalizacion, validaciones y layout.
- Personalizacion de combinaciones de teclas sobre el registro interno de comandos.
- Goal Tree como primera definicion; CRT y EC como siguientes validaciones de la infraestructura.

## Dependencias principales

- Estado de vista -> preservar scroll -> zoom/pan -> minimapa.
- Registro de comandos -> teclado estable -> atajos configurables.
- Jerarquia de frames -> vista enfocada -> colapso -> layout compuesto.
- Registro de diagramas -> direccion -> tipos y reglas -> CRT/EC.
