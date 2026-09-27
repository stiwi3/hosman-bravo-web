'use client';

import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

/** Fracción visible a partir de la cual un vídeo empieza a reproducirse. */
const UMBRAL_VISIBLE = 0.35;

/**
 * ¿Está el elemento a la vista? Con histéresis: entra al superar el 35 % y
 * solo sale cuando deja la pantalla del todo, para que un vídeo no se corte
 * y arranque una y otra vez al rozar el umbral durante el scroll.
 */
export function useEnVista(ref: RefObject<Element | null>): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.intersectionRatio >= UMBRAL_VISIBLE) setVisible(true);
        else if (!entrada.isIntersecting) setVisible(false);
      },
      { threshold: [0, UMBRAL_VISIBLE] },
    );
    observer.observe(elemento);
    return () => observer.disconnect();
  }, [ref]);

  return visible;
}