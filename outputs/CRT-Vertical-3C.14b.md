# CRT vertical 3C.14b

Estado: PASS en build 3C.14b.1.

## Alcance entregado

- CRT usa semanticKernel.storageMode = NATIVE como unica fuente de verdad.
- La vista se deriva de forma determinista y conserva posiciones y frames por ID.
- Los junctions son elementos visuales sinteticos con ID
  junction:<relationId>; nunca entran en semanticKernel.elements.
- El oracle contiene 9 elementos, 9 relaciones, 2 assumptions, un AND
  conceptual y un bucle negativo.
- La relacion AND se proyecta como un junction y 3 segmentos estables; las
  relaciones simples permanecen como flechas directas.
- ELK layered usa direccion BT, rompe el bucle solo para calcular capas y
  restaura todas las relaciones semanticas.
- CRUD nativo cubre elementos, relaciones n-arias y assumptions, incluidas
  cascadas y Undo/Redo atomicos.
- Renderer y teclado cubren crear con N, cambiar Type con Shift+Tab y borrar con
  Ctrl+D.
- CLI puede inspeccionar el grafo con semantic show y editar una entidad sin
  escribir sobre la proyeccion visual.
- El export Markdown de CRT enumera elementos, relaciones, combinaciones y
  assumptions sin usar encabezados de Goal Tree.

## Invariantes probados

- Una mutacion semantica invalida la huella visual.
- Regenerar la proyeccion no mueve elementos existentes.
- Layout no modifica el kernel.
- El downgrade de migracion no elimina una fuente nativa.
- Borrar una entidad elimina relaciones y assumptions dependientes.
- Undo restaura semantica y proyeccion en una sola operacion.
- Un junction se muestra como AND, pero no puede ciclarse como Type de entidad.

## Evidencia

- Core: npm run test:crt.
- Electron: npm run test:crt:visual.
- Fixture: outputs/crt-workspace-v0.1.json.
- Captura e informe: outputs/test-evidence/3C.14b.1/crt/.
- Suite completa: npm run test:prototype -- --no-smoke y smoke Electron.

## Limites conscientes

- El registro de Goal Tree y CRT sigue embebido en codigo. La carga de paquetes
  declarativos versionados pertenece a 3C.15.
- La UI aun no crea relaciones AND/MAG/XOR desde un constructor dedicado; el
  core y la CLI ya admiten relaciones n-arias.
- Copiar/pegar y borrado colectivo de relaciones n-arias permanecen en el gate
  de operaciones colectivas.
- El bucle se conserva y produce una excepcion de direccion deliberada; queda
  pendiente una presentacion visual especifica para feedback edges.
