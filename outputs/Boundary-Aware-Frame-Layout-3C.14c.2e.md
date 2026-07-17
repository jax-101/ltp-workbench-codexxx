# Collision-free hints and boundary-aware frame layout 3C.14c.2e

Estado: PASS en build 3C.14c.2e.

## Comportamiento

- Los hints se separan automaticamente en espacio de pantalla.
- Las etiquetas reservan el area de los indicadores de links.
- Los nodos de un frame que comparten un mismo extremo exterior conservan una
  sola capa sobre el eje perpendicular a la direccion del diagrama.
- El orden lateral previo se mantiene y el frame se ajusta al contenido.
- Los nodos sin contexto interno ni exterior siguen usando una cuadricula
  compacta.

## Arquitectura

El layout compuesto calcula una firma minima para las relaciones que cruzan el
borde de cada frame. Si todos los elementos directos comparten un extremo,
aplica la estrategia `shared-boundary-layer`; el frame sigue siendo una sola
unidad para su padre. El renderer trata las coordenadas de hint como anclas y
resuelve las posiciones finales despues del zoom.

## Pruebas

- Layout estructural y contencion: `npm run test:layout`.
- Capturas de hints y cuatro CSF: `npm run test:visual`.
- Regresion aleatoria de frames y links: `npm run test:layout-random`.
- Regresion completa sin interfaz: `npm run test:prototype -- --no-smoke`.
