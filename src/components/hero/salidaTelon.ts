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
--------------------------------------------------------------------------- */

export type SalidaTelon = 'entrar' | 'play' | 'cerrar';

let salida: SalidaTelon | null = null;
const oyentes = new Set<() => void>();

/** Lo llama `EntryScreen` al empezar su salida. Solo cuenta la primera. */
export function anunciarSalidaTelon(tipo: SalidaTelon) {
  if (salida) return;
  salida = tipo;
  oyentes.forEach((oyente) => oyente());
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
