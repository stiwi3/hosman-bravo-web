'use client';

import { useAudio } from './AudioProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/* ---------------------------------------------------------------------------
   PIEZAS COMPARTIDAS DE LOS DOS REPRODUCTORES.

   `TrackPlayer` (escritorio) y `MobilePlayer` son dos PRESENTACIONES del mismo
   audio, no dos reproductores. Lo que comparten vive aquí para que no haya dos
   copias de la misma decisión: el estado real siempre está en `AudioProvider`,
   y de él cuelga `useControlDeSonido`.

   Lo que NO se comparte es la composición: el móvil no muestra el nombre del
   artista, ni el rótulo de sección, ni «SOUND ON/OFF» como control aparte —
   ahí el ecualizador va integrado alrededor del play. Por eso son dos
   componentes y no uno con banderas.
--------------------------------------------------------------------------- */

/**
 * Alturas y ritmos distintos por barra: el conjunto no late al unísono.
 */
const BARS = [
  { height: 7, duration: 1.1, delay: 0 },
  { height: 13, duration: 0.85, delay: 0.22 },
  { height: 9, duration: 1.35, delay: 0.41 },
  { height: 15, duration: 0.95, delay: 0.09 },
  { height: 8, duration: 1.25, delay: 0.5 },
  { height: 12, duration: 0.9, delay: 0.31 },
  { height: 10, duration: 1.45, delay: 0.16 },
  { height: 14, duration: 1.05, delay: 0.55 }
];

/**
 * Cuero oscuro resuelto solo con CSS: dos tramas de puntos desfasadas sobre un
 * degradado burdeos. Se lee como grano, no como textura estampada, y no cuesta
 * ninguna imagen.
 */
export const LEATHER: React.CSSProperties = {
  backgroundImage: [
    'radial-gradient(circle at 30% 40%, rgba(242,238,232,0.035) 0.5px, transparent 0.5px)',
    'radial-gradient(circle at 70% 65%, rgba(0,0,0,0.5) 0.5px, transparent 0.5px)',
    'linear-gradient(145deg, #1a0a0d 0%, #0d0d0f 55%, #150609 100%)'
  ].join(', '),
  backgroundSize: '6px 6px, 9px 9px, 100% 100%'
};

/** Todos los iconos aceptan `style` además de `className`: sus tamaños van en
 *  unidades de contenedor, y una unidad de container query no se puede
 *  expresar como clase de utilidad sin generar una variante por cada valor. */
export type IconProps = { className?: string; style?: React.CSSProperties };

export function PlayIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
      <path d="M8 5.14v13.72a.5.5 0 0 0 .76.43l11.14-6.86a.5.5 0 0 0 0-.86L8.76 4.71A.5.5 0 0 0 8 5.14Z" />
    </svg>
  );
}

export function PauseIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className} style={style}>
      <rect x="7" y="5" width="3.4" height="14" rx="1" />
      <rect x="13.6" y="5" width="3.4" height="14" rx="1" />
    </svg>
  );
}

/**
 * Ecualizador. `scale` reescala las alturas nativas (calibradas para el
 * reproductor de escritorio) sin duplicar la tabla de barras.
 */
export function Equalizer({
  active,
  scale = 1,
  barWidth = '2px',
  gap = '5px',
  className
}: {
  active: boolean;
  scale?: number;
  barWidth?: string;
  gap?: string;
  className?: string;
}) {
  return (
    <div className={`flex items-end ${className ?? ''}`} style={{ gap }} aria-hidden="true">
      {BARS.map(({ height, duration, delay }, i) => (
        <span
          key={i}
          className={`origin-bottom rounded-full transition-colors duration-500 ${
            active ? 'bg-[#D4AF37]' : 'bg-[#D4AF37]/25'
          }`}
          style={{
            width: barWidth,
            height: `${height * scale}px`,
            transform: active ? undefined : 'scaleY(0.2)',
            boxShadow: active ? '0 0 6px -1px rgba(212,175,55,0.55)' : undefined,
            animation: active ? `hb-equalizer ${duration}s ease-in-out ${delay}s infinite` : undefined
          }}
        />
      ))}
    </div>
  );
}

/**
 * El único control de sonido del sitio.
 *
 * Los dos reproductores gobiernan un único estado —si suena o no— y por eso
 * jamás pueden contradecirse: silenciar pausa, y devolver el sonido reanuda.
 * No hay estado local aquí: todo sale de `AudioProvider`.
 */
export function useControlDeSonido() {
  const { isPlaying, isMuted, mute, unmute, play, pause, track } = useAudio();
  const reducedMotion = useReducedMotion();

  const sonando = isPlaying && !isMuted;
  // El ecualizador solo se mueve si de verdad está sonando algo audible.
  const animar = sonando && !reducedMotion;

  const alternar = () => {
    if (sonando) {
      pause();
      mute();
    } else {
      unmute();
      void play();
    }
  };

  return { sonando, animar, alternar, track };
}
