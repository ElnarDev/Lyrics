# Flujo de datos de Lyrics

Verificado contra `extension/content.js`, `extension/manifest.json`, `desktop/player-bridge.js`, `desktop/main.js` y `desktop/renderer.js` el 28 de septiembre de 2026. Este documento describe la implementación actual, no funciones futuras. El formato exacto de los mensajes se detalla en [`BRIDGE_PROTOCOL.md`](BRIDGE_PROTOCOL.md).

| Etapa | Datos | Destino y finalidad | Persistencia actual |
| --- | --- | --- | --- |
| Extensión en `music.youtube.com` | Título, línea de descripción del reproductor, álbum si está presente, duración del elemento `video`, tiempo actual y estado de pausa | Mensaje WebSocket a `127.0.0.1:37421` para sincronizar Lyrics | Solo variables en memoria de la pestaña. El último mensaje se conserva para evitar duplicados. |
| Vinculación local | Token aleatorio de 256 bits, copiado por el usuario desde la bandeja de Lyrics al popup de la extensión | Autenticar cada conexión WebSocket antes de aceptar datos del reproductor | Archivo `bridge-token` en los datos locales de Electron y `chrome.storage.local` en el perfil de la extensión. No sale a LRCLIB. |
| Aplicación de escritorio | Campos requeridos `title`, `artist`, `currentTime`, `paused`; campos opcionales `album`, `duration` | Actualizar la ventana local y elegir la versión de la letra | Pista activa y resultados de letras en memoria; no hay archivo de historial. Los tres ajustes visuales se guardan en el almacenamiento de Electron; posición, tamaño y modo compacto se guardan en `window-state.json` dentro de los datos locales de la aplicación. |
| Consulta a LRCLIB | Título, primer segmento de la línea `artist`, álbum y duración cuando están disponibles | Solicitud HTTPS a `lrclib.net/api/get`; si no se obtiene una coincidencia suficiente, a `lrclib.net/api/search` | Caché local en memoria de hasta 200 canciones: letra sincronizada una hora; ausencias cinco minutos; resultados ambiguos dos minutos. Los errores de consulta no se conservan. LRCLIB puede tratar los datos recibidos según sus propias prácticas; Lyrics no controla ese almacenamiento. |
| Presentación | Letras sincronizadas y tiempo de reproducción; si solo hay letra sin tiempos se muestra un estado informativo, no la letra manual | Ventana local del usuario | Las letras no se guardan en disco. |

La variable `artist` de la extensión conserva la línea completa de descripción de YouTube Music, que puede incluir artista, álbum y año; para la consulta se toma solo el primer segmento como artista y el segundo como álbum cuando existe. La extensión está limitada en su manifiesto a `https://music.youtube.com/*`. El código actual no solicita inicio de sesión, no lee cookies o contraseñas y no envía el tiempo transcurrido de reproducción a LRCLIB. Sí puede enviar la duración total de la pista para escoger la grabación correcta. La aplicación acepta también mensajes antiguos sin álbum ni duración mientras se actualiza la extensión.

No hay cuentas, analítica ni telemetría implementadas. Los errores de consulta se escriben en la consola local. La conexión entre extensión y escritorio usa WebSocket de loopback; valida origen, campos y tamaño y exige el token de vinculación antes de aceptar datos. Un proceso local sin la clave no puede autenticarse simplemente falsificando el origen. Un programa con acceso a los archivos del perfil del mismo usuario podría leer la clave; no es una defensa contra malware ejecutado con los permisos del usuario.

## Revisión antes de publicar

- Confirmar este flujo después de cualquier cambio a la extensión, proveedor, caché o diagnóstico.
- Comprobar con una captura de red que solo título, artista, álbum y duración total salgan hacia LRCLIB, sin tiempo transcurrido ni credenciales.
- Describir en la ficha de Chrome Web Store tanto el procesamiento local como la consulta externa de metadatos de canción.
