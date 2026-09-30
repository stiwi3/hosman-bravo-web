'use client';

import { useEffect, useRef } from 'react';
import { useVisorAbierto } from './visorAbierto';

/**
 * El `<video>` de un medio, controlado desde fuera: reproduce mientras
 * `reproducir` sea verdadero y se pausa en cuanto deja de serlo. No decide
 * CUÁNDO (visibilidad, pausa manual, movimiento reducido, cuál es el activo):
 * eso es de quien lo usa. Única excepción común: con un `MediaViewer` abierto
 * ningún vídeo inline se reproduce (el visor es la única representación viva).
 *
 * Siempre `muted`, `playsInline`, `loop` y `preload="none"`: hasta que se
 * reproduce solo se descarga la portada.
 */
export function MediaVideo({
  src,
  poster,
  etiqueta,
  reproducir,
  oculto = false,
  className,
  style,
}: {
  src: string;
  poster?: string;
  /** Descripción accesible. Sin ella, el vídeo es decorativo para el lector. */
  etiqueta?: string;
  reproducir: boolean;
  /** Fuera del árbol accesible (por ejemplo, un vídeo inactivo de un carrusel). */
  oculto?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const visorAbierto = useVisorAbierto();
  const debeReproducir = reproducir && !visorAbierto;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (debeReproducir) {
      video.muted = true;
      // Puede rechazarse (ahorro de datos, pestaña oculta): se queda la portada.
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [debeReproducir]);

  const accesible = Boolean(etiqueta) && !oculto;

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      tabIndex={-1}
      aria-hidden={accesible ? undefined : true}
      aria-label={accesible ? etiqueta : undefined}
      className={className}
      style={style}
    />
  );
}