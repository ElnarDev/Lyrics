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

- [x] **Resolver la pista con más metadatos.** La extensión envía álbum y duración cuando YouTube Music los proporciona; la búsqueda contrasta título, artista, álbum y duración, descarta versiones con duración incompatible y evita elegir entre resultados de igual calidad pero letras distintas. Cubierto por `test/lyrics-provider.test.js`; falta prueba manual con la extensión recargada antes de la beta.
- [x] **Definir la selección entre varias pestañas.** Una sola pestaña controla la ventana; una pestaña pausada no desplaza a una que reproduce, una nueva reproducción toma el control y al cerrar o pausar la pestaña activa se recupera otra fuente disponible. Cubierto por `test/player-sources.test.js`; queda una prueba manual con dos pestañas reales antes de la beta.
- [x] **Recuperar la conexión sin perder el estado actual.** Al reconectar, la extensión reenvía de inmediato la pista y posición aunque la canción esté pausada o los datos sean idénticos al último mensaje. Cubierto por `test/extension-reconnect.test.js`.
- [x] **Manejar fallos del proveedor.** Se muestran estados distintos de espera, carga, ausencia de letras, falta de conexión, tiempo agotado y respuesta inválida. El menú de bandeja permite reintentar sin conservar un resultado tardío anterior. Cubierto por `test/lyrics-errors.test.js`; queda una prueba manual de desconexión antes de la beta.

## P1 — Calidad necesaria para una primera versión pública

### Instalación, actualización y publicación

- [ ] **Crear un instalador de Windows.** Incluir nombre, iconos y desinstalación; comprobar instalación limpia y actualización sobre una versión anterior en una máquina sin Node.js.
- [ ] **Definir firma y procedencia del instalador.** Elegir el método de firma y publicar descargas verificables desde un canal oficial. Probar el recorrido de descarga e instalación.
- [ ] **Preparar la extensión para Chrome Web Store.** Añadir iconos y material de la ficha, declarar el propósito único y los datos utilizados, proporcionar instrucciones para instalar también la aplicación y pasar la revisión de la tienda.
- [ ] **Sincronizar versiones y compatibilidad.** App y extensión deben detectar una contraparte incompatible y mostrar una indicación clara para actualizarla.
- [ ] **Definir actualizaciones y reversión.** Las correcciones deben llegar sin pedir al usuario que repita la instalación manual; probar una actualización fallida y la recuperación.

### Comportamiento de uso diario

- [ ] **Guardar preferencias locales.** Restaurar posición, dimensiones, opacidades, tamaño de letra y modo compacto al reiniciar. Si cambia la configuración de monitores, recuperar una ventana que haya quedado fuera de pantalla.
- [ ] **Optimizar la extensión.** Reducir el sondeo frecuente y la observación de todo el documento; medir CPU y memoria durante una sesión larga sin perder cambios de canción.
- [x] **Controlar la caché de letras.** Máximo 200 canciones con expulsión LRU; resultados sincronizados durante una hora, ausencias durante cinco minutos y coincidencias ambiguas durante dos. Las consultas simultáneas se comparten y los errores temporales no se guardan. Evidencia: `desktop/lyrics-cache.js` y `test/lyrics-cache.test.js`.
- [ ] **Revisar accesibilidad y control.** Atajos documentados, alternativa si Ctrl+Alt+C está ocupado, controles legibles, contraste suficiente y salida fácil del modo compacto.
- [ ] **Probar superposición y geometría en Windows.** Validar ventana normal y compacta, transparencia, arrastre, redimensionado y prioridad sobre otras ventanas en varios monitores, escalas de pantalla y tras Alt+Tab o suspensión.

### Pruebas y mantenimiento

- [ ] **Añadir pruebas automatizadas del comportamiento crítico.** Cubrir parseo de letras, selección de coincidencias, cambio rápido de pista, respuestas tardías, reconexión y estados de error. El chequeo actual solo valida sintaxis.
- [ ] **Crear un flujo de integración continua.** Ejecutar validación y pruebas en cada cambio; generar artefactos de versión de forma reproducible y registrar el resultado.
- [ ] **Separar responsabilidades del código.** Mantener módulos claros para puente local, detección de pista, proveedor/caché, estado de reproducción y ventana. Documentar el contrato de mensajes entre extensión y app.
- [ ] **Preparar soporte y diagnóstico con privacidad.** Registrar errores útiles sin guardar letras ni hábitos de escucha innecesariamente; ofrecer al usuario una manera de reportar incidencias y conocer la versión instalada.

## P2 — Mejoras posteriores al lanzamiento

- [ ] Ajuste manual de sincronía por canción cuando una letra exista pero esté desplazada.
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
