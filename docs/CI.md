# Integración continua

El flujo `.github/workflows/ci.yml` se ejecuta al subir cambios, al abrir o actualizar una solicitud de cambios y manualmente desde GitHub Actions. Comprueba Windows con Node.js 22 y 24.

Cada ejecución instala exactamente las dependencias del archivo de bloqueo (`npm ci`), revisa la sintaxis (`npm run check`) y ejecuta las pruebas (`npm test`). La variante Node 24 hace además una auditoría de dependencias que falla a partir de avisos moderados. El flujo solo necesita permiso de lectura del repositorio y cancela ejecuciones anteriores de la misma rama para no gastar recursos innecesariamente.

`--ignore-scripts` evita descargar y ejecutar el binario de Electron durante estas pruebas puramente de código. Por ello, un resultado verde no demuestra que el instalador o la interfaz gráfica funcionen: esas verificaciones aún requieren un flujo de empaquetado y pruebas de aplicación en Windows.

Antes de marcar el punto completo en `TODO.md`, comprobar una ejecución real en GitHub y añadir el artefacto instalable reproducible con su verificación de integridad. No publicar artefactos mientras sigan pendientes los derechos de las letras y la política de privacidad.
