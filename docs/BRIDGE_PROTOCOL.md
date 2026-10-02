# Contrato local entre la extensión y Lyrics

Estado de la implementación al 28 de septiembre de 2026. Este documento describe el protocolo actual. La versión del protocolo es `1` y es independiente del número de versión comercial de la app o la extensión.

## Transporte y autenticación

Validación del cliente revisada el 02-10-2026: popup y script de contenido usan `src/shared/bridge-server-message.ts` para validar la respuesta del servidor. Rechazan campos extra y versiones inválidas e ignoran `compatible` antes de enviar `hello`; así no muestran conexión ni envían reproducción antes de negociar la versión.

Los contratos de negociación se definen en `src/shared/protocol.ts`. `BridgeClientMessage` y `BridgeServerMessage` comprueban los mensajes salientes antes de serializarlos. `ServerHandshakeMessage` describe las respuestas ya validadas, incluidas versiones anteriores o incompatibles; el parser conserva la comprobación en ejecución de datos `unknown`. Los tipos no sustituyen la autenticación ni la validación del JSON recibido.

Consolidación de tipos del 02-10-2026: `TrackMetadata` define título, artista, álbum y duración para `PlayerMessage` y el alias de búsqueda `TrackQuery`. `ParsedLyrics` deriva sus variantes sincronizada y simple de `LyricsResult`; las preferencias normalizadas `DisplayPreferences` también se definen en el contrato compartido y el renderer las reexporta. `test/types/shared-contracts.ts` comprueba correspondencias y formas inválidas durante typecheck. Este cambio no modifica el JSON transmitido, las claves de almacenamiento ni `protocolVersion: 1`.

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

Archivos fuente: `src/extension/content/content.ts`, `src/extension/content/bridge-connection.ts`, `src/extension/content/player-observer.ts`, `src/extension/popup/popup.ts`, `src/shared/protocol.ts`, `src/shared/overlay-api.ts`, `src/desktop/bridge/bridge-auth.ts`, `src/desktop/bridge/player-message.ts`, `src/desktop/bridge/player-sources.ts`, `src/desktop/bridge/player-bridge.ts`, `src/desktop/lyrics/lyrics-session.ts`, `src/desktop/preload/preload.ts`. El ejecutable usa los archivos compilados en `build/desktop`; Chrome carga la extensión desde `build/extension`.

`OverlayEventArgs` y la unión de tuplas `OverlayEvent`, en `src/shared/overlay-api.ts`, comprueban canal y argumentos a lo largo de sesión → puente → main → ventana y en las suscripciones del preload:

| Evento | Argumentos |
| --- | --- |
| `player-update` | Un `PlayerMessage`. |
| `lyrics-update` | Un `LyricsUpdate`, con líneas `{ time, text }`. |
| `compact-mode` | Un booleano. |
| `reset-appearance` | Ningún argumento. |

La sesión convierte un resultado `plain` en líneas vacías y estado `not-synced`; no transmite cadenas sin tiempo como si fueran líneas sincronizadas. Esta comprobación de tipos cubre emisores internos y no sustituye la validación en ejecución de datos externos en WebSocket, HTTP, almacenamiento y comandos IPC. Los casos negativos se comprueban durante `typecheck` en `test/types/overlay-events.ts`, sin ejecutarse ni incluirse en el paquete.

## Comandos internos de renderer a main

`src/shared/overlay-api.ts` define los argumentos IPC que el preload envía mediante su API concreta; el renderer no obtiene acceso a `ipcRenderer`. Main valida los datos como `unknown` y comprueba que procedan del `webContents`, frame principal y URL de la ventana actual.

| Canal | Argumentos permitidos |
| --- | --- |
| `compact-content-height` | Un número finito con valor absoluto máximo de 1000; solo actúa en modo compacto y ajusta la altura al monitor. |
| `resize-overlay` | Un objeto con exactamente `side` (`left` o `right`), `dx` y `dy`. |
| `move-overlay` | Un objeto con exactamente `dx` y `dy`. |
| `hide-overlay` | Ningún argumento. |
| `exit-compact-mode` | Ningún argumento; solo actúa en modo compacto. |

`dx` y `dy` deben ser números finitos con valor absoluto máximo de 1000. Todos los comandos rechazan argumentos adicionales; los objetos de movimiento y redimensionado también rechazan campos adicionales. Estos controles internos no modifican el protocolo WebSocket `1`.

## Cambio futuro incompatible

Al cambiar campos obligatorios, autenticación o semántica de mensajes, incrementar `protocolVersion` en la aplicación y la extensión. Mantener el aviso de incompatibilidad en ambos lados y probar las combinaciones vieja/nueva antes de publicar.
