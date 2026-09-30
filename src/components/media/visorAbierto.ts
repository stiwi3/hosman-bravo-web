'use client';

import { useSyncExternalStore } from 'react';

/* ---------------------------------------------------------------------------
   ¿Hay un visor multimedia abierto? Estado de MÓDULO porque lo que protege es
   global: mientras un `MediaViewer` está abierto, NINGÚN vídeo inline de
   GALERÍA, EL SHOW o CABALLOS debe reproducirse detrás (se verían dos a la vez
   y se decodificaría para nada). `MediaVideo` lo lee; al cerrarse, cada vídeo
   vuelve a depender solo de su propia lógica (visibilidad, pausa manual).
--------------------------------------------------------------------------- */

let abiertos = 0;
const oyentes = new Set<() => void>();

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}

/** Un visor se abre (`true`) o se cierra (`false`). Cada visor lo marca UNA vez. */
export function marcarVisor(abierto: boolean) {
  abiertos = Math.max(0, abiertos + (abierto ? 1 : -1));
  oyentes.forEach((oyente) => oyente());
}

export function useVisorAbierto(): boolean {
  return useSyncExternalStore(
    suscribir,
    () => abiertos > 0,
    () => false
  );
}
