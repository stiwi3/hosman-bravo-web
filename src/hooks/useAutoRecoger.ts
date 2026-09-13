'use client';

import { useCallback, useEffect, useRef } from 'react';

/** Tras cuánto tiempo sin interacción vuelve a recogerse un bloque desplegado a mano. */
export const AUTO_RECOGER_MS = 6000;

/**
 * Auto-contracción de un bloque desplegable (rail de plataformas, Próximos
 * Shows mínimo). Un solo sitio para una regla que tiene que ser idéntica en los
 * dos: si fueran dos copias, acabarían comportándose distinto.
 *
 * Qué retiene el bloque abierto: el puntero encima o el foco de TECLADO
 * dentro. Un clic de ratón también deja el foco en el enlace, pero ese no
 * cuenta (`:focus-visible` lo distingue): si contara, tras abrir una
 * plataforma el bloque no se recogería nunca.
 *
 * En táctil no hay hover: `pointerenter`/`pointerleave` llegan igualmente
 * alrededor de cada toque, así que la cuenta arranca al levantar el dedo.
 */
export function useAutoRecoger(abierto: boolean, setAbierto: (v: boolean) => void) {
  const retenido = useRef({ puntero: false, teclado: false });
  const temporizador = useRef<number | undefined>(undefined);

  const cancelar = useCallback(() => {
    window.clearTimeout(temporizador.current);
    temporizador.current = undefined;
  }, []);

  const programar = useCallback(() => {
    cancelar();
    if (retenido.current.puntero || retenido.current.teclado) return;
    temporizador.current = window.setTimeout(() => setAbierto(false), AUTO_RECOGER_MS);
  }, [cancelar, setAbierto]);

  useEffect(() => cancelar, [cancelar]);

  const handlers = {
    onPointerEnter: () => {
      retenido.current.puntero = true;
      cancelar();
    },
    onPointerLeave: () => {
      retenido.current.puntero = false;
      if (abierto) programar();
    },
    onFocus: (e: React.FocusEvent<HTMLElement>) => {
      retenido.current.teclado = (e.target as Element).matches(':focus-visible');
      if (retenido.current.teclado) cancelar();
    },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      if (e.currentTarget.contains(e.relatedTarget)) return;
      retenido.current.teclado = false;
      if (abierto) programar();
    },
  };

  return { handlers, programar, cancelar };
}
