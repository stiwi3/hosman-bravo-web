'use client';

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

/**
 * Enlaces a las plataformas de streaming del artista.
 *
 * En escritorio forman una sola fila en la esquina superior derecha; en
 * pantallas estrechas pasan a una rejilla de cuatro columnas situada bajo la
 * cabecera, para no cruzarse con la navegación central.
 */
export function MusicPlatforms() {
  return (
    <div className="grid grid-cols-4 gap-1.5 sm:gap-2 md:flex md:gap-2">
      {hosmanData.musicPlatforms.map(({ name, icon, url }) => {
        const Icon = ICONS[icon];
        return (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={name}
            aria-label={`Escuchar a Hosman Bravo en ${name}`}
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/25 bg-black/50 text-amber-100/70 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105 hover:border-amber-400/70 hover:bg-black/70 hover:text-amber-300 hover:shadow-[0_0_14px_-2px_rgba(200,150,60,0.45)] focus-visible:scale-105 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none sm:h-11 sm:w-11 md:h-12 md:w-12"
          >
            <Icon className="h-[18px] w-[18px] transition-colors duration-300 sm:h-5 sm:w-5" />
          </a>
        );
      })}
    </div>
  );
}
