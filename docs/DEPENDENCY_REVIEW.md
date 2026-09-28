# Revisión de dependencias

Fecha: 27-09-2026. Versión de Lyrics: 0.1.0.

## Resultado

- Electron se actualizó de 35.7.5 a 44.4.5, una versión estable dentro de las tres líneas principales que Electron mantiene con soporte. La versión anterior ya estaba fuera de ese intervalo.
- `ws` permanece en 8.21.3, la versión resuelta por el archivo de bloqueo. No se cambió su rango de compatibilidad en `package.json`.
- `npm audit --offline=false --json` informó 0 vulnerabilidades conocidas entre 14 dependencias. Esto no garantiza la ausencia de fallos no publicados.
- `npm run check` terminó correctamente y `npm test` pasó 30 de 30 pruebas.
- Lyrics arrancó en Windows con Electron 44.4.5 y se comprobó visualmente la ventana flotante, sin una franja de título visible en el arranque. No se ha completado todavía una regresión manual de todos los comportamientos de Windows y Chrome.
- No se aceptaron excepciones de vulnerabilidad en esta revisión.

## Antes de cada entrega

Ejecutar de nuevo `npm audit --offline=false`, revisar las versiones con soporte de Electron y `ws`, y repetir la suite y la prueba visual de la ventana. Si aparece una alerta, registrar su alcance, solución o excepción temporal antes de publicar.
