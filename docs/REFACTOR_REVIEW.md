# Revisión de legibilidad del refactor

Fecha: 02-10-2026. Revisión acotada de composición, estado y selección. No equivale al cierre de la migración ni a una certificación de ausencia total de código muerto.

| Área revisada | Responsabilidades y resultado |
| --- | --- |
| `main/main.ts` | Compone ventana, estado, controles, diagnóstico y puente. Conserva una referencia global de bandeja; se documentó su retención deliberada. |
| `renderer/renderer.ts` | Compone eventos y estado de presentación; delega DOM a `lyrics-view`, preferencias a `display-preferences-controls`, desfase a `sync-controls` y gestos a `window-gestures`. No se añadió otro controlador de pista. |
| `renderer/lyrics-view.ts`, `sync-controls.ts` | Vista conserva invalidación y actualización de altura; sincronía conserva identidad de pista y retira el aviso al cambiar de canción. |
| `extension/content/content.ts` | Compone observador y conexión; no duplica autenticación ni lectura del reproductor. |
| `lyrics/lyrics-session.ts` | Conserva revisión e identidad que descartan respuestas tardías. La clasificación de resultados ahora usa una tabla exhaustiva `Record<LyricsResult["mode"], LyricsStatus>`; se retiró un parámetro genérico no usado. |
| Proveedor y matcher | HTTP/secuencia de consultas separados de identidad/puntuación/ambigüedad y del parser. El orquestador conserva sus alternativas; no se fragmentó en nuevos módulos sin una responsabilidad adicional. |
| Caché y fuentes | Caché conserva caducidad/LRU y consultas compartidas; fuentes conserva selección entre pestañas y vencimiento. No se combinaron sus estados con el renderer. |
| Preferencias y controles de presentación | `renderer/preferences.ts` normaliza valores y tolera errores de almacenamiento; `display-preferences-controls.ts` aplica valores al DOM y delega persistencia. La conversión de texto a número se conserva para los controles HTML. |
| Estado y geometría de ventana | `window/window-state.ts` valida el JSON y escribe mediante archivo temporal; `window-bounds.ts` concentra cálculos de restauración, redimensionado y recuperación. `renderer/window-gestures.ts` captura gestos y delega las acciones a preload; la revisión no reemplaza la prueba entre monitores. |
| Sincronía | `renderer/sync-state.ts` concentra identidad y cálculo de línea activa; los controles conservan almacenamiento del desfase por pista. No se unificó esa identidad de presentación con la clave de búsqueda del proveedor, que tiene otro propósito. |
| Controles del escritorio | `main/desktop-controls.ts` recibe el entorno y acciones, conserva disponibilidad de atajos y obtiene clave/diagnóstico al hacer clic. No se movió la propiedad de ventana o bandeja fuera de main. |
| Validadores y estados de error | `bridge/player-message.ts` valida tamaño, campos y rangos antes de producir estado; `shared/bridge-server-message.ts` mantiene el caso de app antigua sin versión; `lyrics/lyrics-errors.ts` transforma errores en estados sin mostrar su texto. |

## Evidencia

- Validación de almacenamiento del 02-10-2026: los desfases inválidos de otras canciones ya no se vuelven a persistir ni ocupan plazas del límite de 100 al guardar. Se mantienen números finitos no nulos dentro de ±10 s y claves no vacías; claves reservadas se escriben como propiedades propias. Tres regresiones y 124/124 pruebas, cuatro typechecks, build y sintaxis correctos. El JSON ilegible conserva el fallo seguro previo; no se probó un recorrido visual nuevo.

- Consolidación posterior del 02-10-2026: búsqueda y reproducción usan `TrackMetadata`; el parser deriva variantes de `LyricsResult`; el renderer importa y reexporta `DisplayPreferences` compartido. Las correspondencias y casos negativos están en `test/types/shared-contracts.ts`. Cuatro typechecks, build, sintaxis y 121/121 pruebas correctas tras este cambio de tipos; sin modificación del comportamiento ni nueva comprobación visual.

- Búsqueda en `src/`: sin `any` explícito, `TODO` ni `FIXME` encontrados. Es una comprobación textual, no prueba de ausencia de código muerto.
- Auditoría con `--noUnusedLocals --noUnusedParameters`: renderer y extensión sin hallazgos; Node detectó el genérico de `SessionOptions` y la referencia de bandeja. Se retiró el primero y se conservó/comentó la segunda por su ciclo de vida. Estas opciones se usaron para revisar, sin modificar la configuración del proyecto.
- Cuatro configuraciones estrictas, build, sintaxis y **121/121 pruebas** pasaron tras cambiar la clasificación de resultados. La prueba nueva comprueba todos los modos y sus líneas/estados.
- Tras la limpieza exclusivamente de tipos/comentario: typecheck Node, build y **10/10 pruebas** de sesión, controles y fronteras pasaron.
- Las pruebas de fronteras comprueban imports relativos, separación de capas y ciclos en las fuentes actuales; el índice disponible del grafo era anterior a la migración y no se usó como evidencia del estado actual.
- `docs/DATA_FLOW.md` se actualizó con búsqueda por créditos, alternativas y distinción entre letras de YouTube y LRCLIB.
- Revisión adicional del 02-10-2026: lectura de los módulos enumerados arriba y de la configuración de CI. `TODO.md` actualiza referencias vigentes a TypeScript y distingue negociación del protocolo de versiones de producto. Se preservan las filas históricas. Esta continuación solo modifica documentación; se comprueban las rutas vigentes y el formato del diff, sin nueva ejecución de la suite.

## Pendientes

Cierre de contratos/validación global y revisión final de legibilidad de toda la migración, instalación limpia con scripts y paquete final, ejecución remota de CI y recorridos manuales. La revisión adicional y las referencias vigentes de `TODO.md` quedan registradas; no constituyen una comprobación exhaustiva de código muerto. Las evidencias históricas conservan su fecha y no se convierten en comprobaciones actuales.
