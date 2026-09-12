# Lyrics

Lyrics muestra letras sincronizadas en una ventana flotante de Windows mientras se reproduce música en YouTube Music. El objetivo es ayudar a aprender canciones y practicar pronunciación sin cambiar de aplicación.

## Estado actual

Este repositorio contiene el primer prototipo vertical. Incluye una aplicación de escritorio Electron con una ventana siempre visible y una extensión de Chrome que detecta la pista, el estado y el tiempo de reproducción de YouTube Music. La aplicación incorpora letras de demostración sincronizadas para validar la experiencia visual antes de conectar un proveedor real de letras.

No hay cuentas ni inicio de sesión en el MVP. La extensión y la aplicación se comunican únicamente en el equipo local mediante `localhost`.

## Experiencia objetivo

- Reproducir una canción en YouTube Music.
- La extensión envía título, artista, estado y posición actual a la aplicación.
- La ventana de Lyrics permanece por encima de las demás, puede arrastrarse y permite ajustar opacidad y tamaño de letra.
- La línea actual se resalta y el resto de la letra se desplaza verticalmente de forma suave.
- Si no hay letra sincronizada, se mostrará un estado claro; en una fase posterior se podrá corregir manualmente el desfase.

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
- `shared/demo-lyrics.js`: letra sincronizada de demostración, sin contenido de canciones con copyright.

## Ejecutar el prototipo

Requisitos: Node.js 20 o superior y Google Chrome.

```powershell
npm install
npm start
```

Luego, en Chrome:

1. Abre `chrome://extensions`.
2. Activa **Modo de desarrollador**.
3. Elige **Cargar descomprimida** y selecciona la carpeta `extension`.
4. Abre [YouTube Music](https://music.youtube.com) y reproduce una canción.

La aplicación se abrirá con letras de demostración y actualizará el encabezado con la pista detectada. Puedes arrastrar la barra superior, usar `−` y `+` para cambiar el tamaño, el control deslizante para la opacidad y `×` para ocultar la ventana. Vuelve a mostrarla desde el icono de Lyrics en la bandeja del sistema.

## Decisiones del MVP

- **Sin autenticación:** reduce fricción y evita almacenar datos personales antes de que sea necesario.
- **Sincronía local:** la extensión obtiene la posición directamente del reproductor; la app no necesita credenciales de Google.
- **Proveedor de letras desacoplado:** `demo-lyrics.js` representa el contrato que más adelante podrá cubrir un proveedor autorizado o letras aportadas por el usuario.
- **Ajuste manual pendiente:** se añadirá un desplazamiento por canción y persistencia de preferencias locales.

## Próximas fases

1. Integrar un proveedor de letras con licencia y condiciones de uso compatibles.
2. Resolver la canción usando título, artista, álbum y duración, y manejar resultados ambiguos.
3. Añadir ajuste manual de sincronía, caché local y preferencias persistentes.
4. Implementar controles de reproducción y accesibilidad con teclado.
5. Empaquetar e instalar la aplicación y publicar la extensión.

## Nota legal

Las letras están protegidas por derechos de autor. Antes de distribuir Lyrics se debe usar una fuente autorizada, respetar sus términos y evitar almacenar o redistribuir letras sin permiso. El prototipo solo incluye texto ficticio de demostración.
