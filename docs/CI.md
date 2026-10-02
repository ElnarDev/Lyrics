# Integración continua

Durante la migración, `npm test` ejecuta primero `npm run build` y después solo `test/*.test.js`. Esto genera `build/desktop` y `build/extension`, comprueba sus recursos con `test/build-output.test.js` y las fronteras entre módulos TypeScript con `test/architecture-boundaries.test.js`, sin recoger pruebas de copias aisladas en `out/`. El instalador también ejecuta el build antes de empaquetar.

El flujo `.github/workflows/ci.yml` se ejecuta al subir cambios, al abrir o actualizar una solicitud de cambios y manualmente desde GitHub Actions. Comprueba Windows con Node.js 22 y 24.

Cada ejecución instala exactamente las dependencias del archivo de bloqueo (`npm ci`) y ejecuta `npm run verify`: tipos de shared, Node/Electron, renderer y extensión → build y sintaxis → pruebas. Este comando construye una sola vez. `pack:win` e `installer:win` exigen la misma verificación antes de llamar a electron-builder. La variante Node 24 hace además una auditoría de dependencias que falla a partir de avisos moderados. El flujo solo necesita permiso de lectura del repositorio y cancela ejecuciones anteriores de la misma rama para no gastar recursos innecesariamente.

`--ignore-scripts` evita descargar y ejecutar el binario de Electron durante estas pruebas puramente de código. Por ello, un resultado verde no demuestra que el instalador o la interfaz gráfica funcionen: esas verificaciones aún requieren un flujo de empaquetado y pruebas de aplicación en Windows.

El trabajo `installer` usa Node 24 y `npm ci` para construir un NSIS local. Comprueba que exista el ejecutable y muestra su SHA-256. No lo sube como artefacto ni lo publica mientras sigan abiertos los P0. El procedimiento y las pruebas manuales están en `docs/INSTALLER.md`.

Antes de marcar el punto completo en `TODO.md`, comprobar una ejecución real en GitHub y probar instalación, actualización y desinstalación en una máquina sin Node.js. No publicar artefactos mientras sigan pendientes los derechos de las letras y la política de privacidad.
