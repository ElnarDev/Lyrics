# Lyrics — lista para publicar

Esta es la lista de trabajo para pasar del prototipo funcional a una aplicación pública de Windows. Marca una casilla solo cuando su criterio de cierre se haya comprobado. Mantén aquí el enlace al cambio, prueba o decisión que lo respalde. La publicación pública requiere que estén completas todas las tareas **P0** y **P1**; las **P2** pueden entrar en versiones posteriores.

## Estado de referencia

- [x] El prototipo detecta la canción en YouTube Music mediante la extensión y muestra letras sincronizadas consultadas en LRCLIB.
- [x] La ventana flotante permite moverla, ajustar opacidad y tamaño de letra, y alternar el modo compacto.
- [ ] Hay una versión instalable y reproducible que un usuario nuevo puede usar sin Node.js ni modo desarrollador de Chrome.

## P0 — Riesgos que bloquean la publicación

### Fuente de letras y privacidad

- [ ] **Confirmar el derecho a distribuir la experiencia con letras de LRCLIB.** Documentar las condiciones del servicio y la situación de derechos sobre las letras; si no hay autorización suficiente, acordar una fuente o un modelo de uso válido antes de publicar.
- [x] **Documentar el flujo de datos.** Explicar los metadatos de pista enviados por la extensión a la aplicación local y los que la aplicación consulta en LRCLIB. Verificar que no se transmitan credenciales ni datos ajenos a la función. Evidencia: [`docs/DATA_FLOW.md`](docs/DATA_FLOW.md) y revisión del código; falta corroborar con captura de red antes de publicar.
- [ ] **Publicar una política de privacidad y completar las declaraciones de Chrome Web Store.** La descripción de la tienda, la política y el comportamiento real deben coincidir. Registrar un canal de contacto para privacidad y soporte.

### Seguridad de la comunicación y de Electron

- [ ] **Proteger la conexión local entre extensión y aplicación.** Implementado un token aleatorio por instalación, autenticación antes de aceptar datos y popup de vinculación. Pasaron las pruebas automatizadas y el servidor en ejecución rechazó con código 1008 una conexión local que falsificó el origen sin clave; con clave entregó `ready`. Falta recargar la extensión instalada y probar la vinculación en Chrome real. Evidencia: `desktop/bridge-auth.js`, `extension/popup.html` y `test/bridge-auth.test.js`.
- [x] **Endurecer la ventana Electron.** Política de seguridad de contenido, navegación y ventanas nuevas bloqueadas, renderer aislado y emisor/parámetros de IPC validados. La aplicación arrancó sin la advertencia previa de CSP y continuó mostrando canción y letras.
- [x] **Evitar instancias duplicadas.** Si Lyrics ya está abierto, la segunda ejecución muestra la instancia existente; no crea otra ventana con el servidor local inutilizable. Verificado iniciando Lyrics dos veces y comprobando que permaneció un solo proceso principal.
- [x] **Revisar dependencias antes de cada entrega.** Electron actualizado a una versión estable con soporte, dependencias instaladas y auditoría de npm sin avisos conocidos. Repetir esta revisión en cada entrega. Evidencia: [`docs/DEPENDENCY_REVIEW.md`](docs/DEPENDENCY_REVIEW.md).

### Exactitud y continuidad de las letras

- [x] **Resolver la pista con más metadatos.** La extensión envía álbum y duración cuando YouTube Music los proporciona; la búsqueda contrasta título, artista, álbum y duración, descarta versiones con duración incompatible y evita elegir entre resultados de igual calidad pero letras distintas. Si la coincidencia exacta solo tiene texto, puede elegir una versión sincronizada con título y artista coincidentes y duración próxima o álbum coincidente. Cubierto por `test/lyrics-provider.test.js`; falta prueba manual con la extensión recargada antes de la beta.
- [x] **Definir la selección entre varias pestañas.** Una sola pestaña controla la ventana; una pestaña pausada no desplaza a una que reproduce, una nueva reproducción toma el control y al cerrar o pausar la pestaña activa se recupera otra fuente disponible. Cubierto por `test/player-sources.test.js`; queda una prueba manual con dos pestañas reales antes de la beta.
- [x] **Recuperar la conexión sin perder el estado actual.** Al reconectar, la extensión reenvía de inmediato la pista y posición aunque la canción esté pausada o los datos sean idénticos al último mensaje. Cubierto por `test/extension-reconnect.test.js`.
- [x] **Manejar fallos del proveedor.** Se muestran estados distintos de espera, carga, ausencia de letras, falta de conexión, tiempo agotado y respuesta inválida. El menú de bandeja y Ctrl+Alt+X permiten reintentar sin conservar un resultado tardío anterior; el menú anuncia el atajo solo si se registró. Cubierto por `test/lyrics-errors.test.js`; queda una prueba manual de desconexión antes de la beta.

## P1 — Calidad necesaria para una primera versión pública

### Instalación, actualización y publicación

- [ ] **Crear un instalador de Windows.** NSIS x64 con nombre e icono de Lyrics generado localmente y construcción añadida a CI; el instalador incorpora desinstalación. Falta comprobar instalación limpia, actualización y desinstalación en una máquina sin Node.js.
- [ ] **Definir firma y procedencia del instalador.** Elegir el método de firma y publicar descargas verificables desde un canal oficial. Probar el recorrido de descarga e instalación.
- [ ] **Preparar la extensión para Chrome Web Store.** Añadir iconos y material de la ficha, declarar el propósito único y los datos utilizados, proporcionar instrucciones para instalar también la aplicación y pasar la revisión de la tienda.
- [x] **Sincronizar versiones y compatibilidad.** El puente negocia `protocolVersion: 1` antes de aceptar datos de reproducción. La extensión nueva detecta una app antigua y lo indica en el popup; la app nueva rechaza una extensión antigua y muestra un aviso de actualización. Evidencia: `docs/BRIDGE_PROTOCOL.md`, `test/player-bridge.test.js` y `test/extension-popup.test.js`. Falta verificar las combinaciones instaladas en Chrome real antes de la beta.
- [ ] **Definir actualizaciones y reversión.** Las correcciones deben llegar sin pedir al usuario que repita la instalación manual; probar una actualización fallida y la recuperación.

### Comportamiento de uso diario

- [x] **Guardar preferencias locales.** Se restauran posición, dimensiones, opacidades, tamaño de letra y modo compacto. La geometría se ajusta al área visible al iniciar o cuando cambia la configuración de monitores. Evidencia: `desktop/window-state.js`, `test/window-state.test.js` y archivo local creado en un arranque real; queda prueba manual con desconexión física de monitor antes de la beta.
- [ ] **Optimizar la extensión.** El sondeo de 750 ms consulta el tiempo solo mientras se reproduce; los eventos multimedia actualizan de inmediato pausa y reanudación. Título y artista se leen únicamente al cambiar sus nodos o texto. El observador del reproductor detecta reemplazos de esos nodos sin vigilar cambios de texto ajenos a los metadatos. `test/extension-reconnect.test.js` comprueba que diez muestras de reloj y una mutación irrelevante no releen metadatos, que la pausa no lee el tiempo y que los cambios de canción siguen llegando. Falta medir CPU/memoria en Chrome durante una sesión larga y decidir si se puede reducir la frecuencia de sincronía sin retrasar las letras.
- [x] **Controlar la caché de letras.** Máximo 200 canciones con expulsión LRU; resultados sincronizados durante una hora, ausencias durante cinco minutos y coincidencias ambiguas durante dos. Las consultas simultáneas se comparten y los errores temporales no se guardan. Evidencia: `desktop/lyrics-cache.js` y `test/lyrics-cache.test.js`.
- [x] **Revisar accesibilidad y control.** Atajo y alternativa de bandeja documentados. La interfaz ofrece doble clic para salir del modo compacto, muestra el atajo solo si pudo registrarse, agranda controles y mejora la visibilidad de líneas inactivas. La bandeja permite restablecer opacidades y tamaño de letra cuando una configuración dificulta ver la ventana. El anuncio para tecnologías de asistencia contiene solo la línea activa o el estado actual, sin repetirlo con cada muestra del reloj. Uso real en Windows, lectura y controles comprobados por el usuario el 29-09-2026.
- [ ] **Probar superposición y geometría en Windows.** El cambio entre ventana normal y compacta ajusta posición y tamaño al monitor correspondiente; el arrastre conserva visible una zona para recuperarla y el redimensionado mantiene la ventana dentro del área del monitor. Tras un fallo observado al cruzar pantallas, las coordenadas y tamaños recibidos por Electron se redondean a enteros. Cubierto por `test/window-bounds.test.js`. Falta repetir estos recorridos en pantallas reales y validar transparencia y prioridad tras Alt+Tab o suspensión.
- [x] **Adaptar el contenido al tamaño de la ventana.** Los controles se reorganizan cuando falta ancho, las líneas largas se ajustan y se muestra una cantidad de líneas acorde con la altura disponible; la letra aumenta moderadamente en ventanas anchas. Cubierto por `test/renderer-updates.test.js` y comprobado visualmente por el usuario en Windows el 29-09-2026.

### Pruebas y mantenimiento

- [x] **Añadir pruebas automatizadas del comportamiento crítico.** Se cubren parseo y selección de letras, reconexión, estados de error, selección entre pestañas, preferencias, recursos de la extensión y cambios rápidos de pista con respuestas tardías, reintentos y reapertura de ventana. Evidencia: `test/lyrics-session.test.js` y 49 pruebas locales correctas. La regresión con Chrome real sigue pendiente como puerta de la beta.
- [ ] **Crear un flujo de integración continua.** Base en `.github/workflows/ci.yml`: Windows con Node 22 y 24, instalación desde el archivo de bloqueo, sintaxis, pruebas y auditoría de dependencias. Añadida construcción local del instalador con comprobación de SHA-256, sin publicación. Falta observar la primera ejecución en GitHub.
- [x] **Separar responsabilidades del código.** El puente WebSocket y su autenticación están en `desktop/player-bridge.js`; la selección de fuentes, la sesión de letras, el proveedor/caché y la ventana tienen módulos separados. El contrato entre extensión y app está documentado en `docs/BRIDGE_PROTOCOL.md` y probado con una conexión local real en `test/player-bridge.test.js`. La negociación de versiones sigue como tarea independiente.
- [ ] **Preparar soporte y diagnóstico con privacidad.** La bandeja muestra la versión y permite copiar un informe de hasta 50 códigos de error recientes, conservados solo en memoria y sin datos de canciones, letras o claves. Falta definir y comprobar un canal público de soporte y probar el recorrido de reporte con la aplicación instalada.

## P2 — Mejoras posteriores al lanzamiento

- [ ] Ajuste manual de sincronía por canción cuando una letra exista pero esté desplazada. Controles de ±0,5 s y restablecimiento a cero implementados; ↑ y ↓ aplican el mismo paso desde la ventana enfocada, con aviso de 0,5 s e indicador del desfase en modo compacto. El valor se guarda localmente por pista y se aplica en ambos modos. Cubierto por `test/preferences.test.js` y `test/renderer-updates.test.js`; falta prueba manual con una pista real antes de cerrar la casilla.
- [ ] Opciones adicionales de presentación y accesibilidad basadas en comentarios reales de usuarios.
- [ ] Compatibilidad con otros reproductores después de estabilizar YouTube Music.

## Puertas de salida

- [ ] **Beta cerrada:** todos los P0 completos; instalador y extensión probados por personas que no participaron en el desarrollo; sin fallos que mezclen canciones o dejen la app inutilizable.
- [ ] **Publicación pública:** todos los P0 y P1 completos; derechos y privacidad documentados; instalador y extensión aprobados y comprobados; ruta de actualización y soporte operativa.

## Registro de verificación

Anota aquí, para cada casilla completada, la fecha, versión y evidencia (prueba, cambio, documento o captura). Si una decisión reemplaza una tarea, conserva el motivo y la alternativa aplicada.

| Tarea | Versión/fecha | Evidencia |
| --- | --- | --- |
| Flujo de datos documentado | 27-09-2026 | `docs/DATA_FLOW.md`; revisión de extensión, puente local y consulta a LRCLIB. |
| Instancia única | 27-09-2026 | Segunda ejecución terminada correctamente; permaneció un solo proceso principal de Lyrics. |
| Ventana Electron endurecida | 27-09-2026 | CSP, bloqueo de navegación/ventanas, validación de IPC; arranque sin advertencia CSP y comprobación visual de letras en ejecución. |
| Reconexión de la extensión | 27-09-2026 | `test/extension-reconnect.test.js`; la pista pausada se envía al abrir la nueva conexión. |
| Selección entre pestañas | 27-09-2026 | `desktop/player-sources.js` y cuatro casos de `test/player-sources.test.js`; validación manual con varias pestañas pendiente para la beta. |
| Fallos del proveedor | 27-09-2026 | Estados visibles en `desktop/renderer.js`, reintento desde bandeja y `test/lyrics-errors.test.js`; prueba manual sin red pendiente para la beta. |
| Coincidencia de versión | 27-09-2026 | `test/lyrics-provider.test.js` verifica álbum, duración y ambigüedad; falta prueba manual con Chrome antes de la beta. |
| Dependencias | 27-09-2026 | `docs/DEPENDENCY_REVIEW.md`; Electron 44.4.5, ws 8.21.3, auditoría en línea sin vulnerabilidades, `npm run check` y 30 pruebas correctas, arranque visual de la ventana. |
| Caché de letras | 27-09-2026 | `desktop/lyrics-cache.js` y `test/lyrics-cache.test.js`; límite LRU, caducidad diferenciada, consultas simultáneas compartidas y fallos no persistidos. 39 pruebas correctas. |
| Preferencias de ventana | 27-09-2026 | `desktop/window-state.js` y `test/window-state.test.js`; geometría, modo compacto y recuperación al retirar monitor. Arranque real creó `window-state.json`; 44 pruebas correctas. |
| Base de integración continua | 27-09-2026 | `.github/workflows/ci.yml` y `test/extension-package.test.js`; 45 pruebas locales correctas. No equivale todavía a una ejecución remota ni a un artefacto instalable. |
| Cambios rápidos de pista | 27-09-2026 | `desktop/lyrics-session.js` y cuatro casos de `test/lyrics-session.test.js`; una respuesta tardía, un reintento anterior o una consulta de ventana previa no reemplazan las letras actuales. `npm run check` y 49 pruebas correctas. |
| Separación del puente y contrato | 28-09-2026 | `desktop/player-bridge.js`, `docs/BRIDGE_PROTOCOL.md` y `test/player-bridge.test.js`; autenticación y actualización de pista verificadas con WebSocket local. 50 pruebas correctas. |
| Compatibilidad de versiones | 28-09-2026 | Negociación `ready`/`hello`/`compatible` con `protocolVersion: 1`; pruebas de app y extensión antiguas en `test/player-bridge.test.js` y `test/extension-popup.test.js`. Prueba manual con Chrome pendiente. |
| Optimización parcial de la extensión | 28-09-2026 | `extension/content.js` y `test/extension-reconnect.test.js`; las muestras de tiempo y mutaciones irrelevantes no releen título/artista. Medición prolongada de CPU y memoria en Chrome pendiente; casilla abierta. |
| Accesibilidad y control, avance | 28-09-2026 | Doble clic para salir del modo compacto, estado real del atajo en la bandeja y controles más legibles. Comprobación visual y con tecnologías de asistencia pendiente; casilla abierta. |
| Diagnóstico privado, avance | 28-09-2026 | `desktop/diagnostics.js`, `test/diagnostics.test.js` y menú de bandeja; códigos cerrados en memoria e informe copiable. 56 pruebas correctas con Electron en modo Node. Canal de soporte y prueba instalada pendientes; casilla abierta. |
| Instalador Windows, avance | 28-09-2026 | `docs/INSTALLER.md`, `package.json` y `.github/workflows/ci.yml`; NSIS x64 local construido, contenido revisado y SHA-256 registrado. Sin firma; instalación y actualización reales pendientes. Casilla abierta. |
| Geometría al cambiar de modo, avance | 28-09-2026 | `desktop/window-bounds.js`, `desktop/main.js` y dos casos nuevos en `test/window-bounds.test.js`; `npm run check` y 58 pruebas correctas. Validación visual en Windows pendiente; casilla abierta. |
| Renderizado de letras, avance | 28-09-2026 | `desktop/renderer.js` y `test/renderer-updates.test.js`; las muestras de tiempo dentro de una línea no reconstruyen las letras ni reescriben título/artista. Validación con lector de pantalla pendiente; casilla de accesibilidad abierta. |
| Arrastre recuperable, avance | 28-09-2026 | `desktop/window-bounds.js`, `desktop/main.js` y dos casos en `test/window-bounds.test.js`; el arrastre mantiene una zona visible y permite cambiar de monitor. Prueba visual pendiente; casilla abierta. |
| Fallo al cruzar pantallas, corrección | 28-09-2026 | `desktop/window-bounds.js` y `desktop/main.js` redondean coordenadas y tamaños antes de las llamadas a Electron; caso de coordenadas fraccionarias en `test/window-bounds.test.js`. Ocho pruebas de geometría y sintaxis correctas; repetir el recorrido real tras reiniciar Lyrics. |
| Redimensionado visible, avance | 28-09-2026 | `desktop/window-bounds.js`, `desktop/main.js` y dos casos en `test/window-bounds.test.js`; los bordes izquierdo y derecho se ajustan al área del monitor. Comprobación visual pendiente; casilla abierta. |
| Recuperación de apariencia, avance | 28-09-2026 | Menú de bandeja, `desktop/renderer.js` y `test/renderer-updates.test.js`; opacidad de ventana de 0 % se restablece junto con los demás ajustes y se guarda. Prueba visual pendiente; casilla de accesibilidad abierta. |
| Anuncio de letras, avance | 29-09-2026 | `desktop/index.html`, `desktop/renderer.js`, `desktop/styles.css` y `test/renderer-updates.test.js`; se anuncia solo la línea activa o el estado y no se repite en cada muestra de tiempo. Prueba manual completada en el cierre de accesibilidad. |
| Accesibilidad y control, cierre | 29-09-2026 | El usuario confirmó la prueba manual en Windows de lectura, controles, legibilidad, recuperación de apariencia y modo compacto siguiendo el recorrido indicado. Casilla cerrada. |
| Diseño adaptable, avance | 29-09-2026 | `desktop/styles.css`, `desktop/renderer.js` y `test/renderer-updates.test.js`; controles flexibles, texto ajustable y cantidad variable de líneas según la altura. Validación visual pendiente; casilla abierta. |
| Diseño adaptable, cierre | 29-09-2026 | El usuario confirmó que la interfaz quedó bien tras probar el cambio visual. Casilla cerrada. |
| Sondeo durante pausa, avance | 29-09-2026 | `extension/content.js` y `test/extension-reconnect.test.js`; el intervalo omite lecturas del tiempo mientras el medio está pausado y el evento de reproducción reanuda la actualización. El usuario confirmó que funciona tras recargar la extensión; medición prolongada de CPU/memoria pendiente. |
| Ajuste manual de sincronía, avance | 29-09-2026 | `desktop/preferences.js`, `desktop/renderer.js`, `desktop/index.html` y pruebas de preferencias/renderizado; ajuste local por pista entre −10 s y +10 s. Prueba con reproducción real pendiente. |
| Selección sincronizada cercana | 29-09-2026 | `desktop/lyrics-provider.js` y `test/lyrics-provider.test.js`; una versión con tiempos y metadatos próximos puede superar una entrada exacta sin tiempos. El caso «El Jardín Prohibido» queda cubierto con candidatos de distinto álbum; comprobación en reproducción real pendiente. |
| Atajos de sincronía, avance | 29-09-2026 | `desktop/index.html`, `desktop/renderer.js`, `desktop/styles.css` y `test/renderer-updates.test.js`; ↑/↓ aplican ±0,5 s, aviso de 500 ms e indicador en modo compacto. Prueba manual pendiente. |
| Foco de atajos de sincronía, corrección | 29-09-2026 | `desktop/main.js` creaba la ventana con `focusable: false`, por lo que no podía recibir ↑/↓. Se habilitó el foco y se fijó `skipTaskbar: true` para conservar la ventana fuera de la barra de tareas; se reservan las flechas solo para deslizadores enfocados. `test/renderer-updates.test.js` cubre teclas tras usar botones. Validación manual pendiente. |
| Atajo de reintento, avance | 29-09-2026 | `desktop/main.js` registra Ctrl+Alt+X y muestra la combinación en la bandeja si está disponible; `desktop/diagnostics.js` registra fallos de disponibilidad. Prueba manual pendiente. |
| Crédito de banda en «Rebelión» | 29-09-2026 | LRCLIB registraba la frase observada cerca de 2:27 bajo «Joe Arroyo» y cerca de 1:10 bajo «Joe Arroyo y La Verdad» en «Musa Original». `desktop/lyrics-provider.js` consulta primero el crédito completo y `test/lyrics-provider.test.js` cubre la regresión. Comprobación en reproducción real pendiente. |
