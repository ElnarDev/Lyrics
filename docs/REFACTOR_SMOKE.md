# Recorridos de regresión de la migración

Verificación previa al empaquetado (02-10-2026): `npm run installer:win` ejecutó `npm run verify` (tipos, build, sintaxis y 100 pruebas correctas) y generó `dist/Lyrics-Setup-0.1.0-x64.exe`. SHA-256: `B5E44CE6445CA4E5F744A6D31C14718A69C50EAEFA54D36F68879EAAE05BB9B8`. Los comandos de empaquetado y la CI exigen ahora esa secuencia. No se ejecutó instalación, interfaz gráfica ni reproducción real en esta comprobación.

Configuraciones separadas (30-09-2026): `npm run typecheck` pasó para shared, Node/Electron, renderer y extensión. `npm run check` y `npm test` pasaron (95/95) en el proyecto y en la copia con dependencias instaladas mediante `npm ci --ignore-scripts`. Se corrigió el descubrimiento de pruebas para usar solo `test/*.test.js`, ya que `node --test` sin ruta también encontraba la copia aislada bajo `out/`. Ninguna prueba de reproducción real se marcó como hecha.

Instalación limpia aislada (30-09-2026): se copiaron fuentes y recursos a `out/ci-verify` sin copiar `node_modules` ni `build`. Con Node 24.21.0, `npm ci --ignore-scripts --prefer-offline` instaló 290 paquetes y notificó 0 vulnerabilidades; después pasaron `npm run typecheck`, `npm run check` y `npm test` (95/95). Esta comprobación no ejecutó la instalación con scripts de Electron ni el instalador NSIS dentro de esa copia. El primer intento sin elevación recibió `EPERM` del entorno al crear `node_modules` y `build`; los mismos comandos terminaron al permitir el acceso.

Avance del proceso principal TypeScript (30-09-2026): `npm run typecheck`, `npm run check` y `npm test` pasaron (95/95); `npm run pack:win` terminó. `app.asar` incluye `build/desktop/main.js`, `preload.js` y `renderer.js` sin archivos `.ts`. La prueba de reproducción real se mantiene pendiente hasta cerrar toda la migración y sus verificaciones estructurales.

Acuerdo de validación manual (30-09-2026): la prueba de reproducción real con YouTube Music queda pendiente por indicación del usuario hasta terminar toda la migración a TypeScript. No se marcará como realizada mediante pruebas automatizadas ni por construir los paquetes.

Avance del script de contenido TypeScript (30-09-2026): `npm run typecheck`, `npm run check` y `npm test` pasaron (95/95). Las pruebas usan `build/extension/content.js` y cubren reconexión, observación selectiva de metadatos y sondeo ligero. Falta comprobar reproducción real y medir el script cargado en Chrome.

Avance del popup TypeScript (30-09-2026): `npm run typecheck`, `npm run check` y `npm test` pasaron (95/95). Las pruebas usan `build/extension/popup.js`, incluidos los casos de versión incompatible, token inválido y mensajes malformados. Falta cargar el popup generado en Chrome.

Avance del renderer TypeScript (30-09-2026): `npm run typecheck`, `npm run check` y `npm test` pasaron (93/93). `npm run pack:win` terminó y `app.asar` contiene `build/desktop/renderer.js`, sin archivos `.ts`. El bundle usa el contrato de preload y preferencias; los gestos de puntero tienen pruebas aisladas. Sigue pendiente arranque visual, arrastre entre pantallas y controles en la app empaquetada.

Avance de sincronización del renderer (30-09-2026): `npm run typecheck`, `npm run check` y `npm test` pasaron (91/91). La prueba del renderer ejecuta el archivo generado; los cálculos de identidad, línea activa y desfase tienen pruebas directas. Falta probar con reproducción real y controles de la ventana empaquetada.

Avance de preferencias (30-09-2026): `npm run typecheck`, `npm run check` y `npm test` pasaron (88/88). El artefacto de navegador expone la API de preferencias y las pruebas conservan persistencia, límites y desfase por canción. Falta comprobar los controles y la restauración en la app empaquetada.

Avance de preload (30-09-2026): `npm run typecheck`, `npm run check` y `npm test` pasaron (87/87). `preload` se compila desde TypeScript y su prueba comprueba que la API pública conserve los métodos y canales esperados. La carga visual de la ventana empaquetada sigue pendiente.

Avance de sesión de letras (30-09-2026): `npm run check`, `npm run typecheck` y `npm test` pasaron (86/86). `npm run pack:win` terminó y `app.asar` contiene `main.js`, `player-bridge.js` y `lyrics-session.js` compilados dentro de `build/desktop`, sin fuentes `.ts`. Sigue pendiente el recorrido manual de cambio rápido de canciones y reconexión con Chrome.

Avance de bandeja y atajos (30-09-2026): `npm run check`, `npm run typecheck` y `npm test` pasaron (85/85). `npm run pack:win` generó `dist/win-unpacked`; `app.asar` incluye `build/desktop/main.js` y `build/desktop/desktop-controls.js`, sin archivos fuente `.ts`. Las acciones de menú y el fallo de registro de Ctrl+Alt+X se comprobaron con pruebas simuladas. La interacción visual de bandeja y atajos en Windows sigue pendiente.

Avance de autenticación TypeScript (29-09-2026): `npm run check`, `npm run typecheck` y `npm test` pasaron (79/79). `npm run pack:win` generó `dist/win-unpacked`; `app.asar` contiene `build/desktop/main.js`, `player-bridge.js` y `bridge-auth.js`, sin archivos fuente `.ts`. El instalador completo se comprobó en el paso anterior del proveedor; el recorrido visual todavía está pendiente.

Avance del proveedor TypeScript (29-09-2026): `npm run typecheck`, `npm run check` y `npm test` pasaron (78/78). `npm run installer:win` terminó correctamente. SHA-256 del instalador generado: `DADDC4C20478824E5E2EEA596CBEAFCCB32AA90500DF5143A221A39357F238B6`. La inspección de `app.asar` confirmó `main.js`, `lyrics-provider.js`, `lyrics-parser.js` y `lyrics-matcher.js` dentro de `build/desktop`. El recorrido visual sigue pendiente.

Avance de compilación del 29-09-2026: `npm run typecheck` pasó, `npm test` pasó 72/72 (incluidas dos pruebas de salidas generadas) y `npm run installer:win` creó el NSIS. SHA-256: `17B6AF91BD515E440A3D738AC4EE7E79E85261A4855298F6EA7ACAB4DDB95E64`. La inspección de `app.asar` confirmó `build/desktop` con main, preload, HTML, CSS y scripts, `build/assets/tray-icon.png` y `node_modules/ws`. El arranque visual y la carga de `build/extension` en Chrome siguen pendientes de prueba manual.

Usar la app y la extensión **construidas desde los artefactos de la etapa**, no copias antiguas abiertas. Anotar fecha, versión y resultado antes/después de cada migración que cambie rutas, paquetes o puntos de entrada. Este documento define el recorrido; ninguna prueba manual nueva queda declarada como realizada.

| Recorrido | Acción y resultado esperado | Antes | Después |
| --- | --- | --- | --- |
| Vínculo | Abrir Lyrics, vincular la extensión con el token local y confirmar que la pista aparece sin volver a pedir la clave. | Pendiente | Pendiente |
| Reproducción | Reproducir, pausar, avanzar y cambiar de canción en YouTube Music; título, línea activa y tiempo siguen la pista actual. | Pendiente | Pendiente |
| Dos pestañas | Reproducir en dos pestañas, pausar/cerrar la activa; la otra recupera el control sin mezclar letras. | Pendiente | Pendiente |
| Reconexión | Reiniciar la app mientras una pista está pausada; al reconectar se muestran pista y posición. | Pendiente | Pendiente |
| Proveedor | Probar una pista con letra, una sin letra y una consulta sin red; aparecen los estados correctos y el reintento funciona desde bandeja y Ctrl+Alt+X. | Pendiente | Pendiente |
| Tres regresiones | Probar «Dios Mío Hasta Que Me Enamoré», «El Jardín Prohibido» y «Rebelión»; verificar título/artista/álbum, versión seleccionada y sincronización observada. | Pendiente | Pendiente |
| Ventana | Cambiar tamaño, mover entre monitores, ocultar/mostrar y usar modo compacto; la ventana permanece recuperable y los controles no se recortan. | Pendiente | Pendiente |
| Ajustes | Cambiar opacidad, tamaño y desfase; comprobar restauración tras reinicio, atajos ↑/↓ y botón de restablecimiento. | Pendiente | Pendiente |
| Seguridad | Probar extensión sin clave y con versión incompatible; no se aceptan datos antes de autenticar y negociar el protocolo. | Pendiente | Pendiente |
| Instalador | En Windows limpio, instalar, iniciar, actualizar y desinstalar; confirmar que no necesita Node.js ni archivos del árbol fuente. | Pendiente | Pendiente |

Resultado base automatizado del 29-09-2026, commit `e58ca18` antes de la migración, Node.js 24.21.0 y Electron 44.4.5: `npm run check` correcto, `npm test` 70/70 y `npm run installer:win` correcto. Tras añadir TypeScript, los tres comandos volvieron a pasar y `npm run typecheck` pasó. El instalador de esta segunda construcción quedó en `dist/Lyrics-Setup-0.1.0-x64.exe` con SHA-256 `3B23419F20404D499D7443B41D72016D8FEE2BFFCDF57396F2ED99F4F28CC48B`. El archivo `dist/` está ignorado por Git.
