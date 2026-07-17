# On-demand assumption indicators 3C.14c.2d

Estado: PASS en build 3C.14c.2d.

## Comportamiento

- Los contadores de assumptions y su coverage estan ocultos por defecto.
- `H` los revela junto con los targets de seleccion de links.
- El link seleccionado conserva su indicador al cerrar los hints.
- El contexto de assumptions mantiene visible la linea activa.
- Inspector y Assumption Workbench conservan el detalle permanente.

## Implementacion

Los estados de coverage ya reutilizaban `.link-target`; se eliminaron las
reglas especificas que forzaban opacidad permanente. La visibilidad vuelve a
depender del estado compartido de hints, seleccion y contexto, sin introducir
un segundo toggle.

## Pruebas

- Estado oculto y revelado con H: `npm run test:ec:visual`.
- Auditoria general de hints y zoom: `npm run test:visual`.
- Regresion de atajos: `npm run test:shortcuts`.
