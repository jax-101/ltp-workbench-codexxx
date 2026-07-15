# Headless Architecture: LTP Workbench

## Objetivo

Permitir que la aplicacion Electron, una CLI y futuros agentes operen sobre los mismos arboles con reglas identicas, sin automatizar la pantalla ni editar JSON directamente.

## Capas

```text
Electron UI       CLI JSON       MCP futuro
     |               |               |
     +------- adaptadores -----------+
                     |
          servicio de aplicacion
                     |
       motor transaccional de comandos
          |          |          |
      validacion   historial   repositorio
                                 |
                         workspace JSON
```

El nucleo vive en `src/core/` y no depende de Electron, DOM o CSS.

## Sobre de comando

Toda escritura soportada usa esta forma:

```json
{
  "commandId": "uuid-estable-para-reintentos",
  "type": "node.update",
  "label": "Update node from agent",
  "expectedRevision": 42,
  "payload": {
    "treeId": "tree-goal",
    "nodeId": "node-27",
    "field": "statement",
    "value": "New statement"
  }
}
```

`commandId` hace idempotente el reintento dentro de la sesion. `expectedRevision` impide aplicar una decision calculada sobre un estado obsoleto.

## Flujo de commit

1. Comprobar el sobre y la revision esperada.
2. Ejecutar el handler sobre un draft aislado.
3. Generar parches directos e inversos.
4. Validar todas las invariantes del workspace resultante.
5. Bloquear el archivo y volver a comprobar su revision.
6. Escribir un archivo temporal, sincronizarlo y sustituir el original.
7. Publicar el nuevo estado y actualizar Undo/Redo.

Si cualquier paso falla, el estado en memoria y el archivo permanecen sin cambios.

## CLI inicial

```bash
npm run ltp -- validate --workspace ./workspace.json --json
npm run ltp -- tree list --workspace ./workspace.json --json
npm run ltp -- node update \
  --workspace ./workspace.json \
  --tree tree-goal \
  --node node-27 \
  --field statement \
  --value "New statement" \
  --expected-revision 42 \
  --command-id command-123 \
  --dry-run \
  --json
npm run ltp -- apply --workspace ./workspace.json --command ./command.json --dry-run --json
```

Las operaciones de escritura exigen una revision esperada. `--dry-run` devuelve el workspace candidato y sus parches sin guardar.

## Estado implementado

- Validador compartido de estructura y referencias.
- Registro extensible de comandos con `node.update`, `view.update` y compatibilidad temporal para operaciones antiguas.
- Parches directos e inversos, Undo/Redo de sesion y limite de memoria.
- Revision optimista y command IDs idempotentes.
- Bloqueo entre procesos y escritura atomica.
- CLI con validacion, consulta, actualizacion de nodos y aplicacion de comandos JSON.
- Salida y errores estructurados para automatizacion.

## Evolucion pendiente

- Migrar cada mutacion del renderer a un comando granular.
- Transacciones batch atomicas para subgrafos completos.
- Diario append-only con identidad del actor y recuperacion tras fallo.
- Checkpoints nombrados y comparacion entre revisiones.
- Scopes de permisos para agentes y confirmacion de operaciones destructivas.
- Layout headless determinista con version del algoritmo.
- Servidor MCP construido como adaptador del mismo servicio.

El diario de auditoria no sustituira al workspace como fuente de verdad. Tampoco se adoptara event sourcing completo mientras snapshots, parches y checkpoints cubran las necesidades de recuperacion.
