# Manual Test Guide: Interface Iterations 1 through 3.0

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
3. Cierra la vista pulsando de nuevo la barra espaciadora.
4. Abrela de nuevo con doble click sobre el nodo.
5. Pulsa `Enter`.
6. Comprueba que el pop-up se cierra y el statement queda enfocado en el inspector.
7. Prueba tambien el boton `View full statement` del inspector y el cierre con `Esc`.

Resultado esperado: el pop-up alterna con `Espacio`; `Enter` permite seguir editando y `Esc` sigue funcionando.

## Prueba 5: confirmar la edicion

1. Selecciona un nodo.
2. Pulsa `Enter`.
3. Modifica el statement.
4. Pulsa `Shift+Enter` y escribe una segunda linea.
5. Pulsa `Enter` sin `Shift`.

Resultado esperado: el primer `Enter` comienza la edicion, `Shift+Enter` crea una linea y el ultimo `Enter` guarda y devuelve el foco al canvas.

## Prueba 6: crear dentro del viewport

1. Desplaza el canvas hacia la derecha o hacia abajo.
2. Pulsa `N`.
3. Pulsa `N` otra vez.

Resultado esperado: ambos nodos aparecen en la zona visible, cerca de su esquina superior izquierda, y sus posiciones estan ligeramente desplazadas.

## Prueba 7: cancelar con Ctrl+G

1. Selecciona un nodo y pulsa `Ctrl+G`.
2. Activa hints con `H` y pulsa `Ctrl+G`.
3. Abre el pop-up y pulsa `Ctrl+G`.
4. Comprueba tambien que `Esc` mantiene su comportamiento.

Resultado esperado: `Ctrl+G` limpia la seleccion en navegacion y cancela el contexto activo sin modificar datos.

## Prueba 8: zoom y navegacion

1. Usa `Cmd+=` y `Cmd+-` para acercar y alejar.
2. Usa las flechas para desplazar el canvas.
3. Repite usando `Ctrl+P`, `Ctrl+N`, `Ctrl+B` y `Ctrl+F`.
4. Selecciona un elemento y pulsa `C` para centrarlo.
5. Pulsa `Cmd+0` para volver al 100%.
6. Pulsa `Cmd+1` para ajustar todo el diagrama a la ventana.
7. Activa `H` en varios niveles de zoom.

Resultado esperado: el zoom mantiene el centro de trabajo, ambos juegos de teclas desplazan la vista y los hints visibles conservan tamano legible y secuencias validas.

## Prueba 9: paneles laterales

1. Oculta y muestra el panel izquierdo usando su boton.
2. Repite con el inspector derecho.
3. Prueba `Alt+[` y `Alt+]`.
4. Deja cerrado el panel derecho, selecciona una entidad y pulsa `Enter`.
5. Confirma sin `Shift` pulsando `Enter` otra vez.
6. Repite empezando con el panel derecho abierto.
7. Cierra y vuelve a abrir el modo de prueba.

Resultado esperado: los paneles se pliegan y recuperan su estado. Editar abre temporalmente el inspector cerrado; al confirmar vuelve a cerrarse, mientras que un inspector inicialmente abierto permanece abierto.

## Prueba 10: minimapa

1. Desplaza y amplia el canvas.
2. Comprueba que el rectangulo rojo representa la zona visible.
3. Haz click en otra zona del minimapa.
4. Arrastra dentro del minimapa.
5. Acerca y aleja varias veces observando tanto el minimapa como su rectangulo rojo.
6. Aleja hasta el 35% y comprueba que el diagrama se hace mas pequeno dentro del minimapa, dejando visible la proporcion de espacio que lo rodea en el canvas.
7. Repite con los paneles laterales abiertos y cerrados.

Resultado esperado: el minimapa permanece fijo; el rectangulo se hace pequeno al acercar, grande al alejar y sigue la zona visible. Al alejar mas alla del contenido, el propio diagrama se reduce y mantiene la misma escala espacial que el rectangulo.

## Prueba 11: indicadores de link

1. Navega por el diagrama sin activar hints.
2. Pasa el puntero por el punto medio de un link.
3. Pulsa `H`.

Resultado esperado: los circulos `L` estan ocultos normalmente, aparecen de forma discreta al interactuar y todos se muestran durante hint mode.

## Prueba 12: borrado seguro

1. Crea dos nodos de prueba y un link entre ellos.
2. Selecciona el link y pulsa `Delete`.
3. Cancela una vez con `Esc` o `Ctrl+G`.
4. Repite y confirma con `Enter` o el boton `Delete`.
5. Borra uno de los nodos.
6. Selecciona un frame no raiz y prueba su borrado.

Resultado esperado: siempre aparece confirmacion, cancelar no cambia datos y confirmar elimina tambien las relaciones dependientes. El frame raiz permanece protegido.

## Prueba 13: layout animado y direccion

1. Mueve varios nodos para que el diagrama quede claramente desordenado.
2. Elige `Top to bottom` y pulsa `Layout`.
3. Observa los nodos, los frames y las flechas durante la recolocacion.
4. Repite con `Left to right`.

Resultado esperado: los elementos recorren visualmente el camino hacia su nueva posicion, las flechas los acompanan durante toda la transicion y la organizacion final respeta la direccion elegida.

## Prueba 14: mover entidades entre frames

1. Selecciona un nodo de un frame hijo.
2. Arrastralo a otro frame y observa el resaltado del destino.
3. Arrastralo fuera del frame hijo para devolverlo al frame raiz.
4. Abre el inspector y repite el cambio usando el selector `Frame`.
5. Comprueba cualquier link que entre o salga del nodo.

Resultado esperado: la entidad cambia de pertenencia en ambos sentidos, conserva sus links y puede reasignarse tanto con arrastre como con el selector.

## Prueba 15: cierre de controles y ayuda de teclado

1. Pulsa `H` para mostrar hints y vuelve a pulsarla para ocultarlos.
2. Pulsa el boton `Hints` dos veces y comprueba el mismo resultado.
3. Verifica que el boton cambia visualmente mientras los hints estan activos.
4. Abre `Keyboard > All shortcuts` en el panel izquierdo.
5. Comprueba que aparecen tambien zoom, pan, paneles, borrado y Layout.
6. Pliega y despliega la lista.

Resultado esperado: tecla y boton alternan el mismo estado, cerrar limpia cualquier secuencia parcial y la lista plegable contiene todas las combinaciones configuradas.

## Prueba 16: deshacer y rehacer

1. Edita el texto de una entidad y confirma con `Enter`.
2. Pulsa `Cmd/Ctrl+Z` y comprueba que recupera el texto anterior.
3. Pulsa `Cmd/Ctrl+Shift+Z` y comprueba que reaparece el cambio.
4. Repite usando los dos botones de flecha de la barra superior.
5. Deshaz y realiza una accion nueva; comprueba que Rehacer queda desactivado.
6. Haz zoom, desplaza el canvas y deshaz una edicion.
7. Dentro del campo de texto, usa el deshacer nativo antes de confirmar.

Resultado esperado: cada intencion se deshace completa, Rehacer sigue la pila correcta y el historial semantico no cambia zoom, pan ni paneles.

## Prueba 17: acceso headless seguro

Con la aplicacion cerrada, ejecuta:

```bash
npm run ltp -- validate --workspace outputs/sample-workspace-v0.1.json --json
npm run ltp -- tree list --workspace outputs/sample-workspace-v0.1.json --json
```

Resultado esperado: ambos comandos devuelven JSON valido, revision y resultados sin modificar el ejemplo.

## Prueba 18: regresion basica

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
