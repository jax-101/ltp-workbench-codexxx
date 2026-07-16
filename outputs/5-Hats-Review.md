# Revision 5-hats del plan

Fecha de revision: 2026-07-16.

Alcance actual:

- `outputs/Interface-Improvement-Plan.md`;
- `outputs/Diagram-Architecture-Assessment.md`;
- `outputs/PRD-v0.2.md`;
- `outputs/Data-Model-v0.1.md`;
- `outputs/Headless-Architecture.md`.

Las cinco lentes se mantienen como Producto, Metodo LTP, UX/teclado,
Arquitectura tecnica y MVP/riesgo.

## Veredicto ejecutivo 2026-07-16

La direccion general es solida. El prototipo ya ha demostrado el editor de Goal
Tree, el uso intensivo por teclado, el layout compuesto, Undo/Redo, frames
minimizados y una primera frontera headless. Tambien es correcta la decision de
no representar CRT, FRT, EC, PrT y TrT como Goal Trees con otros colores.

El plan, sin embargo, aun no esta listo para estabilizar un formato publico de
definiciones ni para iniciar Diagram Studio. El riesgo principal es convertir
suposiciones metodologicas y tecnicas todavia no probadas en una API que luego
sea costosa de corregir.

La recomendacion es conservar `3C.12` como baseline y avanzar mediante pruebas
verticales. El contrato solo se publica despues de que Goal Tree, CRT y un spike
de EC funcionen sobre el mismo kernel sin ramas de dominio en las operaciones
comunes.

## Gaps prioritarios

| Prioridad | Hat | Gap | Riesgo | Cierre requerido |
| --- | --- | --- | --- | --- |
| P0 | Metodo | No existe aun un contrato ejecutable que distinga `OR` independiente, junction `AND`, necesidad, conflicto, assumptions por tramo y ruptura de ciclos | Un modelo n-ario aparentemente generico puede expresar diagramas incorrectos | Glosario semantico y fixtures-oraculo de Goal Tree, CRT, EC y FRT antes de congelar el schema |
| P0 | Arquitectura | `schema 0.3` mezcla en una misma iniciativa migracion, kernel, definiciones, renderer y layout | Cambio de gran alcance sin punto de retorno verificable | Migracion aditiva, capas separadas y compatibilidad reversible por gate |
| P0 | MVP | La secuencia del plan era contradictoria: `3C.14` contenia CRT, pero las dependencias colocaban CRT despues de formato y operaciones | Trabajo en el orden equivocado y criterios de salida ambiguos | Corregido en esta revision mediante una unica secuencia con gates `A-H` y criterios de parada |
| P0 | Arquitectura/UX | Borrar, copiar, pegar y seleccionar no tienen todavia semantica cerrada para relaciones n-arias y junctions derivadas | Datos huerfanos, selecciones engañosas y Undo parcial | Semantica atomica de cierre de seleccion y comandos genericos antes de congelar el formato |
| P1 | Producto | Workbench y Diagram Studio no tienen una frontera de producto explicita | El editor de metamodelos puede desplazar el valor para el analista LTP | Studio como modo avanzado y milestone separado, con una experiencia principal medible |
| P1 | Arquitectura | Faltan politica de versiones, migraciones de definicion, canonicalizacion del hash y modo rescate | Un workspace puede quedar ligado a una definicion que ya no abre | Versiones inmutables, lock, migrador, snapshot y apertura read-only de emergencia |
| P1 | Seguridad | Importar paquetes personales no tiene threat model ni limites de recursos | Archivos maliciosos o accidentales pueden bloquear, leer rutas o agotar memoria | Sin JS, schema estricto, limites de tamano/profundidad, rutas confinadas y diagnostico seguro |
| P1 | UX | No esta definido como crear, editar, seleccionar o verbalizar junctions y relaciones n-arias solo con teclado | El nuevo modelo puede romper la promesa principal del producto | Gramatica de teclado y pruebas por consecuencia para cada primitiva semantica |
| P1 | Calidad | No hay presupuestos de rendimiento ni corpus de compatibilidad | El preview, layout o validacion pueden degradarse sin un limite observable | Fixtures de escala, tiempos objetivo y prueba de apertura de workspaces antiguos |

Estado tras esta revision: la contradiccion de secuencia queda corregida en el
plan. Los otros tres P0 no estan resueltos aun; quedan convertidos en gates que
deben cerrarse con evidencia antes de publicar el formato.

## Hat 1: Producto

### Fortalezas

- La propuesta sigue siendo un workbench de pensamiento, no un dibujador.
- Goal Tree ya ofrece un caso de uso real y una baseline observable.
- La extensibilidad declarativa puede convertir el producto en una plataforma
  sin sacrificar el acceso headless.

### Gaps

1. Falta declarar dos experiencias distintas: el analista que construye
   diagramas y el autor avanzado que crea una definicion. El Studio no debe
   aparecer como requisito para usar LTP Workbench.
2. No hay metricas de resultado para la nueva etapa. `PASS` tecnico no mide si
   el usuario construye un CRT correcto, entiende una advertencia o recupera un
   workspace portable.
3. Falta gobernanza de definiciones: propietario, procedencia, confianza,
   compatibilidad, deprecacion, fork y forma de compartirlas.
4. El plan no decide cuando una definicion personal es solo local y cuando puede
   considerarse publicable.

### Gate de producto

Antes de Diagram Studio deben existir una experiencia de cinco minutos para el
analista, otra para el autor de definiciones y objetivos medibles para: tiempo
hasta el primer diagrama valido, 100% del flujo principal realizable con teclado
y recuperacion fiel de un workspace en otra instalacion.

## Hat 2: Metodo LTP

### Fortalezas

- El assessment distingue necesidad y suficiencia.
- Junctions se modelan como relaciones y no como afirmaciones ficticias.
- La validacion CLR se plantea progresiva y no como bloqueo de captura.

### Gaps

1. `AND`, `OR`, `NECESSITY` y `CONFLICT` necesitan semantica formal, no solo un
   enum. En CRT, varias causas independientes son alternativas suficientes sin
   junction; una junction AND expresa que el conjunto es necesario para producir
   el efecto. Esa diferencia debe sobrevivir a render, verbalizacion y CLI.
2. Una assumption puede pertenecer a la relacion completa, a una premisa, a un
   tramo de la relacion o al conflicto. `assumptionIds[]` en la relacion no basta
   hasta decidir estas cardinalidades.
3. Falta un modelo de revision metodologica: regla CLR, evidencia, severidad,
   estado, excepcion justificada y pregunta pendiente.
4. Las derivaciones entre diagramas necesitan procedencia y estado: propuesta,
   validada, rechazada, sustituida. Una injection no equivale siempre a una
   solucion aceptada.
5. Falta fijar la semantica exacta de la EC canonica y que restricciones pueden
   relajarse sin dejar de ser EC.
6. La terminologia debe ser canonica en datos y UI (`PrT`, `TrT`, nombres largos
   y alias), evitando variantes como `PRT`, `PTR` o `TRT` en contratos publicos.

### Gate metodologico

Congelar cuatro fixtures pequenos revisados por significado, no por apariencia:
Goal Tree, CRT con AND/OR y loop, EC canonica con assumptions e injection, y FRT
con negative branch. Cada uno debe incluir verbalizaciones esperadas, errores
duros y advertencias CLR.

## Hat 3: UX y teclado

### Fortalezas

- El registro unico de comandos y la auditoria `43/43` dan una base excepcional.
- Los modos contextuales, la seleccion explicita y la evidencia visual ya tienen
  contratos comprobables.

### Gaps

1. No existe aun una gramatica de teclado para junctions, relaciones n-arias,
   roles de premisa, assumptions por tramo y derivaciones entre diagramas.
2. Falta definir el cierre de seleccion. Seleccionar parcialmente una relacion
   n-aria debe tener un resultado predecible al borrar, copiar, mover o cambiar
   Type.
3. El Studio necesita navegacion de errores, preview, Undo propio, comparacion de
   versiones y rollback; no basta con formularios para editar JSON.
4. Faltan estados de error para definicion ausente, version incompatible,
   snapshot distinto o apertura en modo rescate.
5. Accesibilidad debe ser un contrato: foco, orden de lectura, nombres de Types,
   forma ademas de color y uso completo sin puntero.
6. La normalizacion de atajos entre macOS, Windows y Linux debe probarse antes de
   publicar un keymap editable.

### Gate UX

La prueba vertical CRT debe poder crearse, revisar assumptions, editar una
junction, borrar/restaurar y ejecutar layout solo con teclado. La auditoria debe
comprobar consecuencias semanticas y generar evidencia visual como en `3C.11`.

## Hat 4: Arquitectura tecnica

### Fortalezas

- Un kernel compartido y un `LayoutGraph` neutral son fronteras correctas.
- ELK permanece backend y no conoce reglas LTP.
- Built-ins y definiciones personales pasan por el mismo loader.
- La prohibicion de JavaScript arbitrario favorece determinismo y seguridad.

### Gaps

1. Deben separarse explicitamente cinco contratos: definicion del tipo de
   diagrama, instancia semantica, layout persistente, estado de vista y estado
   efimero. El schema actual aun arrastra `trees/nodes/links` y mutaciones del
   renderer.
2. La migracion debe ser aditiva. Primero se introduce un adaptador reversible
   hacia un unico modelo canonico; solo despues se retiran los nombres antiguos.
3. Faltan IDs y serializacion canonicos para definiciones, relaciones y junctions
   sinteticas. El hash no es reproducible sin canonicalizacion definida.
4. El DSL necesita semantica determinista, limites de complejidad, version de
   capacidades y diagnosticos localizados. No debe volverse un lenguaje de
   programacion oculto.
5. Una snapshot conserva datos, pero no migra una instancia entre versiones. Se
   requieren migradores versionados, preview del cambio y rollback.
6. El registro de comandos debe cubrir todas las mutaciones. Mientras el renderer
   pueda cambiar estructura fuera del core, CLI, Undo y UI no comparten realmente
   el mismo producto.
7. Falta el contrato de round-trip `Diagram -> LayoutGraph -> VisualLayout`, en
   especial para junctions sinteticas, frames minimizados, puertos y rutas.
8. Deben existir limites de carga, validacion y layout, junto con una estrategia
   incremental para preview del Studio y diagramas grandes.
9. Los paquetes importados necesitan confinamiento de rutas, limites de archivo,
   schema estricto y politica de confianza, aunque no ejecuten JavaScript.

### Gate tecnico

El formato permanece interno hasta superar: migracion ida/vuelta de Goal Tree,
CRT completo sin ramas de dominio en comandos comunes y spike de EC sin cambiar
la forma base de `element`, `relation`, `assumption` y `derivation`.

## Hat 5: MVP, riesgo y secuencia

### Fortalezas

- El trabajo incremental y las capturas han reducido regresiones.
- Los experimentos reversibles con layout demuestran una buena disciplina.
- El plan reconoce que operaciones colectivas deben apoyarse en el nuevo kernel.

### Gaps

1. `3C.13`, `3C.14`, `3C.15`, operaciones colectivas y la iteracion 5 no tenian
   una cadena unica de dependencias. Esta revision la unifica, pero todavia debe
   ejecutarse y validarse.
2. No hay criterios de parada. Una prueba que exige hardcodear CRT o ejecutar
   codigo desde una definicion debe invalidar la hipotesis, no ampliar el DSL por
   inercia.
3. Diagram Studio se programa antes de que el formato haya sobrevivido a varios
   diagramas oficiales y a una migracion real.
4. No hay presupuesto de esfuerzo ni limite de trabajo en paralelo. Reescribir
   schema, renderer, comandos, layout y Studio simultaneamente haria imposible
   aislar regresiones.
5. Falta un corpus de workspaces antiguos y una estrategia de downgrade/rescate.

### Secuencia recomendada

1. Gate A: congelar `3C.12`, fixtures y workspaces de compatibilidad.
2. Gate B: cerrar el glosario semantico y los cuatro fixtures-oraculo.
3. Gate C: introducir kernel interno y migracion aditiva; demostrar paridad total
   de Goal Tree.
4. Gate D: implementar CRT vertical en core, CLI, renderer, teclado y layout sin
   ramas especiales en operaciones comunes.
5. Gate E: hacer un spike de EC para tensionar topologia, roles y assumptions. Si
   cambia el kernel, el formato sigue siendo interno y se repiten C-D.
6. Gate F: cerrar borrar, copiar/pegar, seleccion, Undo/Redo y exportacion sobre
   relaciones n-arias.
7. Gate G: congelar `diagram-definition` v0.3, loader y CLI; probar migracion,
   seguridad, canonicalizacion y portabilidad.
8. Gate H: implementar FRT y trazabilidad; iniciar Diagram Studio solo cuando
   Goal Tree, CRT y EC abran sin codigo privilegiado y el schema haya sobrevivido
   a una migracion de definicion.

### Criterios de parada

- Goal Tree pierde comportamiento, IDs o fidelidad visual tras ida y vuelta.
- CRT requiere un condicional de dominio en comandos, renderer o ELK.
- EC solo puede expresarse introduciendo JavaScript arbitrario.
- Una migracion no puede previsualizarse y revertirse sin perdida.
- Borrar, copiar o Undo dejan relaciones parciales o IDs sinteticos huerfanos.
- Un paquete invalido puede impedir abrir el workspace en modo seguro.

## Decisiones que deben tomarse ahora

1. Aprobar la secuencia por gates y retrasar la congelacion del formato publico.
2. Definir quien valida los fixtures desde el punto de vista LTP.
3. Elegir la unidad de assumption: relacion, premisa/tramo o ambas.
4. Definir semantica de seleccion parcial de una relacion n-aria.
5. Declarar formato de version, canonicalizacion y politica de migracion.
6. Fijar un corpus y presupuestos de rendimiento antes del loader publico.

## Revision historica del PRD inicial

Documento revisado:

`outputs/PRD-LTP-Workbench.md`

Asuncion usada: "5-hats" se interpreta como cinco lentes de revision: Producto, Metodo LTP, UX/teclado, Arquitectura tecnica y MVP/riesgo.

## Resumen ejecutivo

La direccion del producto es fuerte: el PRD ya ha encontrado una idea diferencial clara. No es una app para dibujar arboles; es una herramienta de pensamiento sistemico donde el sistema es estable, los arboles son perspectivas y el usuario puede razonar sin depender del raton.

Los dos aciertos principales son:

- separar System Profile de System Benchmark;
- convertir el uso 100% por teclado, frames y auto-layout en capacidades centrales.

El riesgo principal es que el MVP actual sigue siendo demasiado amplio. Incluye sistema, benchmark, forks, frames, keyboard hints, auto-layout, biblioteca, exportacion y validacion logica. Todo es coherente, pero no todo debe entrar con el mismo peso en la primera version.

La recomendacion general es definir un MVP mas estrecho:

- Workspace + System Profile;
- Goal Tree como primer System Benchmark;
- editor de arbol con teclado;
- frame principal y frames anidados basicos;
- keyboard hints;
- auto-layout inicial;
- persistencia local legible.

CRT, EC, forks avanzados, validacion CLR completa, biblioteca contextual y exportaciones ricas deberian quedar como siguiente capa.

## Hat 1: Producto

### Veredicto

El producto tiene una promesa clara: ayudar a pensar sistemas complejos usando LTP, no solo documentar resultados.

### Lo que funciona

- El sistema como entidad estable es una gran decision de producto.
- La idea de perspectivas permite trabajar rutas no lineales reales.
- El foco en no usar raton diferencia la app de herramientas de diagramacion generalistas.
- La app evita convertirse en un wizard rigido, que seria una mala forma de representar LTP en trabajo real.

### Riesgos

- El PRD todavia no define una "primera experiencia" concreta de 5 minutos.
- "Sistema" puede ser demasiado abstracto si la interfaz no ayuda a aterrizarlo.
- El usuario podria quedarse bloqueado entre completar metadatos, elegir arbol o crear benchmark.
- La palabra "fork" puede llegar demasiado pronto para el usuario si todavia no ha creado su primer arbol.

### Recomendaciones

- Definir el primer recorrido de usuario:
  1. elegir carpeta;
  2. crear sistema;
  3. escribir nombre, frontera y owner;
  4. crear Goal Tree;
  5. capturar goal, CSF y NC con teclado;
  6. guardar.
- Formular un principio: "empezar incompleto es correcto".
- Separar "crear sistema" de "madurar sistema".
- Dejar forks visibles en el modelo, pero no protagonistas en el primer flujo.

## Hat 2: Metodo LTP

### Veredicto

El PRD respeta bien la logica de LTP: Goal Tree como benchmark, CRT como desviacion contra benchmark, EC como conflicto, FRT como validacion de injection.

### Lo que funciona

- La distincion Profile/Benchmark evita confundir contexto con criterio de exito.
- Los UDE quedan ligados a goal/CSF, que es metodologicamente correcto.
- Se permite empezar por EC o CRT, pero sin perder trazabilidad hacia el sistema.
- La validacion logica se plantea como capa progresiva, no como freno de captura.

### Riesgos

- Goal Tree deberia tener mas peso en el MVP si el sistema y benchmark son el centro.
- Falta definir si un System Benchmark puede tener varias versiones.
- Falta explicitar como se manejan Goal Trees anidados entre sistemas superiores e inferiores.
- Las Categories of Legitimate Reservation estan listadas, pero aun no traducidas a interacciones concretas.

### Recomendaciones

- Tratar Goal Tree como el primer arbol nativo del producto.
- Permitir "benchmark provisional" cuando el usuario no tenga Goal Tree completo.
- En cada UDE, exigir o sugerir enlace a goal/CSF afectado.
- Convertir CLR en checks accionables:
  - "esta entidad tiene una sola idea?";
  - "hay evidencia?";
  - "falta una causa contribuyente?";
  - "esta flecha es demasiado larga?";
  - "la causa y el efecto estan invertidos?".

## Hat 3: UX, teclado y canvas

### Veredicto

Este es probablemente el nucleo de la experiencia. Si el teclado y el canvas funcionan, la app puede sentirse como una extension del pensamiento. Si no, se convertira en otra herramienta lenta de diagramas.

### Lo que funciona

- Keyboard hint mode es una idea excelente.
- Los modos de teclado estan bien identificados: navegacion, edicion, conexion, frame y comandos.
- Frames anidados resuelven una necesidad real para arboles grandes.
- Auto-layout con respeto a posiciones fijadas es la tension correcta.

### Riesgos

- Demasiados modos pueden confundir si no hay una indicacion visual muy clara.
- Los hints pueden tapar contenido en arboles densos.
- Seleccionar conexiones con hints puede ser dificil si hay muchas flechas.
- Auto-layout automatico puede frustrar si mueve demasiado el trabajo del usuario.
- Crear frames anidados puede complicar la navegacion si no hay breadcrumbs o ruta visible.

### Recomendaciones

- Definir una gramatica de teclado pequena para el MVP:
  - crear nodo;
  - editar nodo;
  - crear hijo/consecuencia;
  - crear causa/predecesor;
  - conectar;
  - crear frame;
  - entrar/salir de frame;
  - hints;
  - command palette.
- Mostrar siempre:
  - modo activo;
  - frame activo;
  - seleccion actual;
  - ruta de frame, como `Goal Tree / CSF Revenue / Demand`.
- Empezar con auto-layout manual por comando, no automatico agresivo.
- Incluir "pin position" desde el inicio.
- Ofrecer vista lista/outline como red de seguridad para arboles visualmente densos.

## Hat 4: Arquitectura tecnica

### Veredicto

El PRD ya implica una arquitectura mas parecida a un editor estructurado que a una app de formularios. El modelo de datos debe quedar muy bien pensado antes de implementar mas UI.

### Lo que funciona

- Entidades conceptuales claras: Workspace, System, Profile, Benchmark, Perspective, Tree, Frame, Node, Link, LayoutState.
- Separar logica del arbol y layout visual es imprescindible.
- La trazabilidad entre artefactos esta bien planteada.

### Riesgos

- Si Node y Link se disenan demasiado simples, luego sera dificil soportar CLR, forks, reuse y derivaciones.
- Las flechas no pueden ser solo lineas visuales: cada Link debe guardar significado explicito, assumptions, evidencia y estado de validacion.
- Frames pueden ser visuales, semanticos o ambos; el PRD aun deja eso abierto.
- Auto-layout necesita motor especializado o algoritmo probado; hacerlo a mano puede consumir demasiado.
- Electron sirve, pero el canvas y layout pueden volverse complejos rapido.
- Persistencia local debe decidirse pronto: archivos legibles, SQLite, o mezcla.

### Recomendaciones

- Definir pronto un schema de datos versionado.
- Separar:
  - `logicalGraph`: nodos, links, tipos, derivaciones;
  - `visualGraph`: frames, posiciones, rutas, zoom, pinning;
  - `methodMetadata`: LTP type, link meaning, assumptions, validation, evidence, source;
  - `workspaceMetadata`: carpetas, sistemas, perspectivas.
- Evaluar librerias de layout antes de construir:
  - ELK.js;
  - Dagre;
  - React Flow con layout externo;
  - Cytoscape.js si prima grafos complejos.
- Guardar en formato local legible al menos para export/debug: JSON o YAML por sistema/arbol.
- No implementar auto-layout propio desde cero en el MVP.

## Hat 5: MVP, riesgos y secuencia

### Veredicto

El PRD describe una vision potente, pero el MVP debe adelgazar. El primer hito debe demostrar que se puede crear un arbol real, con teclado, dentro de un sistema, y que el layout ayuda mas de lo que estorba.

### Riesgos principales

- Alcance excesivo del MVP.
- Auto-layout dificil y costoso.
- Sobrecarga cognitiva por modelo System/Profile/Benchmark/Perspective/Fork.
- Validacion CLR demasiado ambiciosa para primera version.
- Mucha funcionalidad antes de probar el flujo de captura.

### MVP recomendado

Version 0.1:

- elegir carpeta de trabajo;
- crear sistema;
- editar System Profile minimo;
- crear Goal Tree;
- crear nodos Goal, CSF y NC;
- crear frame principal;
- crear frames anidados simples;
- usar teclado para crear, seleccionar, editar y conectar;
- keyboard hints basicos para nodos y frames;
- auto-layout inicial por comando;
- guardar/cargar en archivo local.

Version 0.2:

- derivar UDE desde Goal/CSF;
- crear CRT basico;
- links de trazabilidad Goal Tree -> CRT;
- validacion simple de entidad: frase completa, una idea, evidencia.

Version 0.3:

- Evaporating Cloud;
- assumptions por flecha como objetos editables;
- injections;
- derivacion EC -> FRT.

Version 0.4:

- forks de soluciones;
- validacion CLR mas completa;
- biblioteca LTP contextual;
- exportaciones avanzadas.

## Cambios recomendados al PRD

1. Anadir una seccion "North Star Experience" con el recorrido de 5 minutos.
2. Reducir explicitamente el MVP a Goal Tree + teclado + frames + persistencia.
3. Mover forks avanzados, EC/FRT y CLR completa a fases posteriores.
4. Definir el modelo de datos logico/visual antes de seguir implementando.
5. Convertir "uso sin raton" en criterio de aceptacion medible.
6. Definir atajos canonicos iniciales.
7. Decidir si frames son solo agrupacion visual o tambien unidad semantica.

## Criterios de aceptacion sugeridos

- El usuario puede crear un sistema nuevo sin tocar el raton.
- El usuario puede crear un Goal Tree con goal, tres CSF y varias NC sin tocar el raton.
- El usuario puede seleccionar cualquier entidad visible usando keyboard hints.
- El usuario puede editar una entidad seleccionada sin raton.
- El usuario puede conectar dos entidades sin raton.
- El usuario puede crear un frame dentro de otro frame sin raton.
- El usuario puede ejecutar auto-layout y reducir cruces respecto a una colocacion inicial desordenada.
- El usuario puede guardar, cerrar, abrir y recuperar el arbol con posiciones y frames.
- El usuario puede exportar una version textual simple del Goal Tree.
