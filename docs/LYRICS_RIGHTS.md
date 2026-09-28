# Estado de derechos y uso de LRCLIB

Estado al 27 de septiembre de 2026: **pendiente; bloquea la publicación pública**. La primera versión prevista será gratuita y sin anuncios.

## Lo que pudimos verificar

- [El repositorio oficial de LRCLIB](https://github.com/tranxuanthang/lrclib) describe una API gratuita para buscar y aportar letras sincronizadas y publica el **código del servidor** bajo licencia MIT.
- La licencia del código del servidor no equivale a una licencia para reproducir, redistribuir o monetizar las letras de canciones que devuelve la API. Esta es una inferencia sobre el alcance de licencias distintas, no una autorización otorgada por LRCLIB.
- En una [consulta pública sobre uso comercial y caché de letras](https://github.com/tranxuanthang/lrclib/issues/111) no encontramos una respuesta o condición de licencia que resuelva ese uso para Lyrics. La distribución gratuita tampoco demuestra, por sí sola, que exista autorización para mostrar letras protegidas.
- Lyrics actualmente muestra letras obtenidas de la API y conserva las respuestas solo en memoria durante la sesión; no empaqueta ni publica una base de letras.

## Decisión necesaria

Antes de liberar Lyrics, obtener y conservar una fuente verificable sobre las condiciones de uso del servicio y los derechos aplicables al texto mostrado. Confirmar explícitamente si se permite el caso de uso previsto, incluida una distribución gratuita o monetizada según la decisión del proyecto. Si no se puede confirmar, utilizar una fuente con licencia adecuada o cambiar el producto a un modelo de letras aportadas/autorizadas por el usuario. La atribución al proveedor por sí sola no resuelve los derechos sobre las letras.

Consulta concreta por resolver con el proveedor o con una fuente autorizada: ¿puede una aplicación gratuita y sin anuncios solicitar la API y mostrar letras sincronizadas completas a sus usuarios? ¿Qué derechos cubren esas letras, qué atribución se exige y se permite una caché temporal en memoria? Guardar la respuesta y sus condiciones antes de cambiar el estado de esta tarea.

## Evidencia para cerrar esta tarea

Registrar aquí la fuente, fecha, alcance de la autorización, obligaciones de atribución, restricciones de caché y de distribución, y decisión de producto. Hasta entonces, mantener sin marcar la primera tarea P0 de `TODO.md`.
