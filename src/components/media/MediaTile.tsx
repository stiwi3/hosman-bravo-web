'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { MediaItem } from '@/data/types';
import { BrandFallback } from './BrandFallback';
import { MediaVideo } from './MediaVideo';
import { PauseButton } from './PauseButton';
import { useEnVista } from './useEnVista';

/**
 * Una pieza de GALERÍA o de EL SHOW: foto o vídeo en el MISMO hueco.
 *
 * `relleno`: la pieza llena la caja que le da la sección (EL SHOW, 3:4). Sin
 * él, la pieza toma su propia altura (GALERÍA, mampostería): la foto por su
 * tamaño natural y el vídeo por el de su portada o su primer fotograma
 * (`aspect-ratio: auto 9 / 16` — el 9:16 solo mientras no se conoce).
 *
 * El vídeo se distingue con un borde sutil y lleva la pausa abajo a la
 * derecha; nada más cambia en la composición.
 *
 * Texto accesible: la `Descripción` del Sheet (`item.alt`) o, si Hosman la
 * dejó vacía, la `reserva` de la sección para ese tipo — genérica, sin
 * inventar qué se ve.
 */
export function MediaTile({
  item,
  reserva,
  relleno = false,
  className = '',
  sizes,
}: {
  item: MediaItem;
  reserva: Readonly<Record<MediaItem['type'], string>>;
  relleno?: boolean;
  className?: string;
  sizes?: string;
}) {
  const alt = item.alt ?? reserva[item.type];

  if (item.type === 'image') {
    return (
      <div className={`group relative overflow-hidden rounded-lg ${className}`}>
        {relleno ? (
          <Image
            src={item.src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <Image
            src={item.src}
            alt={alt}
            width={800}
            height={1000}
            sizes={sizes}
            className="h-auto w-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
      </div>
    );
  }

  return <VideoTile item={item} etiqueta={alt} relleno={relleno} className={className} />;
}

function VideoTile({
  item,
  etiqueta,
  relleno,
  className,
}: {
  item: MediaItem;
  etiqueta: string;
  relleno: boolean;
  className: string;
}) {
  const caja = useRef<HTMLDivElement>(null);
  const visible = useEnVista(caja);
  const reducido = useReducedMotion();
  // `null` = sin decisión del usuario: manda la preferencia de movimiento.
  const [pausaManual, setPausaManual] = useState<boolean | null>(null);
  const enPausa = pausaManual ?? reducido;

  return (
    <div
      ref={caja}
      className={`relative overflow-hidden rounded-lg bg-black ring-1 ring-amber-200/35 ${className}`}
    >
      <BrandFallback />
      <MediaVideo
        src={item.src}
        poster={item.poster}
        etiqueta={etiqueta}
        reproducir={visible && !enPausa}
        className={
          relleno
            ? 'absolute inset-0 h-full w-full object-cover'
            : 'relative block h-auto w-full object-cover'
        }
        style={relleno ? undefined : { aspectRatio: 'auto 9 / 16' }}
      />
      <PauseButton
        enPausa={enPausa}
        onToggle={() => setPausaManual(!enPausa)}
        etiqueta={item.alt ? `el vídeo: ${item.alt}` : 'el vídeo'}
      />
    </div>
  );
}