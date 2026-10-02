# Revisión de controles de seguridad del refactor

Fecha: 02-10-2026. Alcance: fuentes y salida local generada; revisión y pruebas automatizadas. No certifica el instalador ni todos los recorridos reales de Windows/Chrome.

| Límite | Evidencia observada | Validación |
| --- | --- | --- |
| Ventana aislada | `window/overlay-window.ts`: `contextIsolation`, `sandbox`, `webSecurity`, Node deshabilitado; bloqueo de navegación y ventanas nuevas. | `test/overlay-window.test.js` comprueba opciones y handlers simulados. |
| Permisos del renderer | Solicitudes y comprobaciones previas denegadas mediante ambos handlers de sesión. | Prueba de ventana ampliada: media, notificaciones, portapapeles, geolocalización y permiso desconocido; comprobación también con `webContents` null. |
| CSP | `desktop/index.html`: scripts/estilos locales; sin conexiones, frames, objetos ni formularios. | Inspección del HTML fuente; ejecución real del paquete pendiente. |
| Preload e IPC | API concreta sin exponer `ipcRenderer`; comandos con emisor/frame/URL verificados, campos exactos y argumentos limitados; eventos internos correlacionados por canal. | Pruebas de preload/IPC, tipos negativos y sesión. |
| WebSocket | `bridge/player-bridge.ts`: loopback `127.0.0.1`, máximo 4096 bytes, origen limitado, autenticación y negociación antes de datos. `bridge-auth.ts`: comparación en tiempo constante y autenticación de cinco segundos. | Pruebas de autenticación, origen, mensajes y conexión WebSocket local. No todos los controles tienen aquí una prueba de integración individual. |
| Letras externas | Parser valida marcas numéricas; matcher/proveedor validan identidad, duración y rutas alternativas; vista inserta texto con `textContent`. | Regresiones de parser, proveedor, matcher y renderer; inspección de `renderer/lyrics-view.ts`. |
| Diagnóstico | Lista cerrada de códigos y retención en memoria. `main.ts` suministra callbacks que registran códigos, no el error bruto ni sus datos. | Pruebas de diagnóstico y revisión de composición. Los defaults de consola del puente permanecen disponibles para consumidores que no suministren esos callbacks. |
| Salida local | El build revisado no genera archivos `.map`. | Búsqueda en `build/` después de reconstruir; no se revisó un instalador nuevo en este incremento. |

## Ajuste realizado

Se añadió `setPermissionCheckHandler(() => false)` junto a la denegación de solicitudes existente. [La documentación de Electron](https://www.electronjs.org/docs/latest/api/session#sessetpermissioncheckhandlerhandler) especifica que ambos handlers son necesarios para manejar comprobaciones y solicitudes. La firma también se comprobó en los tipos de la versión instalada.

Las acciones de copiar diagnóstico y clave se realizan desde main mediante Electron; este cambio deniega permisos web del renderer. La extensión funciona en Chrome y utiliza su propio almacenamiento.

## Resultado y pendientes

Pasaron cuatro configuraciones TypeScript estrictas, build, sintaxis de seis entradas y **120/120 pruebas**, ejecutados con Node 24.21.0 de Electron. Se amplió una prueba existente, sin aumentar el número total.

Pendientes: revisión del paquete final tras instalación limpia, arranque/uso real del overlay con este control, pruebas de Chrome y monitores, revisión final de legibilidad y primera ejecución remota de CI. El informe no sustituye esos controles ni cierra por sí solo la migración.
