# Manual Test Guide: Interface Iterations 1 through 3B

Esta prueba abre el ejemplo incluido con la aplicacion y guarda los cambios en un archivo de prueba separado. No modifica el workspace normal.

## Arranque

1. Abre Terminal.
2. Ejecuta:

   ```bash
   cd "/Users/jullivarri/Documents/Codex/2026-07-13/LTP Workbench"
   npm run test:manual
   ```

3. Comprueba que el titulo de la ventana y la insignia junto al nombre del arbol muestran `v0.1.0` y `build 3B.4`.

Para terminar, cierra la aplicacion con `Cmd+Q`.

## Prueba visual automatizada

La regresion visual puede ejecutarse sin intervencion manual:

```bash
npm run test:visual
```

El comando abre un workspace aislado, ejecuta seleccion, reasignacion de frames, Layout compuesto, arrastre, Undo/Redo y conexion, y termina con cuatro escenarios aleatorios deterministas antes/despues. Guarda 30 capturas numeradas junto con `report.md` en `outputs/test-evidence/<build>/`. La prueba falla si no puede ejecutar o representar un escenario; los defectos visuales de la linea base se etiquetan como `needs work` hasta completar 3B.5.

La captura `22-readable-routing.png` debe mostrar 18 entidades, los tres CSF en una misma fila y tres puntas separadas sobre el borde inferior del Goal.

Las capturas `23` a `30` usan las semillas `4101` a `4104`. Sus informes registran cruces, codos, longitud, frames verticales y problemas geometricos. Para ejecutar solamente la evaluacion estructural y ver la tabla de resultados:

```bash
npm run test:layout-random
```

## Abrir el caso complejo

Para trabajar manualmente sobre el mismo caso permanente sin modificar el workspace habitual:

```bash
npm run test:complex
```

La primera apertura carga el fixture de 18 entidades y 21 links. Los cambios posteriores se guardan en un workspace de prueba independiente.

En el caso complejo bien ordenado, pulsa `Layout` y comprueba que el estado indica que se conserva la disposicion actual porque ELK no supera el margen del 15%. Las posiciones relativas de los nodos no deben cambiar.

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

Repite el cambio de zoom con un nodo, un link y un frame seleccionados. En cada caso, el elemento o conjunto seleccionado debe permanecer centrado.

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

5. Mueve una entidad a `Root` con `Cmd+F` y anida un frame dentro de otro.
6. Ejecuta Layout y comprueba que el elemento de `Root` queda fuera de frames no relacionados y que el frame anidado queda completamente dentro de su padre.
7. Deshaz y rehaz Layout observando las dos transiciones.

Resultado esperado: los elementos recorren visualmente el camino hacia su nueva posicion, las flechas los acompanan, la organizacion final respeta la direccion y Undo/Redo anima la geometria completa.

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

## Prueba 19: seleccion estructural y canvas compuesto

1. Comprueba que existe un frame visible llamado `Goal Tree` que contiene el arbol completo.
2. Comprueba que `Root` aparece en `Tree > Active frame`, pero no como rectangulo en el canvas ni en el minimapa.
3. Selecciona el frame `Goal Tree` y comprueba que sus entidades, frames descendientes y links internos aparecen incluidos.
4. Observa en el estado y en el inspector el inventario por `Goal`, `CSF`, `NC`, subframes, links y assumptions; no debe aparecer `Included`.
5. Comprueba que un link con un extremo fuera del frame seleccionado no queda incluido.
6. Manteniendo `Shift` o `Cmd`, selecciona otro nodo o link y comprueba que se anade al conjunto.
7. Selecciona dos nodos con `Shift` o `Cmd`, pulsa `L` y elige un tercer nodo como destino.
8. En `Tree > Active frame`, alterna entre un frame hijo, `Goal Tree` y `Root`; pulsa `N` en cada contexto y comprueba el destino.
9. Selecciona un frame dos veces y comprueba que el segundo click limpia la seleccion, pero conserva ese frame como contexto de creacion.

Resultado esperado: `Root` es el espacio global ilimitado, `Goal Tree` es un frame explicito y finito, el inventario explica su contenido y la seleccion estructural sigue siendo determinista.

## Prueba 20: seleccion multiple y arrastre colectivo

1. Pulsa `M` y comprueba que aparecen hints para nodos, links y frames.
2. Elige dos o tres nodos mediante sus letras.
3. Pulsa `M` de nuevo y comprueba que los hints desaparecen sin perder la seleccion.
4. Arrastra uno de los nodos seleccionados a otro frame.
5. Comprueba que todos los nodos seleccionados se desplazan juntos y conservan sus distancias relativas.
6. Pulsa `Cmd+Z` y comprueba que todo el grupo vuelve en una sola operacion.
7. Repite la seleccion, pulsa `L` y elige un nodo destino.

Resultado esperado: `M` representa una seleccion general reutilizable; el arrastre afecta al grupo completo y `L` usa sus nodos como fuentes sin mezclar ambos estados.

El grupo no debe superponerse con contenido existente. Si no cabe, el frame crece y los elementos afectados de niveles superiores se desplazan sin deformar los subarboles que contienen.

## Prueba 21: mover seleccion entre frames solo con teclado

1. Selecciona una entidad dentro de un frame hijo y pulsa `Cmd+P`.
2. Comprueba en el inspector que ahora pertenece al frame padre; pulsa `Cmd+Z` y `Cmd+Shift+Z`.
3. Con la entidad seleccionada, pulsa `Cmd+F` y comprueba que los hints corresponden solo a frames e incluyen `ROOT`.
4. Escribe el hint de otro frame y comprueba el nuevo valor `Frame` del inspector.
5. Selecciona un frame que contenga entidades, pulsa `Cmd+F` y elige otro frame.
6. Comprueba en la ruta superior que el frame completo es ahora hijo del destino y que conserva su contenido.
7. Pulsa `Cmd+P` para devolverlo un nivel hacia arriba.
8. En modo `Cmd+F`, pulsa `Ctrl+G` y comprueba que no se modifica nada.
9. Comprueba que `Ctrl+P` y `Ctrl+F` siguen desplazando la vista, mientras `Cmd+P` y `Cmd+F` modifican la estructura.

Resultado esperado: entidades, selecciones y frames completos cambian de contenedor sin raton, sin ciclos ni perdida de links; cada operacion se deshace completa y los atajos de navegacion permanecen independientes.

## Prueba 22: rutas despues de Layout

1. Selecciona `Bottom to Top` y prepara un Goal, cuatro entidades en la capa siguiente y cinco en la inferior.
2. Conecta tres entidades con el Goal y las cinco inferiores con entidades de la capa intermedia.
3. Conecta la cuarta entidad intermedia directamente con el Goal y tambien con una entidad inferior que ya conduzca al Goal por otra rama.
4. Pulsa `Layout`.
5. Recorre visualmente cada flecha desde origen hasta destino.
6. Comprueba que las conexiones sin obstaculos son rectas y que no hay cruces.
7. Comprueba que predominan las flechas hacia arriba y que solo la relacion secundaria usa otra direccion.
8. Comprueba que el estado informa `0 crossings`, `0 bends` y `1 direction exceptions`.
9. Observa el frame Goal Tree y comprueba que se ajusta al contenido, tambien si estaba fijado.
10. Mueve una entidad y comprueba que las rectas provisionales mantienen lados de conexion coherentes.

Resultado esperado: el arbol ocupa tres capas, los 11 links son rectos, no hay cruces ni entidades atravesadas, existe una sola excepcion direccional explicable y el frame queda cenido sin perder su posicion fijada.

## Registro de resultados

Anota para cada prueba:

- `OK` o `Falla`;
- que accion estabas realizando;
- que esperabas ver;
- que ocurrio realmente.

Las observaciones se incorporaran despues a `outputs/Feedback-Log.md`.
