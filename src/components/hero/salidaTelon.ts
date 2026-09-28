'use client';

import { useSyncExternalStore } from 'react';

/* ---------------------------------------------------------------------------
   SALIDA DEL MINI-TELÓN — el único punto común entre `EntryScreen` y el
   Pre-Hero de INICIO.

   `EntryScreen` anuncia AQUÍ, una sola vez, cómo se retiró el telón; el
   Pre-Hero lo escucha. Así ninguno de los dos conoce al otro, `SiteShell` no
   cambia y no se duplica lógica por botón.

   Vive a nivel de módulo a propósito: dura lo mismo que el documento, igual que
   el propio telón (que tampoco vuelve al navegar). Una recarga lo reinicia.

   · 'entrar' — ENTRAR EN LA EXPERIENCIA (`enter()`: la canción arranca).
   · 'play'   — primera reproducción desde el reproductor (el telón se retira
                solo visualmente; la canción ya suena).
   · 'cerrar' — X o Escape: se entra sin activar sonido.

   ARRANQUE SÍNCRONO. Un vídeo CON sonido solo puede empezar dentro de la
   activación del usuario (Safari/iOS no la propaga a efectos posteriores ni a
   `requestAnimationFrame`). Por eso el Pre-Hero registra aquí su función de
   arranque y `anunciarSalidaTelon` la llama en el mismo instante del anuncio,
   antes de que React vuelva a renderizar nada.
--------------------------------------------------------------------------- */

export type SalidaTelon = 'entrar' | 'play' | 'cerrar';

let salida: SalidaTelon | null = null;
let arranque: ((tipo: SalidaTelon) => void) | null = null;
const oyentes = new Set<() => void>();

/** Lo llama `EntryScreen` al empezar su salida. Solo cuenta la primera. */
export function anunciarSalidaTelon(tipo: SalidaTelon) {
  if (salida) return;
  salida = tipo;
  arranque?.(tipo);
  oyentes.forEach((oyente) => oyente());
}

/** El Pre-Hero registra cómo arrancar. Devuelve la baja del registro. */
export function registrarArranqueTelon(fn: (tipo: SalidaTelon) => void) {
  arranque = fn;
  return () => {
    if (arranque === fn) arranque = null;
  };
}

function subscribe(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Cómo salió el telón, o `null` si sigue puesto. */
export function useSalidaTelon(): SalidaTelon | null {
  return useSyncExternalStore(
    subscribe,
    () => salida,
    () => null
  );
}
