# Question Status

Estado de preguntas abiertas del PRD.

## Cerradas el 2026-07-13

### Producto

#### Q-001: Cual es el metadato minimo obligatorio para crear un sistema?

Decision: para crear un sistema solo sera obligatorio el nombre. Para considerar completo el System Profile minimo de fase 1 se pedira: nombre, owner/decision-maker, frontera breve y descripcion/proposito de trabajo.

Razon: la app debe permitir empezar incompleto, pero necesita suficiente contexto para que el Goal Tree tenga sentido.

#### Q-002: Debe un workspace contener varios sistemas, o normalmente una carpeta equivale a un sistema?

Decision: un workspace puede contener varios sistemas. Cada sistema vivira en su propia subcarpeta.

Razon: esto permite comparar o mantener varios sistemas relacionados sin mezclar sus arboles.

#### Q-003: Como de visible debe ser el concepto de fork en fase 1?

Decision: forks no seran protagonistas en fase 1. El modelo reservara espacio para ellos, pero la UI no los destacara salvo como futura capacidad.

Razon: introducir forks antes de crear el primer Goal Tree aumenta complejidad innecesaria.

#### Q-004: Que debe ocurrir si el usuario quiere crear un CRT sin Goal Tree previo?

Decision: en fase 1 no se implementa CRT. En fase 2 se permitira crear un CRT con benchmark provisional, pero la app marcara explicitamente que el benchmark esta incompleto y sugerira enlazar cada UDE a goal/CSF cuando sea posible.

Razon: metodologicamente el Goal Tree es el benchmark, pero la app no debe bloquear rutas reales no lineales.

### Metodo LTP

#### Q-005: El Goal Tree debe ser obligatorio antes de un CRT?

Decision: no sera obligatorio de forma absoluta. Sera el camino recomendado. Un CRT podra existir con benchmark provisional a partir de fase 2.

Razon: LTP se beneficia del Goal Tree, pero el trabajo real puede empezar desde sintomas o conflictos.

#### Q-006: Como se representaran Goal Trees anidados de sistemas superiores e inferiores?

Decision: el modelo permitira relaciones parent/child entre sistemas y referencias entre benchmarks. En fase 1 se documenta en datos, pero no se crea UI avanzada para anidamiento.

Razon: los Goal Trees son escalables, pero el MVP debe concentrarse en un sistema activo.

#### Q-007: Que checks CLR entran primero?

Decision: fase 1 incluye checks ligeros de claridad, entity existence y verbalizacion de necessity links. Causalidad/suficiencia completas entran en fases CRT/FRT.

Razon: fase 1 trabaja Goal Tree, que usa necessity logic; no conviene cargarlo con validacion de cause-effect completa.

#### Q-008: Como convertir una assumption de flecha en nodo explicito?

Decision: la app tendra la accion "Promote assumption to node". Creara un nodo a partir de la assumption, mantendra trazabilidad al link original y permitira analizarla como entidad.

Razon: algunas assumptions deben pasar de comentario impl If-hidden a pieza explicita del razonamiento.

### UX y teclado

#### Q-009: Que atajos seran canonicos en fase 1?

Decision inicial:

- `Cmd/Ctrl+K`: command palette;
- `H`: keyboard hints;
- `N`: nuevo nodo;
- `A`: anadir nodo hijo/debajo;
- `Shift+A`: anadir nodo padre/encima;
- `Enter`: editar seleccion;
- `Esc`: salir/cancelar/volver a navegacion;
- `L`: modo conexion;
- `F`: nuevo frame;
- `[` y `]`: subir al frame padre / entrar en frame seleccionado;
- `/`: buscar;
- `P`: fijar o liberar posicion;
- `Cmd/Ctrl+Shift+L`: auto-layout del frame activo.

Razon: conjunto pequeno, recordable y compatible con modos de teclado.

#### Q-010: Como se indicara visualmente el modo activo?

Decision: barra de estado persistente + borde o acento visual del canvas + microcopy contextual.

Razon: el usuario debe saber siempre si esta navegando, editando, conectando, trabajando en frames o usando comandos.

#### Q-011: Como se seleccionaran conexiones con keyboard hints cuando haya muchas flechas?

Decision: las conexiones recibiran hints en su punto medio visible. Si hay demasiadas, los hints se limitaran al frame activo o al resultado filtrado por busqueda. Se permitiran secuencias de dos letras.

Razon: seleccionar flechas es necesario porque los links tienen assumptions y significado propio.

#### Q-012: Como debe verse la ruta del frame activo?

Decision: breadcrumb permanente: `System / Perspective / Tree / Frame / Subframe`.

Razon: frames anidados requieren orientacion constante.

### Canvas y layout

#### Q-013: Que nivel de libertad manual debe tener el usuario frente al auto-layout?

Decision: la intencion del usuario gana. El usuario puede fijar posiciones. El auto-layout debe respetar posiciones fijadas razonablemente.

Razon: el layout ayuda, pero no debe destruir organizacion deliberada.

#### Q-014: Deben los frames tener significado semantico obligatorio?

Decision: no obligatorio. Un frame puede ser solo agrupacion visual. Opcionalmente puede tener tipo semantico.

Razon: fuerza demasiada estructura antes de que el usuario sepa que significa cada agrupacion.

#### Q-015: Que libreria de layout conviene evaluar primero?

Decision: evaluar primero ELK.js para layout jerarquico/compound graphs; Dagre queda como alternativa simple.

Razon: ELK.js soporta mejor grafos con frames/compound nodes y reduccion de cruces.

#### Q-016: El auto-layout debe ejecutarse automaticamente al conectar?

Decision: en fase 1, auto-layout por comando. La app puede colocar nodos nuevos cerca de la seleccion, pero no reordenara agresivamente sin accion del usuario.

Razon: evita frustracion y permite validar el algoritmo antes de automatizarlo.

### Persistencia y exportacion

#### Q-017: Archivos legibles o base de datos local?

Decision: fase 1 usara archivos locales legibles en JSON para datos y Markdown para exportaciones. No se usara base de datos local en fase 1.

Razon: facilita inspeccion, versionado externo y recuperacion manual.

#### Q-018: Formato de exportacion prioritario?

Decision: Markdown primero.

Razon: es simple, legible y suficiente para revisar un Goal Tree textual.

#### Q-019: Como versionar cambios sin complicar el MVP?

Decision: fase 1 tendra `updatedAt`, `schemaVersion` y checkpoints manuales simples. No habra historial complejo.

Razon: protege trabajo sin convertir el MVP en un sistema de versionado.

## Pendientes de validar en prototipo

- Si los atajos propuestos se sienten naturales tras usarlos en un Goal Tree real.
- Si keyboard hints para links son legibles en canvas denso.
- Si ELK.js produce layouts suficientemente buenos con frames anidados.
- Si el auto-layout por comando debe evolucionar hacia auto-layout suave automatico.
- Si JSON por archivo sigue siendo comodo cuando haya varios arboles grandes.
