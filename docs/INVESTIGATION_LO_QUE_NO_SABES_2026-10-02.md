# Investigación: «Lo Que No Sabes Tú»

Fecha: 02-10-2026. La investigación inicial fue de solo lectura. El ajuste posterior está implementado; su evidencia y prueba manual pendiente se registran a continuación. Las secciones posteriores conservan el diagnóstico inicial.

## Ajuste implementado y listo para prueba manual

`lyrics-matcher.ts` conserva el nombre compuesto con `&` en el artista principal y valida sus componentes completos: una consulta amplia por `Chino` no convierte a `Chino` solo en equivalente al dúo. Compara nombres completos de los créditos, normalizando separadores y acentos. Recupera invitados del título antes de eliminar ese sufijo para buscar. Para candidatos con el mismo álbum y duración a ±2 segundos, suma 3 puntos por cada artista esperado presente, cuando hay varios artistas esperados. Se conserva el límite de duración de descarte de 3 segundos y el rechazo de empates con contenido distinto. No se añadió una excepción específica para esta canción.

`lyrics-provider.ts` no devuelve anticipadamente un resultado exacto con crédito incompleto cuando se conocen álbum y duración. Busca primero el crédito completo, luego el nombre principal conservado y, si hace falta, una consulta más amplia para nombres unidos por `&`. Los HTTP 5xx de consultas exactas o búsquedas por artista permiten continuar las alternativas; los fallos de red/timeout y respuestas malformadas no se silencian. Si no queda un resultado utilizable, se conserva el error del proveedor.

Verificación automatizada: cuatro configuraciones TypeScript estrictas, build, sintaxis de las seis entradas y **111/111 pruebas**. Ejecutada directamente con Node 24.21.0 de Electron, debido a que esta terminal no encuentra `npm`. Las nueve pruebas adicionales cubren identidad del dúo, invitados del título, orden/separadores de créditos, límites, empates, respuestas exactas incompletas y recuperación de HTTP 503. Las regresiones anteriores de «Rebelión», «El Jardín Prohibido» y «Dios Mío Hasta Que Me Enamoré» siguen pasando.

Verificación real del proveedor, con los mismos metadatos de la captura y el timeout de producción: `/api/get` devolvió HTTP 503 para una consulta del dúo; la búsqueda posterior devolvió 20 registros y el resultado final fue `synced`, 94 líneas. Se seleccionó **ID 38286620**, título `Lo Que No Sabes Tú (feat. El Potro Álvarez)`, artista `Chino, Nacho, Baroni`, mismo álbum y duración 234 s. Puntuación 25; el candidato 8450293 obtuvo 23 y el 28715334 obtuvo 19. La selección responde a los créditos y duración, no a un ID fijado. Hash abreviado del resultado parseado: `c2f860b528df8a00`.

Confirmación manual recibida el 02-10-2026: el usuario informó «Genial, solucionado» después de recibir el recorrido de prueba. Se registra como confirmación de resolución de este caso; no detalló resultados por minuto ni confirmó las otras canciones de regresión. No se regeneró el instalador.

### Cómo probar

1. Cierra todas las instancias de Lyrics mediante **Salir** en la bandeja y ejecuta `npm run start` desde `C:\2026\Lyrics`. Prueba esta copia de desarrollo, no el instalador anterior.
2. En `chrome://extensions`, recarga Lyrics cargada desde `C:\2026\Lyrics\build\extension`; después recarga YouTube Music.
3. Abre la misma grabación de la captura: título con El Potro Álvarez, álbum `Mi Niña Bonita (International Version)`, duración 3:54. Deja el ajuste de sincronía de Lyrics en **0 s** para evaluar los tiempos originales.
4. Reproduce desde el principio y compara el texto y los cambios de línea con lo que escuchas en la introducción y cerca de 0:30, 1:30 y 2:30. Prueba también pausa/reanudación y un salto a otro punto. Debe mostrar letras en lugar del aviso de ambigüedad. Si aparece un fallo temporal del proveedor, usa **Reintentar letras** en la bandeja.
5. Registra si el texto coincide, si falta algún fragmento y si los tiempos están adelantados/atrasados, indicando el minuto observado. Si el desfase cambia entre fragmentos, no lo consideres corregido por un único ajuste manual. Repite una comprobación breve de las otras canciones de regresión.

## Resultado

El resultado `ambiguous` se reprodujo dos veces con el proveedor compilado actual y respuestas reales de LRCLIB. Hay letras sincronizadas disponibles, pero dos candidatos empatan con puntuación 13 y contenido distinto. `chooseResult` devuelve `ambiguous`; `lyrics-session` lo convierte en el aviso mostrado por el overlay.

Lyrics no lee las letras del panel de YouTube Music: la extensión lee metadatos y tiempo del reproductor, y el escritorio consulta LRCLIB. Por eso la disponibilidad visible en YouTube no garantiza una selección única en nuestra fuente.

## Datos y alcance de la reproducción

Se reconstruyó la entrada a partir de la captura enviada por el usuario:

- Título: `Lo Que No Sabes Tú (con El Potro Álvarez)`.
- Artista/byline: `Chino & Nacho y Baroni · Mi Niña Bonita (International Version) · 2010`.
- Álbum: `Mi Niña Bonita (International Version)`.
- Duración: 234 segundos, a partir de 3:54 visible en la captura. La extensión redondea la duración del elemento multimedia.

No se capturó el mensaje WebSocket de la sesión del usuario ni se identificó el ejecutable que estaba abierto. Esta reproducción explica el aviso con los datos visibles y el código actual; no demuestra el contenido exacto que estaba en memoria en esa sesión. Tampoco identifica cuál de las letras de LRCLIB corresponde definitivamente al audio ni si las letras de YouTube tienen tiempos disponibles.

Las consultas `/api/get` con artista completo y luego `Chino`, con y sin crédito en el título, devolvieron 404. `/api/search` con artista completo devolvió cero resultados; con `Chino`, 20. La búsqueda adicional por título también devolvió 20. `findLyrics` terminó en `ambiguous`, sin líneas para mostrar.

## Candidatos que explican el empate

Todos estos registros tienen letras sincronizadas y el álbum `Mi Niña Bonita (International Version)`:

| ID de LRCLIB | Artista | Título | Duración | Puntuación | Líneas parseadas |
| --- | --- | --- | --- | --- | --- |
| 28715334 | Chino & Nacho | Lo Que No Sabes Tú | 234 s | 13 | 73 |
| 33612182 | Chino | Lo Que No Sabes Tú (feat. El Potro Álvarez) | 234 s | 13 | 94 |
| 8450293 | Chino & Nacho/Baroni/El Potro Alvarez | Lo Que No Sabes Tú | 232 s | 11 | 94 |

Los dos primeros difieren también después del parseo: SHA-256 abreviado `0f70c746364654cd` y `c2f860b528df8a00` respectivamente. No se trata solamente de diferencias de formato del LRC. No se guardaron letras completas en el informe ni en el log de investigación.

La puntuación de los dos primeros se descompone en 3 por sincronización, 1 por título, 4 por álbum y 5 por duración. Ninguno recibe el bono por artista completo. El tercer registro pierde 2 puntos por la diferencia de duración, aunque incluye más colaboradores en el crédito.

## Causa en el código

`src/desktop/lyrics/lyrics-matcher.ts`:

1. `primaryArtist` separa por `&` y `y`; para esta byline devuelve `Chino`, perdiendo el nombre del dúo y sus colaboradores.
2. `cleanTitle` elimina créditos `con`/`feat.`; ambos títulos quedan equivalentes.
3. `matchesTrack` acepta artistas que comiencen por `Chino`; ambos candidatos pasan.
4. `matchingScore` no distingue el crédito del dúo ni el invitado del título en este caso. Ambos candidatos obtienen 13.
5. `chooseResult` rechaza candidatos empatados con contenido distinto. Esta protección evita elegir arbitrariamente una letra que podría corresponder a otra grabación.

`src/extension/content/player-observer.ts` confirma que la extensión transmite metadatos, no las letras del panel. `src/desktop/lyrics/lyrics-provider.ts` consulta LRCLIB y `src/desktop/lyrics/lyrics-session.ts` convierte `ambiguous` en estado de la ventana.

## Corrección a evaluar

Conservar nombres de dúos como identidad completa y tratar los créditos de invitados como evidencia adicional de selección, aunque se retiren del título para ampliar la búsqueda. Deben cubrirse créditos equivalentes con distinto orden y separadores (`con`, `feat.`, `/`, `&`, `y`) sin aceptar artistas distintos ni versiones live/remix. Mantener el rechazo de empates reales y las comprobaciones de álbum/duración.

No basta elegir el primer registro o retirar la protección de ambigüedad. Antes de cambiar la regla, crear una regresión con estos metadatos y revisar los casos existentes de colaboradores, álbumes, versiones y respuestas tardías; después verificar la correspondencia con el audio real.

Documentación de la fuente: [API de LRCLIB](https://lrclib.net/docs). Sus respuestas distinguen `plainLyrics` y `syncedLyrics`; la consulta exacta considera la duración. Los resultados de este informe son una observación de la API en la fecha indicada y pueden cambiar.
