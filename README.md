# LTP Workbench

Aplicacion de escritorio standalone para trabajar problemas con la metodologia Logical Thinking Process de William Dettmer.

## Estado actual

Esta es una primera base funcional en Electron:

- proyectos guardados localmente en el ordenador;
- pasos de trabajo LTP;
- captura de contexto, efectos indeseables, supuestos, inyecciones, acciones y notas;
- biblioteca local para incorporar guias, plantillas, ejemplos, definiciones y criterios propios.

## Ejecutar en desarrollo

```bash
npm install
npm start
```

## Crear una version standalone

```bash
npm run dist
```

La salida se generara en `outputs/dist`.

## Proxima informacion necesaria

Para convertir esta base en una herramienta realmente fiel a tu forma de usar LTP, conviene incorporar:

- tus documentos, apuntes o plantillas sobre LTP;
- ejemplos de problemas ya resueltos;
- pasos exactos que quieres que la app obligue o recomiende seguir;
- formato deseado de exportacion final.

## Como alimentar la biblioteca

Abre la pestana `Biblioteca` y crea una entrada por cada pieza de conocimiento:

- `guia`: explicacion de un paso o subpaso;
- `plantilla`: estructura reutilizable para completar;
- `ejemplo`: caso ya resuelto o fragmento de razonamiento;
- `criterio`: regla de validacion;
- `definicion`: vocabulario o concepto clave.

Cuando compartas tus documentos, el siguiente paso sera convertirlos en estas entradas de forma ordenada.
