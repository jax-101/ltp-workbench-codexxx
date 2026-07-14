# Manual Test Guide: Interface Iteration 1

Esta prueba abre el ejemplo incluido con la aplicacion y guarda los cambios en un archivo de prueba separado. No modifica el workspace normal.

## Arranque

1. Abre Terminal.
2. Ejecuta:

   ```bash
   cd "/Users/jullivarri/Documents/Codex/2026-07-13/LTP Workbench"
   npm run test:manual
   ```

3. Comprueba que la ventana se titula `LTP Workbench - Manual Test`.

Para terminar, cierra la aplicacion con `Cmd+Q`.

## Prueba 1: hint de dos letras

1. Pulsa `N` cuatro veces para superar los 26 elementos seleccionables.
2. Pulsa `H`.
3. Busca el indicador `AA`.
4. Pulsa `A` una vez.
5. Comprueba que no se crea otro nodo y que la aplicacion espera otra letra.
6. Pulsa `A` otra vez.
7. Comprueba que se selecciona el elemento marcado como `AA`.

Resultado esperado: `AA` se interpreta como una unica seleccion y ninguna de sus letras ejecuta otro comando.

## Prueba 2: conservar la vista

1. Desplaza el canvas lejos de la esquina superior izquierda usando las barras de desplazamiento.
2. Pulsa `H`.
3. Comprueba que la vista no cambia de posicion.
4. Selecciona mediante un hint un elemento que este en la zona visible.
5. Haz click en otro elemento cercano.

Resultado esperado: mostrar hints y cambiar la seleccion no devuelve el canvas al origen.

## Prueba 3: direccion de las flechas

1. Observa varios links entre entidades.
2. Selecciona un link mediante su boton circular `L`.
3. Comprueba tanto el estado normal como el seleccionado.

Resultado esperado: la punta es visible, termina en el borde del nodo destino y el link seleccionado se distingue en rojo.

## Prueba 4: texto completo

1. Selecciona un nodo con texto largo.
2. Pulsa la barra espaciadora.
3. Cierra la vista con `Esc`.
4. Abrela de nuevo con doble click sobre el nodo.
5. Prueba tambien el boton `View full statement` del inspector.

Resultado esperado: los tres caminos muestran el texto completo y se pueden cerrar sin perder la posicion del canvas.

## Prueba 5: regresion basica

Comprueba que siguen funcionando:

- `N`: crear nodo.
- `a`: crear condicion de soporte.
- `Shift+A`: crear condicion superior.
- `L`: iniciar una conexion.
- `F`: crear frame.
- `P`: fijar o liberar posicion.
- `Cmd+Shift+L`: ejecutar layout.

## Registro de resultados

Anota para cada prueba:

- `OK` o `Falla`;
- que accion estabas realizando;
- que esperabas ver;
- que ocurrio realmente.

Las observaciones se incorporaran despues a `outputs/Feedback-Log.md`.
