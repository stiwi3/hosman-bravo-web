'use client';

import { useState } from 'react';
import { hosmanData } from '@/data/hosman-data';
import {
  AmazonMusicIcon,
  AppleMusicIcon,
  AudiomackIcon,
  DeezerIcon,
  SoundCloudIcon,
  SpotifyIcon,
  TidalIcon,
  YouTubeMusicIcon,
} from './icons/PlatformIcons';

const ICONS = {
  spotify: SpotifyIcon,
  appleMusic: AppleMusicIcon,
  youtubeMusic: YouTubeMusicIcon,
  amazonMusic: AmazonMusicIcon,
  deezer: DeezerIcon,
  tidal: TidalIcon,
  soundCloud: SoundCloudIcon,
  audiomack: AudiomackIcon,
} as const;

/** Cuántas plataformas quedan a la vista cuando el bloque va recogido. */
const COLLAPSED_COUNT = 4;

/* El tamaño sale de `--hb-control`, la escala base de los controles redondos
   persistentes (ver `globals.css`). Antes eran tres escalones por breakpoint
   de ANCHO (40/44/48px), y entre 2048×1023 y 1280×591 el ancho no cambia de
   escalón: los botones medían lo mismo en una escena de 1023px de alto que en
   una de 591. El token mira también el alto disponible y para en 36px, que es
   el mínimo cómodo de pulsación. */
const BUTTON_CLASS =
  'flex h-[var(--hb-control)] w-[var(--hb-control)] shrink-0 items-center justify-center rounded-full border border-amber-200/25 bg-black/50 text-amber-100/70 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105 hover:border-amber-400/70 hover:bg-black/70 hover:text-amber-300 hover:shadow-[0_0_14px_-2px_rgba(200,150,60,0.45)] focus-visible:scale-105 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none';

/* Iconos y separación, derivados del mismo token con su propio suelo: el
   glifo dentro del botón (20px sobre 48 = 42%) y el aire entre botones. */
const ICON_CLASS = 'h-[max(15px,calc(var(--hb-control)*0.42))] w-[max(15px,calc(var(--hb-control)*0.42))]';
const AFFORDANCE_CLASS = 'h-[max(13px,calc(var(--hb-control)*0.33))] w-[max(13px,calc(var(--hb-control)*0.33))]';
const ROW_GAP = 'gap-[clamp(0.25rem,0.8svh,0.5rem)]';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`${AFFORDANCE_CLASS} transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M14.5 5.5 8 12l6.5 6.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EllipsisIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={AFFORDANCE_CLASS}>
      <circle cx="5" cy="12" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="19" cy="12" r="1.7" />
    </svg>
  );
}

interface MusicPlatformsProps {
  /**
   * Fuera de la portada el bloque se recoge: en las demás secciones la fila
   * completa se cruzaba con el contenido de la página.
   */
  collapsible?: boolean;
}

/**
 * Enlaces a las plataformas de streaming del artista.
 *
 * En escritorio forman una sola fila en la esquina superior derecha; en
 * pantallas estrechas pasan a una rejilla de cuatro columnas situada bajo la
 * cabecera, para no cruzarse con la navegación central.
 */
export function MusicPlatforms({ collapsible = false }: MusicPlatformsProps) {
  // El llamante remonta el componente al cambiar de sección (con `key`), así
  // que basta con arrancar recogido: no hace falta reiniciar nada a mano.
  const [expanded, setExpanded] = useState(false);

  const collapsed = collapsible && !expanded;
  const platforms = collapsed
    ? hosmanData.musicPlatforms.slice(0, COLLAPSED_COUNT)
    : hosmanData.musicPlatforms;
  const hidden = hosmanData.musicPlatforms.length - COLLAPSED_COUNT;

  return (
    <div
      className={
        collapsible
          ? `flex items-center ${ROW_GAP}`
          : `grid grid-cols-4 ${ROW_GAP} md:flex`
      }
    >
      {/* Abre y cierra la fila; la flecha gira para indicar el sentido. */}
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          title={collapsed ? `Ver las ${hosmanData.musicPlatforms.length} plataformas` : 'Recoger'}
          aria-label={
            collapsed ? `Ver las ${hosmanData.musicPlatforms.length} plataformas` : 'Recoger'
          }
          className={BUTTON_CLASS}
        >
          <ChevronIcon open={expanded} />
        </button>
      )}

      {platforms.map(({ name, icon, url }) => {
        const Icon = ICONS[icon];
        return (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={name}
            aria-label={`Escuchar a Hosman Bravo en ${name}`}
            className={`group ${BUTTON_CLASS}`}
          >
            <Icon className={`${ICON_CLASS} transition-colors duration-300`} />
          </a>
        );
      })}

      {/* Los puntos avisan de que la fila continúa; también despliegan. */}
      {collapsed && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={`Ver ${hidden} plataformas más`}
          aria-label={`Ver ${hidden} plataformas más`}
          className={BUTTON_CLASS}
        >
          <EllipsisIcon />
        </button>
      )}
    </div>
  );
}
