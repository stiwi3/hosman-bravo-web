'use client';

import { useEffect } from 'react';

/* ---------------------------------------------------------------------------
   Bloqueo de scroll compartido.

   `document.body` es uno solo, así que dos piezas que lo bloqueen a la vez se
   pisan: la primera en soltarlo restaura el valor que había ANTES de que la
   segunda lo tomara, y la página vuelve a desplazarse con un modal todavía
   abierto. Ya hay dos candidatas — el telón (`EntryScreen`) y el modal de
   vídeo de MÚSICA— así que el contador vive aquí y no en cada una.

   El contador es de módulo, no de componente, precisamente porque el recurso
   que protege también es global. Solo el primer bloqueo guarda el valor
   original y solo el último lo restaura.

   En `StrictMode` de desarrollo React monta, desmonta y vuelve a montar cada
   efecto: el contador sube a 2, baja a 1 y termina equilibrado.
--------------------------------------------------------------------------- */

/** Cuántas piezas mantienen el scroll bloqueado ahora mismo. */
let locks = 0;
/** El `overflow` que tenía el `body` antes del primer bloqueo. */
let previousOverflow = '';

/**
 * Impide desplazar la página mientras `active` sea cierto.
 *
 * @param active si esta pieza quiere el scroll bloqueado.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    if (locks === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    locks += 1;

    return () => {
      locks -= 1;
      if (locks === 0) document.body.style.overflow = previousOverflow;
    };
  }, [active]);
}
