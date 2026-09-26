'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { HorseVideo } from '@/data/types';

/* ---------------------------------------------------------------------------
   Vídeos de UN caballo: un solo bloque vertical 9:16, con mini carrusel si hay
   más de uno. Solo recibe datos (`videos[]`, N elementos): no sabe de dónde
   vienen ni dónde están los archivos.

   SIN POSTER. Detrás de los vídeos hay un fondo de marca (el mismo de MÚSICA:
   brasa burdeos + isotipo). Un `<video>` sin poster ni fotogramas no pinta
   nada, así que ese fondo se ve hasta el primer fotograma y luego queda
   tapado sin estado que gestionar. No se sube `preload` para conseguir un
   fotograma.

   REPRODUCCIÓN. Todos van `muted`, `playsInline`, `loop` y `preload="none"`:
   hasta que se reproducen solo se descarga el poster. Reproduce únicamente el
   vídeo ACTIVO y solo mientras el bloque está a la vista (≥ 35%); se pausa
   cuando sale del todo. Con movimiento reducido no arranca solo. El botón de
   pausa cubre además el requisito de poder detener un bucle de más de 5 s.

   CAMBIO DE VÍDEO. Los vídeos del caballo están apilados en la misma caja,
   que no cambia de tamaño: el activo aparece por opacidad y el anterior se
   pausa en el acto, así que nunca suenan (ni decodifican) dos a la vez.
--------------------------------------------------------------------------- */

const UMBRAL_VISIBLE = 0.35;

const CONTROL =
  'flex items-center justify-center rounded-full border border-amber-200/30 bg-black/55 text-amber-100/85 backdrop-blur-sm transition-colors duration-200 hover:border-amber-400/70 hover:text-amber-300 focus-visible:border-amber-400 focus-visible:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';

/* FLECHAS. Pertenecen a la tarjeta, no a la imagen: salen del vídeo hacia el
   borde interior de la tarjeta (`--hb-card-pad`, que publica quien la pinta).
   Salen como mucho su ancho + 6px, y nunca más allá de 2px del borde: con
   padding amplio quedan casi fuera de la imagen; en una tarjeta estrecha pisan
   el lateral del vídeo (≈ medio botón) en vez de encoger el vídeo. Sin
   `--hb-card-pad` se quedan dentro del vídeo, a 2px del canto. El `after:`,
   centrado e invisible, da al menos 44×44px de zona táctil sin agrandar ni
   mover el círculo. */
const FLECHA =
  'absolute top-1/2 h-[var(--hb-flecha)] w-[var(--hb-flecha)] -translate-y-1/2 after:absolute after:left-1/2 after:top-1/2 after:h-[max(2.75rem,100%)] after:w-[max(2.75rem,100%)] after:-translate-x-1/2 after:-translate-y-1/2 after:content-[""]';
const SALIDA_FLECHA =
  'max(calc(-1 * (var(--hb-flecha) + 0.375rem)), calc(0.125rem - var(--hb-card-pad, 0px)))';

function Chevron({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[45%] w-[45%]">
      <path
        d={direccion === 'izquierda' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HorseVideos({ nombre, videos }: { nombre: string; videos: readonly HorseVideo[] }) {
  const reducido = useReducedMotion();
  const cajaRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [activo, setActivo] = useState(0);
  const [visible, setVisible] = useState(false);
  // `null` = sin decisión del usuario: manda la preferencia de movimiento.
  const [pausaManual, setPausaManual] = useState<boolean | null>(null);
  const enPausa = pausaManual ?? reducido;
  const total = videos.length;

  useEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    const observer = new IntersectionObserver(
      ([entrada]) => {
        if (entrada.intersectionRatio >= UMBRAL_VISIBLE) setVisible(true);
        else if (!entrada.isIntersecting) setVisible(false);
      },
      { threshold: [0, UMBRAL_VISIBLE] },
    );
    observer.observe(caja);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((video, i) => {
      if (!video) return;
      if (i === activo && visible && !enPausa) {
        video.muted = true;
        // Puede rechazarse (ahorro de datos, pestaña oculta): se queda el poster.
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [activo, visible, enPausa]);

  if (total === 0) return null;

  const ir = (i: number) => setActivo((i + total) % total);
  const alTeclado = (e: KeyboardEvent) => {
    if (total < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ir(activo - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      ir(activo + 1);
    }
  };

  return (
    <div
      role="group"
      aria-roledescription={total > 1 ? 'carrusel' : undefined}
      aria-label={`Vídeos de ${nombre}`}
      onKeyDown={alTeclado}
      // Manda el ANCHO de la tarjeta; el tope en `svh` solo actúa en pantallas
      // bajas, para que el vídeo 9:16 no pase de ~2/3 del alto visible.
      className="mx-auto w-[min(100%,calc(68svh*9/16))] [--hb-flecha:clamp(1.75rem,2.2cqw,2.25rem)]"
    >
      <div className="relative">
        <div
          ref={cajaRef}
          className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-black ring-1 ring-white/10"
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(122,32,38,0.42), rgba(0,0,0,0) 70%), linear-gradient(160deg, #161012 0%, #090607 60%, #050304 100%)',
            }}
          >
            <Image
              src={hosmanData.images.logo.isotipoDorado}
              alt=""
              width={200}
              height={200}
              className="h-auto w-[38%] opacity-[0.35]"
            />
          </div>

          {videos.map((video, i) => (
            <video
              key={video.id}
              ref={(el) => {
                videoRefs.current[i] = el;
              }}
              src={video.src}
              poster={video.poster}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              aria-hidden="true"
              tabIndex={-1}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none ${
                i === activo ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}

          <button
            type="button"
            onClick={() => setPausaManual(!enPausa)}
            aria-label={enPausa ? `Reproducir el vídeo de ${nombre}` : `Pausar el vídeo de ${nombre}`}
            className={`${CONTROL} absolute bottom-2 right-2 h-8 w-8 opacity-70 hover:opacity-100 focus-visible:opacity-100`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
              {enPausa ? <path d="M8 5.5v13l10.5-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
            </svg>
          </button>
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(activo - 1)}
              aria-label={`Vídeo anterior de ${nombre}`}
              className={`${CONTROL} ${FLECHA}`}
              style={{ left: SALIDA_FLECHA }}
            >
              <Chevron direccion="izquierda" />
            </button>
            <button
              type="button"
              onClick={() => ir(activo + 1)}
              aria-label={`Vídeo siguiente de ${nombre}`}
              className={`${CONTROL} ${FLECHA}`}
              style={{ right: SALIDA_FLECHA }}
            >
              <Chevron direccion="derecha" />
            </button>
          </>
        )}
      </div>

      {/* La fila existe siempre, vacía con un solo vídeo: así los vídeos de
          una misma fila de la rejilla quedan a la misma altura. */}
      <div className="mt-2 flex h-6 justify-center gap-0.5">
        {total > 1 &&
          videos.map((video, i) => (
            <button
              key={video.id}
              type="button"
              onClick={() => ir(i)}
              aria-label={`Vídeo ${i + 1} de ${total} de ${nombre}`}
              aria-current={i === activo ? 'true' : undefined}
              className="group/punto flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
            >
              <span
                aria-hidden="true"
                className={`block h-1.5 rounded-full transition-all duration-200 motion-reduce:transition-none ${
                  i === activo
                    ? 'w-4 bg-amber-400'
                    : 'w-1.5 bg-white/30 group-hover/punto:bg-white/60'
                }`}
              />
            </button>
          ))}
      </div>
    </div>
  );
}
