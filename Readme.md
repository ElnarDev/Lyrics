# Lyrics

Lyrics muestra letras sincronizadas en una ventana flotante de Windows mientras se reproduce música en YouTube Music. El objetivo es ayudar a aprender canciones y practicar pronunciación sin cambiar de aplicación.

## Estado actual

Este repositorio contiene un prototipo funcional. Incluye una aplicación de escritorio Electron con una ventana siempre visible y una extensión de Chrome que detecta la pista, el estado y el tiempo de reproducción de YouTube Music. La aplicación consulta LRCLIB para obtener letras sincronizadas y muestra un estado de espera cuando todavía no detecta una canción.

No hay cuentas ni inicio de sesión en el MVP. La extensión y la aplicación se comunican únicamente en el equipo local mediante `localhost`.

## Experiencia objetivo

- Reproducir una canción en YouTube Music.
- La extensión envía título, artista, álbum y duración cuando están disponibles, además del estado y la posición actual, a la aplicación.
- La ventana de Lyrics permanece por encima de las demás, puede arrastrarse y permite ajustar opacidad y tamaño de letra.
- La línea actual se resalta y el resto de la letra se desplaza verticalmente de forma suave.
- Si LRCLIB solo dispone de una letra sin tiempos, Lyrics no la muestra como sustituto manual: indica que no hay una versión sincronizada disponible. Si no hay letra, muestra un estado distinto.

## Arquitectura

```text
YouTube Music en Chrome
       |
       v
Extensión Chrome (content script) -- WebSocket local --> App Electron
                                                        |
                                                        v
                                                Ventana flotante Windows
```

La extensión no intenta crear una ventana del sistema: Chrome no puede ofrecer una superposición consistente sobre otras aplicaciones. Electron es responsable de la ventana transparente, sin marco, movible y siempre encima.

## Estructura

- `desktop/`: aplicación Electron, servidor WebSocket local y UI de letras.
- `extension/`: extensión Manifest V3 para `music.youtube.com`.
- `shared/demo-lyrics.js`: letra ficticia de demostración conservada para desarrollo; no se carga en la aplicación.

## Ejecutar el prototipo

Requisitos: Node.js 22.12 o superior y Google Chrome.

```powershell
npm install
npm start
```

Luego, en Chrome:

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Elige **Cargar descomprimida** y selecciona la carpeta `extension`.
4. En la bandeja de Windows, abre el menú del icono de Lyrics y elige **Copiar clave de vinculación**.
5. Haz clic en el icono de la extensión Lyrics en Chrome, pega la clave y pulsa **Guardar clave**. La clave se guarda localmente en el perfil de Chrome; no se envía por Internet.
6. Abre o recarga [YouTube Music](https://music.youtube.com) y reproduce una canción.

Si ya tenías la extensión cargada antes de añadir la vinculación, pulsa **Actualizar** en `chrome://extensions` una vez. Después de cambiar el código del puente, cierra Lyrics normalmente desde **Salir** en la bandeja, vuelve a abrirla y actualiza la extensión; luego recarga YouTube Music. El popup avisa si la app o la extensión usan protocolos incompatibles. Si cambia el perfil de Chrome o se borran sus datos locales, repite los pasos 4 y 5.

La aplicación actualizará el encabezado y las letras con la pista detectada. Arrastra la cabecera para moverla, usa los controles inferiores para ajustar la opacidad de la ventana, la opacidad de las letras y su tamaño, o pulsa `×` para ocultarla sin cerrar el proceso. Esos ajustes, la posición, las dimensiones y el modo compacto se guardan localmente y se restauran al volver a abrir Lyrics. Si una pantalla deja de estar disponible, Lyrics recupera la ventana dentro de un área visible. Un clic izquierdo en el icono de Lyrics de la bandeja alterna entre ocultar y mostrar la misma ventana, sin perder su modo normal o compacto. **Mostrar Lyrics** en el menú siempre la abre; **Salir** cierra la aplicación por completo.

Pulsa **Ctrl+Alt+C** desde cualquier aplicación para activar o desactivar el modo compacto. Este modo oculta la cabecera y los controles, muestra la línea actual y la siguiente sobre un fondo oscuro redondeado, y conserva los tres ajustes del modo normal: opacidad de la ventana, opacidad de las letras y tamaño de fuente. Puedes arrastrarlo desde el texto de las letras. Al salir se recupera el tamaño normal sin perder la nueva posición; si quedaría fuera de la pantalla, se ajusta al borde visible. El mismo cambio de modo está disponible en el menú del icono de la bandeja si otra aplicación ocupa el atajo.

## Decisiones del MVP

- **Vinculación local:** un token aleatorio por instalación autentica los mensajes de la extensión. La app lo conserva en su directorio de datos y Chrome lo guarda en el almacenamiento local de la extensión. Nunca se incluye en consultas a LRCLIB.
- **Sincronía local:** la extensión obtiene la posición directamente del reproductor; la app no necesita credenciales de Google.
- **Proveedor de letras:** se consulta LRCLIB primero con el título recibido y después sin el sufijo de artista invitado cuando corresponda. Para subtítulos no descriptivos de versión (por ejemplo, un nombre de película), se intenta también el título corto, pero solo con álbum y duración compatibles. No se recortan marcas como «Live», «Remix» o «Acoustic». Si varias letras sincronizadas siguen siendo indistinguibles, no se elige una al azar; las letras sin tiempos no se muestran. Antes de distribuir Lyrics habrá que revisar los términos y derechos de las letras.
- **Ajuste manual pendiente:** se añadirá un desplazamiento por canción y persistencia de preferencias locales.

## Próximas fases

El plan de preparación para publicación, con prioridades y criterios para marcar cada trabajo como listo, está en [TODO.md](TODO.md).

El recorrido actual de datos está en [docs/DATA_FLOW.md](docs/DATA_FLOW.md). La revisión de derechos de letras sigue abierta en [docs/LYRICS_RIGHTS.md](docs/LYRICS_RIGHTS.md), y existe un [borrador de privacidad](docs/PRIVACY_DRAFT.md) para completar antes de distribuir la aplicación.

1. Verificar las condiciones de uso de las letras para distribución.
2. Verificar con varias canciones reales la selección por álbum y duración; recargar la extensión de Chrome para enviar los nuevos metadatos.
3. Persistir preferencias como tamaño, opacidad y modo de visualización.
4. Empaquetar e instalar la aplicación y publicar la extensión.

## Nota legal

Las letras están protegidas por derechos de autor. Antes de distribuir Lyrics se debe verificar la autorización y condiciones de LRCLIB y evitar almacenar o redistribuir letras sin permiso. Las letras de demostración incluidas en el repositorio son ficticias.
