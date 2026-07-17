# Multi-Project and Multi-View Architecture

Fecha: 2026-07-17.

## Objetivo

Permitir trabajar en paralelo con varios proyectos y sistemas, abrir varios
arboles en pestanas y mostrar una o mas vistas del mismo arbol en ventanas o
monitores distintos sin duplicar la fuente de verdad.

## Identidades

- `WorkspaceSession`: proyecto abierto y ligado a un locator canonico.
- `System`: sistema analizado dentro del workspace.
- `Document`: arbol o artefacto persistente identificado por `treeId`.
- `View`: estado visual independiente sobre un documento.
- `Window`: contenedor Electron de una o mas vistas.

Una ventana pertenecera por defecto a un solo workspace. Los sistemas y
documentos del mismo proyecto podran convivir en pestanas. Abrir otro proyecto
creara normalmente otra ventana para mantener visibles sus limites de Undo,
busqueda, exportacion y contexto LLM.

## Runtime

`src/core/workspace-manager.js` mantiene una sesion por locator. La apertura es
concurrente y deduplicada: dos solicitudes simultaneas esperan la misma promesa
y reciben el mismo motor. Cada proyecto distinto conserva repositorio,
revision, historial y cola transaccional propios.

`src/core/document-view.js` separa seleccion de documento y construccion de
vistas. Duplicar una vista conserva el mismo `documentId`, pero asigna identidad,
zoom, pan, seleccion y foco independientes.

El renderer y los adaptadores pasan `treeId` explicitamente a layout y
exportacion. La eleccion compatible del primer documento queda centralizada y
no forma parte de las operaciones de dominio.

## Alcance del build 3C.14b.0

Implementado y probado:

- dos proyectos abiertos y editados sin compartir revision ni contenido;
- una sola carga ante dos aperturas concurrentes del mismo proyecto;
- listado y resolucion explicitos de documentos;
- dos vistas independientes del mismo documento;
- foco de frame validado como propiedad de vista;
- sesion, documento y vista explicitos en el smoke Electron;
- layout y exportacion dirigidos por `treeId`.

No implementado todavia:

- selector de carpeta y repositorio multiarchivo real;
- pestanas visibles y cambio interactivo de documento;
- detach, reattach o duplicacion visual de una pestana;
- broadcast de commits entre varios `BrowserWindow`;
- restauracion de ventanas y monitores en `.ltp/ui-state.json`;
- aislamiento visible del contexto LLM por proyecto.

## Secuencia

1. Completar CRT sobre identidad documental explicita.
2. Sustituir el archivo interno por workspace seleccionado y multiarchivo.
3. Implementar foco de frame como proyeccion de vista.
4. Introducir pestanas dentro de una sesion.
5. Duplicar y desacoplar vistas en otras ventanas.
6. Abrir varios proyectos con una ventana por sesion y sincronizar ventanas del
   mismo proyecto mediante revision y broadcast de commits.
7. Vincular cada conversacion LLM a una sesion y alcance documental explicitos.

## Pruebas de salida futuras

- editar proyecto A no cambia revision, Undo ni archivos de proyecto B;
- abrir dos veces la misma carpeta no crea dos motores;
- editar un arbol desde una ventana actualiza otra vista sin cambiar su zoom;
- cerrar una ventana no cierra una sesion que aun tiene vistas abiertas;
- reiniciar restaura pestanas sin convertir estado visual en datos de dominio;
- un agente ligado a un proyecto no puede consultar otro sin autorizacion
  explicita.
