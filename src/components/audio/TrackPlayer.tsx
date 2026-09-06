'use client';

import {
  Equalizer,
  LEATHER,
  PauseIcon,
  PlayIcon,
  useControlDeSonido,
  type IconProps
} from './playerParts';
import { hosmanData } from '@/data/hosman-data';
import { SpotifyIcon } from '../icons/PlatformIcons';
import { YouTubeIcon } from '../icons/SocialIcons';

/** Altavoz con ondas: el sonido está activo. */
function SoundOnIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M15.4 9.2a4 4 0 0 1 0 5.6M18 6.8a7.4 7.4 0 0 1 0 10.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Altavoz tachado por una diagonal de lado a lado.
 *
 * A 12 px las aspas pequeñas junto al altavoz no se distinguen, así que la
 * barra cruza el icono entero. Debajo lleva un trazo del color del fondo que
 * la separa del altavoz y la mantiene legible.
 */
function SoundOffIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} style={style}>
      <path
        d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4Z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M15.4 9.2a4 4 0 0 1 0 5.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M3.5 20.5 20.5 3.5" stroke="#0D0D0F" strokeWidth="3.4" strokeLinecap="round" />
      <path
        d="M3.5 20.5 20.5 3.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Filete dorado que se apaga hacia los extremos. */
function Divider() {
  return (
    <span
      aria-hidden="true"
      className="block h-px w-full bg-gradient-to-l from-transparent via-[#D4AF37]/35 to-transparent"
    />
  );
}

/* ---------------------------------------------------------------------------
   Medidas internas en `cqw` (1cqw = 1% del ancho del reproductor, que fija
   `--hb-player-w`). Calibradas contra el ancho aprobado en 2048×1023 —300px—
   de modo que a ese tamaño devuelven exactamente los píxeles ya validados.

   Este componente era el que peor llevaba el viewport corto: no tenía ni una
   sola clase responsive, así que en 1280×591 seguía midiendo lo pensado para
   1023px de alto. Con el ancho declarado como token, todo el interior escala
   con él sin necesidad de un solo breakpoint.

   Cada valor lleva su propio suelo: el bloque encoge, pero el título, los
   rótulos y el área de pulsación del play se detienen en cuanto llegan a su
   límite de lectura o de uso.
--------------------------------------------------------------------------- */
const P = {
  label: 'max(8px, 3cqw)', /* 9px  */
  labelSmall: 'max(7px, 2.67cqw)', /* 8px  */
  soundIcon: 'max(10px, 4cqw)', /* 12px */
  playSize: 'max(40px, 18cqw)', /* 54px */
  playIcon: 'max(14px, 6.33cqw)', /* 19px */
  title: 'max(16px, 7cqw)', /* 21px */
  artist: 'max(9px, 3.33cqw)', /* 10px */
  ctaText: 'max(9px, 3.33cqw)', /* 10px */
  ctaIcon: 'max(10px, 4cqw)', /* 12px */
  ctaPaddingX: 'max(8px, 4cqw)', /* 12px */
  ctaPaddingY: 'max(5px, 2.67cqw)' /* 8px  */
} as const;

const CTA_CLASS =
  'group flex items-center gap-2 rounded-md border border-[#D4AF37]/30 font-semibold tracking-[0.14em] text-[#F2EEE8]/80 shadow-[inset_0_1px_0_rgba(242,238,232,0.05)] transition-all duration-300 ease-out hover:-translate-y-px hover:scale-[1.02] hover:border-[#D4AF37]/75 hover:text-[#D4AF37] hover:brightness-125 hover:shadow-[0_0_16px_-4px_rgba(212,175,55,0.5),inset_0_1px_0_rgba(242,238,232,0.08)] focus-visible:border-[#D4AF37]/75 focus-visible:text-[#D4AF37] focus-visible:outline-none';

const CTA_STYLE: React.CSSProperties = {
  fontSize: P.ctaText,
  paddingInline: P.ctaPaddingX,
  paddingBlock: P.ctaPaddingY
};

/**
 * Separación entre los 4 bloques verticales (encabezado, filete, fila de
 * play+info, filete): la causa real del "demasiado espacio" reportado.
 *
 * NO puede ir en `cqw` como el resto de `P`: `container-type: inline-size` da
 * contexto de contenedor a los DESCENDIENTES del elemento que lo declara, no
 * al elemento mismo — un `cqw` en una propiedad del propio contenedor no
 * tiene contenedor de referencia y cae al viewport. Medido: a 2048px de
 * ancho de VENTANA (no del reproductor, que mide 300px), `max(7px, 3.33cqw)`
 * devolvía 68px en vez de ~10px — de ahí que el wrapper midiera 347px con
 * la mitad vacía. Aquí se deriva directamente de `--hb-player-w` (el ancho
 * real, no el viewport), que si es descendiente-de-sí-mismo por `calc()` sí
 * resuelve bien. Resultado idéntico al gap original aprobado (`gap-2.5` =
 * 10px fijo) en 2048×1023, y sigue encogiendo con el propio ancho del
 * reproductor por debajo de eso. */
const PLAYER_GAP = 'max(7px, calc(var(--hb-player-w) * 0.0333))'; /* 10px sobre 300 */

/**
 * Reproductor del último lanzamiento, sobre los iconos de plataformas.
 *
 * No tiene audio propio: se limita a mandar sobre el que ya gobierna
 * `AudioProvider`, de modo que no hay estado duplicado ni un segundo
 * elemento de sonido.
 */
export function TrackPlayer() {
  /* Todo el estado sale de `AudioProvider` a través del hook compartido: es el
     mismo del que tira el reproductor compacto de móvil, así que los dos no
     pueden contradecirse aunque estén los dos montados. */
  const { sonando: soundingOut, animar: animate, alternar: toggleSound, track } =
    useControlDeSonido();

  const artist = hosmanData.artist.name
    .split(' ')
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(' ');

  /* El ancho ya no lo marca el contenido sino el token `--hb-player-w`, y de
     ese ancho cuelga todo el interior vía `cqw` (`container-type`). El título
     no se recorta —no lleva `truncate`—: si no cabe, reparte en dos líneas. */
  return (
    <div
      className="flex w-[var(--hb-player-w)] flex-col [container-type:inline-size]"
      style={{ gap: PLAYER_GAP }}
    >
      {/* Encabezado: rótulo de sección y control de sonido */}
      <div className="flex items-center justify-between gap-3">
        <span
          className="font-semibold tracking-[0.26em] text-[#D4AF37]/85"
          style={{ fontSize: P.label }}
        >
          ÚLTIMO LANZAMIENTO
        </span>
        <button
          type="button"
          onClick={toggleSound}
          aria-pressed={soundingOut}
          title={soundingOut ? 'Silenciar' : 'Activar sonido'}
          className="flex shrink-0 items-center gap-1.5 font-medium tracking-[0.16em] text-[#F2EEE8]/40 transition-colors duration-300 hover:text-[#D4AF37] focus-visible:text-[#D4AF37] focus-visible:outline-none"
          style={{ fontSize: P.labelSmall }}
        >
          {soundingOut ? (
            <SoundOnIcon style={{ width: P.soundIcon, height: P.soundIcon }} />
          ) : (
            <SoundOffIcon style={{ width: P.soundIcon, height: P.soundIcon }} />
          )}
          {soundingOut ? 'SOUND ON' : 'SOUND OFF'}
        </button>
      </div>

      <Divider />

      {/* Dos columnas: la acción principal a la izquierda, el contenido a la
          derecha. Los enlaces arrancan en la misma vertical que el título. */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundingOut ? 'Pausar' : 'Reproducir'}
          title={soundingOut ? 'Pausar' : 'Reproducir'}
          style={{
            width: P.playSize,
            height: P.playSize,
            ...(animate ? { animation: 'hb-breathe 2.8s ease-out infinite' } : null)
          }}
          className="mt-0.5 flex shrink-0 items-center justify-center rounded-full border border-[#D4AF37]/40 bg-black/45 text-[#D4AF37]/90 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-[1.04] hover:border-[#D4AF37]/85 hover:bg-black/65 hover:text-[#D4AF37] focus-visible:border-[#D4AF37]/85 focus-visible:outline-none"
        >
          {soundingOut ? (
            <PauseIcon style={{ width: P.playIcon, height: P.playIcon }} />
          ) : (
            <PlayIcon className="ml-[2px]" style={{ width: P.playIcon, height: P.playIcon }} />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h2
            className="font-black leading-none tracking-wide text-[#F2EEE8] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
            style={{ fontSize: P.title }}
          >
            {track.title.toUpperCase()}
          </h2>

          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span
              className="tracking-[0.12em] text-[#F2EEE8]/45"
              style={{ fontSize: P.artist }}
            >
              {artist}
            </span>
            <Equalizer active={animate} className="h-4" />
          </div>

          {/* Acciones principales. Cada una se oculta si aún no tiene destino. */}
          {(track.youtubeUrl || track.spotifyUrl) && (
            <div className="mt-3 flex flex-col gap-1.5">
              {track.youtubeUrl && (
                <a
                  href={track.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Ver el vídeo oficial de ${track.title} en YouTube`}
                  style={{ ...LEATHER, ...CTA_STYLE }}
                  className={CTA_CLASS}
                >
                  <YouTubeIcon
                    className="shrink-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ width: P.ctaIcon, height: P.ctaIcon }}
                  />
                  VER VIDEO OFICIAL
                </a>
              )}
              {track.spotifyUrl && (
                <a
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Escuchar ${track.title} en Spotify`}
                  style={{ ...LEATHER, ...CTA_STYLE }}
                  className={CTA_CLASS}
                >
                  <SpotifyIcon
                    className="shrink-0 opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ width: P.ctaIcon, height: P.ctaIcon }}
                  />
                  ESCUCHAR EN SPOTIFY
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <Divider />
    </div>
  );
}
