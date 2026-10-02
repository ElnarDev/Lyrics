# Instalador Windows

Desde la migración estructural, `npm run build` genera `build/desktop` y `build/extension`. `npm run installer:win` y `npm run pack:win` ejecutan primero `npm run verify` (tipos, build, sintaxis y pruebas); un fallo impide empaquetar. El instalador incluye únicamente la salida de escritorio, el icono y `ws`; la extensión se carga por separado desde `build/extension`.

El proyecto genera un instalador NSIS de 64 bits en `dist/Lyrics-Setup-<versión>-x64.exe`. La configuración está en `package.json` y la dependencia `electron-builder` está fijada en `package-lock.json`. El paquete incluye solo el escritorio, el icono y las dependencias de producción; la extensión de Chrome se instala por separado.

## Construcción local

Para la prueba con Chrome, abre `chrome://extensions`, activa el modo de desarrollador, pulsa **Cargar descomprimida** y selecciona `C:\2026\Lyrics\build\extension`. La carpeta `extension/` contiene recursos fuente y no incluye `content.js` ni `popup.js`; seleccionarla produce el error «Could not load javascript 'content.js'». Si falta la carpeta generada, ejecuta `npm run build`. Después vincula el popup con la clave de la bandeja y recarga YouTube Music.

En Windows, con Node.js 24 y npm disponibles:

```powershell
npm ci
npm run installer:win
Get-FileHash -LiteralPath "dist/Lyrics-Setup-0.1.0-x64.exe" -Algorithm SHA256
Get-AuthenticodeSignature -LiteralPath "dist/Lyrics-Setup-0.1.0-x64.exe"
```

`npm run pack:win` crea únicamente el directorio `dist/win-unpacked` para revisar el contenido sin instalar. El nombre del instalador usa la versión de `package.json`; cambia el ejemplo de hash al subirla. Los archivos `dist/` quedan fuera de Git.

## Estado de validación

El 28-09-2026 se construyó localmente `Lyrics-Setup-0.1.0-x64.exe` (112414307 bytes). SHA-256: `532D767EC9BAF4F93555E2DA4DBE9AF48AE51A21CEDF92DD9AF1494AF2293609`. El archivo contiene `desktop/`, `assets/tray-icon.png` y `ws`; no incluye la extensión. La firma Authenticode es `NotSigned`.

Se repitió la construcción tras `npm ci` en una copia limpia del proyecto: pasaron sintaxis, 56 pruebas y `npm audit --audit-level=moderate` sin vulnerabilidades. El `app.asar` resultó idéntico byte a byte entre ambas construcciones; el `.exe` del instalador tuvo un hash diferente. Por eso el SHA-256 publicado debe calcularse sobre el archivo final de cada entrega.

Quedan por comprobar en un equipo de prueba sin Node.js:

1. Instalar y abrir Lyrics; revisar icono, bandeja, ventana y conexión con la extensión.
2. Instalar una versión posterior sobre la anterior; confirmar preferencias y clave de vinculación conservadas.
3. Desinstalar y comprobar accesos directos y archivos residuales. Decidir explícitamente el tratamiento de preferencias y clave local.

La compilación no implica autorización para distribuir letras ni sustituye la decisión de firma y procedencia del instalador. No subir ni publicar este ejecutable mientras sigan abiertos los P0.
