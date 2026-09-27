'use client';

import { useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import Image from 'next/image';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { MediaItem } from '@/data/types';
import { BrandFallback } from '@/components/media/BrandFallback';
import { MediaVideo } from '@/components/media/MediaVideo';
import { MEDIA_CONTROL, PauseButton } from '@/components/media/PauseButton';
import { useEnVista } from '@/components/media/useEnVista';

/* ---------------------------------------------------------------------------
   Fotos y vídeos de UN caballo: un solo bloque vertical 9:16, con mini
   carrusel si hay más de uno. Solo recibe datos (`media[]`, N elementos, ya
   ordenados): no sabe de dónde vienen ni dónde están los archivos.

   MEZCLA. Una foto es un elemento más: ocupa la misma caja (recortada a 9:16),
   participa en flechas y marcadores y no reproduce nada. La pausa solo aparece
   cuando el elemento activo es un vídeo.

   REPRODUCCIÓN. Solo el vídeo ACTIVO y solo con el bloque a la vista; con
   movimiento reducido no arranca solo. Todos los elementos están apilados en
   la misma caja, que no cambia de tamaño: el activo aparece por opacidad y el
   vídeo anterior se pausa en el acto, así que nunca decodifican dos a la vez.

   SIN PORTADA. Detrás está el fondo de marca (`BrandFallback`), que se ve
   hasta el primer fotograma. No se sube `preload` para conseguir uno.
--------------------------------------------------------------------------- */

/* FLECHAS. Pertenecen a la tarjeta, no a la imagen: salen de la caja hacia el
   borde interior de la tarjeta (`--hb-card-pad`, que publica quien la pinta).
   Salen como mucho su ancho + 6px, y nunca más allá de 2px del borde: con
   padding amplio quedan casi fuera de la imagen; en una tarjeta estrecha pisan
   el lateral (≈ medio botón) en vez de encoger el medio. Sin `--hb-card-pad`
   se quedan dentro, a 2px del canto. El `after:`, centrado e invisible, da al
   menos 44×44px de zona táctil sin agrandar ni mover el círculo. */
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

export function HorseMedia({ nombre, media }: { nombre: string; media: readonly MediaItem[] }) {
  const reducido = useReducedMotion();
  const cajaRef = useRef<HTMLDivElement>(null);
  const visible = useEnVista(cajaRef);
  const [activo, setActivo] = useState(0);
  // `null` = sin decisión del usuario: manda la preferencia de movimiento.
  const [pausaManual, setPausaManual] = useState<boolean | null>(null);
  const enPausa = pausaManual ?? reducido;
  const total = media.length;

  if (total === 0) return null;

  const actual = media[activo] ?? media[0];
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
      aria-label={`Fotos y vídeos de ${nombre}`}
      onKeyDown={alTeclado}
      // Manda el ANCHO de la tarjeta; el tope en `svh` solo actúa en pantallas
      // bajas, para que el bloque 9:16 no pase de ~2/3 del alto visible.
      className="mx-auto w-[min(100%,calc(68svh*9/16))] [--hb-flecha:clamp(1.75rem,2.2cqw,2.25rem)]"
    >
      <div className="relative">
        <div
          ref={cajaRef}
          className="relative aspect-[9/16] w-full overflow-hidden rounded-md bg-black ring-1 ring-white/10"
        >
          <BrandFallback />

          {media.map((item, i) => {
            const esActivo = i === activo;
            const capa = `absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out motion-reduce:transition-none ${
              esActivo ? 'opacity-100' : 'opacity-0'
            }`;

            return item.type === 'video' ? (
              <MediaVideo
                key={item.id}
                src={item.src}
                poster={item.poster}
                etiqueta={item.alt ?? `Vídeo de ${nombre}`}
                oculto={!esActivo}
                reproducir={esActivo && visible && !enPausa}
                className={capa}
              />
            ) : (
              <Image
                key={item.id}
                src={item.src}
                alt={esActivo ? (item.alt ?? `Foto de ${nombre}`) : ''}
                aria-hidden={esActivo ? undefined : true}
                fill
                sizes="(min-width: 56rem) 25vw, 50vw"
                className={capa}
              />
            );
          })}

          {actual.type === 'video' && (
            <PauseButton
              enPausa={enPausa}
              onToggle={() => setPausaManual(!enPausa)}
              etiqueta={`el vídeo de ${nombre}`}
            />
          )}
        </div>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => ir(activo - 1)}
              aria-label={`Anterior: fotos y vídeos de ${nombre}`}
              className={`${MEDIA_CONTROL} ${FLECHA}`}
              style={{ left: SALIDA_FLECHA }}
            >
              <Chevron direccion="izquierda" />
            </button>
            <button
              type="button"
              onClick={() => ir(activo + 1)}
              aria-label={`Siguiente: fotos y vídeos de ${nombre}`}
              className={`${MEDIA_CONTROL} ${FLECHA}`}
              style={{ right: SALIDA_FLECHA }}
            >
              <Chevron direccion="derecha" />
            </button>
          </>
        )}
      </div>

      {/* La fila existe siempre, vacía con un solo elemento: así los medios de
          una misma fila de la rejilla quedan a la misma altura. */}
      <div className="mt-2 flex h-6 justify-center gap-0.5">
        {total > 1 &&
          media.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => ir(i)}
              aria-label={`${item.type === 'video' ? 'Vídeo' : 'Foto'} ${i + 1} de ${total} de ${nombre}`}
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