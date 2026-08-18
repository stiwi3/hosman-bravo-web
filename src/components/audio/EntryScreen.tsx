'use client';

import { useEffect, useState } from 'react';
import { useAudio } from './AudioProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** Duración de la salida. Con movimiento reducido se acorta casi a cero. */
const EXIT_MS = 800;

/**
 * Portada de acceso a la web.
 *
 * Existe por una razón concreta además de la estética: los navegadores no
 * permiten reproducir audio sin un gesto previo del usuario, y la pulsación
 * del acceso es ese gesto.
 */
export function EntryScreen() {
  const { enter } = useAudio();
  const reducedMotion = useReducedMotion();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  // Mientras la portada está visible no debe poder desplazarse la página.
  useEffect(() => {
    if (gone) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [gone]);

  useEffect(() => {
    if (!leaving) return;
    const delay = reducedMotion ? 60 : EXIT_MS;
    const timer = window.setTimeout(() => setGone(true), delay);
    return () => window.clearTimeout(timer);
  }, [leaving, reducedMotion]);

  if (gone) return null;

  const handleEnter = () => {
    if (leaving) return;
    setLeaving(true);
    // No se espera al audio: si el navegador lo rechaza, se entra igual.
    void enter();
  };

  return (
    <div
      aria-hidden={leaving}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050304] px-6 transition-opacity ease-out ${
        reducedMotion ? 'duration-150' : 'duration-[800ms]'
      } ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      {/* Mismo resplandor de brasa que sostiene el hero. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_54%_60%_at_50%_50%,rgba(104,27,32,0.32),transparent_72%)]"
      />

      <div
        className={`relative flex flex-col items-center transition-all ease-out ${
          reducedMotion ? 'duration-150' : 'duration-[800ms]'
        } ${leaving && !reducedMotion ? 'scale-[1.04] opacity-0' : 'scale-100 opacity-100'}`}
      >
        <h1 className="text-center text-4xl font-black tracking-[0.18em] text-amber-200/90 sm:text-5xl md:text-6xl">
          HOSMAN BRAVO
        </h1>
        <span className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        <button
          type="button"
          onClick={handleEnter}
          className="mt-10 rounded-full border border-amber-200/30 bg-black/40 px-8 py-4 text-[11px] font-bold tracking-[0.28em] text-amber-100/80 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.03] hover:border-amber-400/70 hover:text-amber-300 hover:shadow-[0_0_22px_-4px_rgba(200,150,60,0.5)] focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none sm:px-10 sm:text-xs"
        >
          ENTRAR A LA EXPERIENCIA
        </button>
      </div>
    </div>
  );
}
