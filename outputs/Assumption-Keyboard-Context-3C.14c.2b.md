# Assumption keyboard context 3C.14c.2b

Estado: PASS en build 3C.14c.2b.

## Flujo entregado

- `H` selecciona el indicador de una linea y mantiene los hints activos sobre
  sus assumptions, sin exigir una segunda pulsacion.
- `H` dentro del contexto vuelve a mostrar los hints de assumptions.
- `M` desde una linea o dentro del contexto inicia y termina seleccion multiple
  limitada a assumptions.
- Las letras de una secuencia de hints tienen prioridad sobre `H` y `M` mientras
  la seleccion multiple esta activa.
- `ArrowUp`/`Ctrl+P` y `ArrowDown`/`Ctrl+N` recorren assumptions ciclicamente.
- `ArrowLeft`/`Ctrl+B` y `ArrowRight`/`Ctrl+F` cambian de linea en un orden
  visual determinista.
- `N` crea una assumption en la linea activa.
- `Enter` abre el editor y un segundo `Enter` acepta; `Shift+Enter` conserva la
  insercion de una nueva linea.
- `Delete`, `Backspace` y `Ctrl+D` eliminan la assumption o seleccion atomica.
- `Ctrl+G` cierra el contexto y limpia la seleccion.
- Una linea sin assumptions tambien puede abrirse para crear la primera.

## Scopes

La precedencia efectiva es `editor > assumptions > canvas`. Un textarea o
selector conserva las teclas nativas; al aceptar vuelve al contexto de
assumptions. Al cerrarlo, las flechas y Ctrl+P/N/B/F recuperan el pan del canvas.

Keyboard y Command Palette reutilizan el registro declarativo existente, pero
muestran etiquetas contextuales como `Create assumption`, `Next assumption` y
`Next logical line`.

## Pruebas

La prueba Electron ejecuta el journey completo: indicador, hint, seleccion,
navegacion vertical y horizontal, M, N, Ctrl+D, doble Enter y etiquetas
contextuales. Despues restaura el conteo original y valida layout, conflictos,
flechas, roles, coverage y geometria.

- Regresion completa: `npm run test:prototype -- --no-smoke`.
- Journey visual: `npm run test:ec:tripartite:visual`.
- Evidencia: `outputs/test-evidence/3C.14c.2b/ec-tripartite/`.

## Siguiente gate

Falta el Assumption Workbench global: inventario de todas las lineas, filtros de
coverage y estado, busqueda, operaciones colectivas entre lineas y trazabilidad
hacia injections.
