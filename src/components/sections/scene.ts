/* ---------------------------------------------------------------------------
   Envoltorio común de las escenas con scroll.

   Antes cada sección declaraba por su cuenta `pt-32 pb-16 px-6` y su propio
   `max-w-*`, así que las cinco tomaban la misma decisión cinco veces y ninguna
   reaccionaba al alto disponible: los 128px de `pt-32` se comían el 22% de la
   pantalla en 1280×591 y, en 2048×1023, se quedaban un píxel por debajo de la
   cabecera real (129px) — de ahí el roce del menú con el contenido.

   Ahora el espacio superior se DERIVA de la altura real de la cabecera
   (`--spacing-scene-top`, ver `globals.css`), de modo que cabecera y contenido
   no pueden descuadrarse: si cambia el menú, el hueco se ajusta solo.

   Cualquier escena nueva debe construirse sobre estas constantes en vez de
   volver a elegir medidas.
--------------------------------------------------------------------------- */

/** Espaciado de escena: salva la cabecera fija y da el aire lateral e
 *  inferior. Es lo que necesita CUALQUIER sección con scroll. */
export const SCENE = 'relative pt-scene-top pb-scene-bottom px-scene-x';

/** Igual, pero ocupando al menos la pantalla completa. Lo usan las secciones
 *  que son la única de su página; EL SHOW no, porque lleva otra debajo y con
 *  `min-h-screen` empujaría la segunda fuera de la vista. */
export const SCENE_FULL = `${SCENE} min-h-screen`;

/** Caja de contenido centrada, con el tope de ancho compartido. */
export const SCENE_CONTENT = 'mx-auto w-full max-w-content';
