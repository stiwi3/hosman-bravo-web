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

const BUTTON_CLASS =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200/25 bg-black/50 text-amber-100/70 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105 hover:border-amber-400/70 hover:bg-black/70 hover:text-amber-300 hover:shadow-[0_0_14px_-2px_rgba(200,150,60,0.45)] focus-visible:scale-105 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none sm:h-11 sm:w-11 md:h-12 md:w-12';

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`h-4 w-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
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
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4">
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
          ? 'flex items-center gap-1.5 sm:gap-2'
          : 'grid grid-cols-4 gap-1.5 sm:gap-2 md:flex md:gap-2'
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
            <Icon className="h-[18px] w-[18px] transition-colors duration-300 sm:h-5 sm:w-5" />
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
