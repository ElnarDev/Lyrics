# Política de privacidad de Lyrics — borrador para revisión

**Estado:** borrador interno. No publicar hasta definir responsable/contacto y comprobar el comportamiento de la versión distribuida.

Lyrics muestra en una ventana flotante las letras sincronizadas de la canción que se reproduce en YouTube Music.

## Datos utilizados

La extensión lee de la pestaña de YouTube Music el título de la canción, la línea de artista y descripción mostrada por el reproductor, la posición de reproducción y si está en pausa. Envía esos datos únicamente a la aplicación Lyrics que se ejecuta en el mismo equipo, mediante una conexión local.

La aplicación utiliza el título y el primer segmento de artista para consultar por HTTPS la API pública de LRCLIB y recibir letras. Por ello, LRCLIB recibe esos metadatos de búsqueda y la información técnica normal de una solicitud de red, como la dirección IP. Consulta las prácticas de privacidad del proveedor antes de publicar esta política.

## Uso y almacenamiento

Los datos se usan para identificar la canción y mantener las letras sincronizadas. Lyrics no requiere una cuenta y no solicita contraseñas ni cookies de YouTube Music. La versión actual no incorpora anuncios, analítica ni telemetría; la primera publicación está prevista como gratuita y sin anuncios. Conserva temporalmente letras consultadas y el estado de la pista en memoria mientras la aplicación está abierta; no guarda un historial de escucha en disco. La clave aleatoria de vinculación se guarda localmente en los datos de Lyrics y en el almacenamiento de la extensión de Chrome para mantener la conexión entre sesiones.

## Terceros y seguridad

La consulta a LRCLIB es la única transmisión externa de metadatos de canciones prevista en el código actual. La conexión entre la extensión y la aplicación ocurre en el propio equipo y requiere una clave de vinculación generada por Lyrics, además de la validación de origen y formato.

## Control del usuario

El usuario puede detener el envío de datos desactivando o eliminando la extensión, cerrar Lyrics y desinstalar la aplicación. Al cerrar Lyrics se pierde la caché en memoria. La aplicación no dispone actualmente de cuenta ni de historial remoto que eliminar.

## Contacto y cambios

Responsable del producto: **[pendiente de identificar]**. Contacto de privacidad y soporte: **[pendiente]**. Fecha efectiva de esta política: **[pendiente de publicación]**. Los cambios materiales en el tratamiento de datos requerirán actualizar esta política y las declaraciones de Chrome Web Store antes de publicar la nueva versión.

## Comprobaciones antes de publicar

- Confirmar responsable y correo o canal de contacto público.
- Confirmar las prácticas y enlace de privacidad de LRCLIB que corresponda citar.
- Revisar una compilación final y su tráfico de red; corregir cualquier diferencia con este texto.
- Publicar esta política en una URL accesible y completar de forma consistente la sección de privacidad de Chrome Web Store.
