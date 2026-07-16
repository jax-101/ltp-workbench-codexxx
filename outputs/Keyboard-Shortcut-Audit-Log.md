# Keyboard Shortcut Audit Log

## Alcance

- Fecha: 2026-07-16.
- Plataforma: macOS (`darwin`).
- Build final: `3C.11`.
- Fuente del inventario: `src/renderer/command-config.js`.
- Cobertura: 34 comandos, 43 bindings y 43 capturas.
- Fixture: `outputs/sample-workspace-v0.1.json`, reiniciado antes de cada binding.

## Metodo

Cada caso resuelve el binding mediante el matcher real, envia el evento de teclado al documento, espera a que guardados y animaciones queden estables y comprueba una consecuencia especifica. Despues captura la ventana completa. El informe detallado se genera en:

```text
outputs/shortcut-audit/3C.11/report.md
outputs/shortcut-audit/3C.11/report.json
outputs/shortcut-audit/3C.11/*.png
```

La evidencia grafica es local y regenerable; no se versiona para evitar incorporar aproximadamente 17 MB por build.

## Primera pasada

Resultado: `37/43 PASS`.

Senales encontradas:

| Caso | Primera lectura | Diagnostico |
|---|---|---|
| `Cmd+K` | No se veia una paleta | Fallo real: el comando era un placeholder. |
| `Shift+A` | No estaba en la lista inicial de fallos | La revision semantica posterior revelo que creaba un nodo sin link. |
| `A` | El link parecia incorrecto | Falso positivo: el foco habia pasado al link y el test buscaba el nodo activo. |
| `Cmd+X` y `-` | Contenido aparentemente visible | Falso positivo: la captura observaba una transicion intermedia. |
| `Space` | Dialogo aparentemente ausente | Falso positivo: selector de prueba incorrecto. |
| `Ctrl+G` | Seleccion conservada | Falso positivo: el setup habia abierto hints y el comando cancelo primero ese contexto. |

## Correcciones

1. `Cmd+K` abre una paleta real, busca en el registro, admite flechas, `Enter`, `Esc` y click.
2. `Shift+A` crea una condicion padre y el link desde la entidad seleccionada.
3. `A` y `Shift+A` dejan activa la nueva entidad.
4. La colocacion relacional compara cajas completas, evita solapes y prioriza el viewport.
5. El crecimiento del frame se rechaza si englobaria nodos o frames ajenos.
6. El auditor espera una cola estable y verifica selectores y estados de contrato.

## Resultado final

- Auditoria de teclado: `43/43 PASS`.
- Suite completa del prototipo: `PASS`.
- Regresion visual general: `37/37 PASS`.
- Problemas abiertos derivados de esta auditoria: ninguno.

## Repeticion

```bash
cd "/Users/jullivarri/Documents/Codex/2026-07-13/LTP Workbench"
npm run test:shortcuts
```

La suite falla si aparece un binding sin asercion, si dos configuraciones dejan de resolverse como se espera o si una accion no produce su efecto observable.
