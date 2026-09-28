# Contrato local entre la extensión y Lyrics

Estado de la implementación al 28 de septiembre de 2026. Este documento describe el protocolo actual. La versión del protocolo es `1` y es independiente del número de versión comercial de la app o la extensión.

## Transporte y autenticación

- La extensión abre un WebSocket a `ws://127.0.0.1:37421`. El servidor solo escucha en loopback.
- Se acepta el origen `https://music.youtube.com` o un origen `chrome-extension://` con identificador válido. El origen por sí solo no autentica la conexión.
- Antes de enviar datos de reproducción, la extensión manda `{"type":"auth","token":"<64 caracteres hexadecimales>"}`. El token aleatorio se obtiene del menú de bandeja de Lyrics y se guarda en `chrome.storage.local`.
- El servidor responde `{"type":"ready","protocolVersion":1}` cuando acepta la clave. La extensión comprueba esta versión y envía `{"type":"hello","protocolVersion":1}`. El servidor responde `{"type":"compatible"}`; solo a partir de entonces se aceptan datos de reproducción.
- Si la autenticación no llega en cinco segundos, es inválida o el origen no está permitido, el servidor cierra la conexión con código WebSocket `1008`. Si la negociación de versión falla, la cierra con `4002` y muestra en la ventana que hay que actualizar la extensión.
- Una extensión nueva reconoce una aplicación antigua porque su respuesta `ready` no incluye `protocolVersion`; el popup indica que hay que actualizar la aplicación. Una extensión antigua no envía `hello`; la aplicación nueva indica que hay que actualizar la extensión.
- El servidor limita cada mensaje a 4096 bytes y rechaza mensajes binarios y campos inesperados. Un `hello` ausente o incompatible cierra con `4002`; después de `compatible`, un estado de reproductor inválido cierra con `1008`.

## Estado del reproductor

Después de `compatible`, la extensión puede enviar mensajes JSON con estos campos:

| Campo | Tipo | Obligatorio | Significado |
| --- | --- | --- | --- |
| `title` | cadena, máximo 300 caracteres | Sí | Título visible de la canción. |
| `artist` | cadena, máximo 500 caracteres | Sí | Línea de descripción de YouTube Music; puede incluir álbum y año separados por `•` o `·`. |
| `currentTime` | número finito entre 0 y 86400 | Sí | Segundos transcurridos del elemento multimedia. |
| `paused` | booleano | Sí | Si la reproducción está pausada. |
| `album` | cadena, máximo 300 caracteres | No | Álbum extraído de la descripción, cuando existe. |
| `duration` | número finito entre 0 y 86400 | No | Duración total en segundos, cuando está disponible. |

La extensión reenvía el estado actual tras cada reconexión, aunque la pista esté pausada. Envía cambios de pista, pausa, búsqueda y tiempo de reproducción. El servidor selecciona una sola fuente activa entre varias pestañas y descarta fuentes sin actualizaciones recientes. No se transmiten letras ni preferencias por este WebSocket.

## Estados internos de la ventana

El puente emite `player-update` con el estado seleccionado y `lyrics-update` con `lines`, `status` y, cuando procede, `mode`. La ventana recibe estos eventos por el preload aislado; no tiene acceso directo al WebSocket ni al token. Los estados actuales incluyen `waiting`, `loading`, `ready`, `not-found`, `not-synced`, `ambiguous`, `timeout`, `offline`, `invalid-response`, `error` y `update-extension`.

Archivos fuente: `extension/content.js`, `desktop/bridge-auth.js`, `desktop/player-message.js`, `desktop/player-sources.js`, `desktop/player-bridge.js`, `desktop/lyrics-session.js`, `desktop/preload.js`.

## Cambio futuro incompatible

Al cambiar campos obligatorios, autenticación o semántica de mensajes, incrementar `protocolVersion` en la aplicación y la extensión. Mantener el aviso de incompatibilidad en ambos lados y probar las combinaciones vieja/nueva antes de publicar.
