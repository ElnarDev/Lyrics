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

- `src/desktop/`: proceso Electron, puente WebSocket, proveedor de letras y renderer en TypeScript.
- `src/extension/`: script de contenido y popup de Chrome en TypeScript.
- `src/shared/`: contratos compartidos entre escritorio y extensión.
- `desktop/` y `extension/`: HTML, CSS, manifiesto e iconos que el build copia a la salida.
- `build/desktop` y `build/extension`: salidas generadas por `npm run build`; no se guardan en Git.
- `shared/demo-lyrics.js`: letra ficticia de demostración conservada para desarrollo; no se carga en la aplicación.

## Ejecutar el prototipo

Para verificar el proyecto antes de empaquetar, ejecuta `npm run verify`: comprueba tipos, construye y ejecuta todas las pruebas. `npm run pack:win` y `npm run installer:win` ejecutan esa verificación automáticamente antes de generar su salida.

Requisitos: Node.js 22.12 o superior y Google Chrome.

```powershell
npm install
npm start
```

Luego, en Chrome:

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Elige **Cargar descomprimida** y selecciona la carpeta `build/extension` (generada por `npm start` o `npm run build`).
4. En la bandeja de Windows, abre el menú del icono de Lyrics y elige **Copiar clave de vinculación**.
5. Haz clic en el icono de la extensión Lyrics en Chrome, pega la clave y pulsa **Guardar clave**. La clave se guarda localmente en el perfil de Chrome; no se envía por Internet.
6. Abre o recarga [YouTube Music](https://music.youtube.com) y reproduce una canción.

Si ya tenías la extensión cargada antes de añadir la vinculación, pulsa **Actualizar** en `chrome://extensions` una vez. Después de cambiar el código del puente, cierra Lyrics normalmente desde **Salir** en la bandeja, vuelve a abrirla y actualiza la extensión; luego recarga YouTube Music. El popup avisa si la app o la extensión usan protocolos incompatibles. Si cambia el perfil de Chrome o se borran sus datos locales, repite los pasos 4 y 5.

La aplicación actualizará el encabezado y las letras con la pista detectada. Arrastra la cabecera para moverla, usa los controles inferiores para ajustar la opacidad de la ventana, la opacidad de las letras y su tamaño, o pulsa `×` para ocultarla sin cerrar el proceso. Esos ajustes, la posición, las dimensiones y el modo compacto se guardan localmente y se restauran al volver a abrir Lyrics. Si una pantalla deja de estar disponible, Lyrics recupera la ventana dentro de un área visible. Un clic izquierdo en el icono de Lyrics de la bandeja alterna entre ocultar y mostrar la misma ventana, sin perder su modo normal o compacto. **Mostrar Lyrics** en el menú siempre la abre; **Salir** cierra la aplicación por completo.

Pulsa **Ctrl+Alt+C** desde cualquier aplicación para activar o desactivar el modo compacto. Este modo oculta la cabecera y los controles, muestra la línea actual y la siguiente sobre un fondo oscuro redondeado, y conserva los tres ajustes del modo normal: opacidad de la ventana, opacidad de las letras y tamaño de fuente. Puedes arrastrarlo desde el texto de las letras. Al salir se recupera el tamaño normal sin perder la nueva posición; si quedaría fuera de la pantalla, se ajusta al borde visible. El mismo cambio de modo está disponible en el menú del icono de la bandeja si otra aplicación ocupa el atajo.
Pulsa **Ctrl+Alt+X** desde cualquier aplicación para reintentar la búsqueda de letras de la pista actual. También puedes usar **Reintentar letras** en la bandeja. El menú muestra el atajo solo si pudo registrarse.
También puedes salir del modo compacto con doble clic sobre el texto de las letras. Si otra aplicación ocupa Ctrl+Alt+C, el menú de la bandeja sigue permitiendo cambiar de modo y deja de mostrar el atajo como disponible.
Si una letra sincronizada aparece adelantada o atrasada, usa los botones **−** y **+** de la ventana normal para moverla en pasos de 0,5 segundos. **+** adelanta la letra y **−** la atrasa; el botón central restablece el ajuste a 0 s. Se guarda localmente para esa pista y también se aplica en modo compacto.
Con la ventana de Lyrics enfocada, **↑** adelanta y **↓** atrasa las letras 0,5 segundos. Un aviso muestra el cambio durante medio segundo; en modo compacto, la esquina inferior derecha muestra el desfase actual. Si un deslizador tiene el foco, las flechas siguen controlando ese deslizador.
Si la ventana o las letras quedan demasiado transparentes, elige **Restablecer apariencia** en la bandeja. Lyrics recupera las opacidades y el tamaño de letra iniciales y guarda esos valores para el próximo inicio.

Para reportar un fallo, abre el menú del icono de Lyrics en la bandeja. Allí figura la versión instalada y **Copiar diagnóstico** prepara un informe para pegar en el canal de soporte cuando esté disponible. El informe contiene solo versión, plataforma, fechas y códigos de hasta 50 eventos recientes de la sesión; no incluye nombres de canciones, letras ni la clave de vinculación. Revísalo antes de compartirlo.

## Build y actualización de la app y la extensión

Los comandos se ejecutan desde la raíz del proyecto. El build genera conjuntamente el escritorio en `build/desktop` y la extensión en `build/extension`, pero aplicar esos archivos a Electron, Chrome o una instalación existente requiere pasos distintos.

| Comando | Resultado | Cómo usar los cambios |
| --- | --- | --- |
| `npm run start` (o `npm start`) | Compila app y extensión, y abre Electron desde la salida local. | Electron arranca con esos cambios; recarga la extensión en Chrome y después YouTube Music. |
| `npm run build` | Regenera `build/desktop` y `build/extension`. | Reinicia la app de desarrollo y recarga la extensión; no genera un instalador ni actualiza la app instalada. |
| `npm run verify` | Comprueba tipos, ejecuta el build, revisa sintaxis y ejecuta las pruebas. | Verifica las salidas generadas; no abre Electron ni crea un instalador. |
| `npm run pack:win` | Ejecuta `verify` y empaqueta el escritorio en `dist/win-unpacked`. | Abre `dist/win-unpacked/Lyrics.exe` para probar el paquete sin instalarlo. |
| `npm run installer:win` | Ejecuta `verify` y genera `dist/Lyrics-Setup-<versión>-x64.exe`. | Ejecuta el nuevo instalador para actualizar la app instalada; recarga la extensión por separado. |

Si falla la verificación, los comandos de empaquetado no continúan. Un instalador anterior puede seguir existiendo en `dist`: comprueba que el comando haya terminado correctamente antes de usarlo.

### Aplicar cambios durante el desarrollo

`npm run start` compila **una sola vez al arrancar**. No hay vigilancia de archivos ni recarga automática: editar el código mientras Electron está abierto no aplica los cambios al proceso que ya está ejecutándose.

1. Cierra Lyrics desde **Salir** en la bandeja; `×` solo oculta la ventana. Si estabas usando la app instalada, ciérrala también antes de probar la de desarrollo.
2. Ejecuta `npm run start` para reconstruir ambos componentes y abrir la app local.
3. En `chrome://extensions`, pulsa el botón de recarga de Lyrics. La extensión debe estar cargada desde `C:\2026\Lyrics\build\extension`; si cargaste otra carpeta, selecciona esta mediante **Cargar descomprimida**.
4. Recarga la pestaña de YouTube Music para que utilice el nuevo script de contenido.
5. Comprueba la conexión en el popup de la extensión y reproduce una canción para verificar el comportamiento modificado.

La carpeta `extension/` contiene recursos fuente; Chrome debe cargar `build/extension`. Regenerar esa carpeta no recarga automáticamente la extensión que Chrome ya tiene en memoria.

### Generar e instalar los últimos cambios

No necesitas ejecutar `npm run build` antes de `npm run installer:win`: este último ya lo ejecuta mediante `verify` y reconstruye tanto el escritorio como la extensión.

```powershell
npm run installer:win
```

El instalador **incluye únicamente la app de escritorio**. La extensión se utiliza por separado desde `build/extension`; instalar el nuevo `.exe` no la instala ni la actualiza en Chrome.

1. Confirma que `npm run installer:win` haya terminado correctamente.
2. Cierra Lyrics desde **Salir** en la bandeja y ejecuta el instalador recién generado en `dist`.
3. Abre la app instalada desde el menú Inicio para probar esa instalación. `npm run start` abre la copia de desarrollo del repositorio.
4. Recarga Lyrics en `chrome://extensions` y después la pestaña de YouTube Music.
5. Comprueba las versiones y la conexión entre ambos componentes.

`npm run build` y `npm run start` no modifican un instalador anterior ni la app ya instalada. Cada instalador contiene los archivos empaquetados cuando se generó. Para más detalles de empaquetado y validación manual, consulta [docs/INSTALLER.md](docs/INSTALLER.md).

### Comprobar versiones y saber si corresponden a los últimos cambios

| Componente | Fuente de la versión | Dónde comprobarla |
| --- | --- | --- |
| App de escritorio | Campo `version` de `package.json`. | Menú del icono de Lyrics en la bandeja; muestra la versión del proceso abierto. |
| Instalador | Usa la versión de `package.json`. | Nombre `Lyrics-Setup-<versión>-x64.exe`. |
| Extensión | Campo `version` de `extension/manifest.json`, copiado a `build/extension/manifest.json` durante el build. | Detalles de Lyrics en `chrome://extensions`, después de recargarla. |

Actualmente ambas fuentes declaran `0.1.0` y se mantienen **manualmente**. Para una entrega con la misma versión en ambos componentes, actualiza `package.json` y `extension/manifest.json` antes de construir. Si usas `npm version` para actualizar el paquete y su archivo de bloqueo, recuerda que ese comando no actualiza el manifiesto de la extensión.

**Que las versiones coincidan no demuestra que ambos tengan los últimos cambios.** Se puede reconstruir varias veces sin cambiar `0.1.0`, conservando el mismo nombre de instalador. La comprobación práctica actual consiste en generar ambos desde el mismo estado del proyecto, instalar el nuevo ejecutable, recargar la extensión desde la salida correcta y probar el comportamiento esperado.

El popup detecta incompatibilidades del **protocolo de comunicación** y avisa qué componente necesita actualizarse. Una conexión compatible no certifica que ambos procedan de la misma compilación. Todavía no existe una fuente única de versión ni un identificador de build compartido que permita comprobarlo exactamente.

## Decisiones del MVP

- **Vinculación local:** un token aleatorio por instalación autentica los mensajes de la extensión. La app lo conserva en su directorio de datos y Chrome lo guarda en el almacenamiento local de la extensión. Nunca se incluye en consultas a LRCLIB.
- **Sincronía local:** la extensión obtiene la posición directamente del reproductor; la app no necesita credenciales de Google.
- **Proveedor de letras:** se consulta LRCLIB primero con el título recibido y después sin el sufijo de artista invitado cuando corresponda. Para subtítulos no descriptivos de versión (por ejemplo, un nombre de película), se intenta también el título corto, pero solo con álbum y duración compatibles. No se recortan marcas como «Live», «Remix» o «Acoustic». Si varias letras sincronizadas siguen siendo indistinguibles, no se elige una al azar; las letras sin tiempos no se muestran. Antes de distribuir Lyrics habrá que revisar los términos y derechos de las letras.
- **Ajuste manual:** el desplazamiento por canción y las preferencias visuales se guardan localmente.

## Próximas fases

El plan de preparación para publicación, con prioridades y criterios para marcar cada trabajo como listo, está en [TODO.md](TODO.md).

El recorrido actual de datos está en [docs/DATA_FLOW.md](docs/DATA_FLOW.md). La revisión de derechos de letras sigue abierta en [docs/LYRICS_RIGHTS.md](docs/LYRICS_RIGHTS.md), y existe un [borrador de privacidad](docs/PRIVACY_DRAFT.md) para completar antes de distribuir la aplicación.

1. Verificar las condiciones de uso de las letras para distribución.
2. Verificar con varias canciones reales la selección por álbum y duración; recargar la extensión de Chrome para enviar los nuevos metadatos.
3. Completar la verificación estructural de TypeScript y, después, probar los recorridos reales de reproducción y ajustes.
4. Empaquetar e instalar la aplicación y publicar la extensión.

## Nota legal

Las letras están protegidas por derechos de autor. Antes de distribuir Lyrics se debe verificar la autorización y condiciones de LRCLIB y evitar almacenar o redistribuir letras sin permiso. Las letras de demostración incluidas en el repositorio son ficticias.
