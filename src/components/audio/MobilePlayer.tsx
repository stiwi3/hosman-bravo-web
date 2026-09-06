'use client';

import { Equalizer, LEATHER, PauseIcon, PlayIcon, useControlDeSonido } from './playerParts';
import { SpotifyIcon } from '../icons/PlatformIcons';
import { YouTubeIcon } from '../icons/SocialIcons';

/* ---------------------------------------------------------------------------
   REPRODUCTOR COMPACTO — la mitad derecha de la barra superior en móvil.

   NO es el `TrackPlayer` encogido: es otra composición. Convive con el menú de
   cuero en UNA sola fila, así que solo puede llevar lo imprescindible —el
   nombre de la canción y las dos acciones— y el ecualizador deja de ser un
   indicador aparte para integrarse alrededor del propio botón de play.

   Fuera quedan, a propósito: el nombre del artista (ya está en el menú y en el
   rótulo del hero), el rótulo «ÚLTIMO LANZAMIENTO», el control «SOUND ON/OFF»
   separado —el play ya gobierna el sonido— y el resto de plataformas, que en
   móvil viven en el rail derecho.

   El estado sale entero de `useControlDeSonido`, es decir de `AudioProvider`:
   este componente no tiene ni un `useState`. Por eso los dos reproductores no
   pueden contradecirse aunque estén los dos montados.
--------------------------------------------------------------------------- */

/* ANCHO MÁXIMO DEL BLOQUE.
   No es decorativo: todo el interior se mide en `cqw` contra este bloque, así
   que sin tope el reproductor crece con el hueco que le quede en la fila. En
   móvil apaisado (844px de ancho) el hueco es enorme y la cabecera llegó a
   medir 299px —el 77% de la pantalla— con un título de 56px. El tope mantiene
   el contenedor dentro del rango para el que están calibradas las medidas de
   abajo, y en un teléfono vertical no llega a activarse: ahí el menú ya deja
   menos de esto. */
const ANCHO_MAX = 'min(100%, 15rem)';

/* Medidas internas en `cqw` sobre el ancho REAL del bloque (lo fija
   `container-type: inline-size` abajo), no sobre el viewport: el reproductor
   ocupa lo que le deje el menú en la fila, y eso no es una fracción de la
   pantalla. Calibradas sobre ~225px, que es lo que queda en un teléfono de
   390. Cada valor lleva su suelo de legibilidad o de área pulsable. */
const P = {
  titulo: 'max(9px, 4.6cqw)', /* 10 px */
  cta: 'max(6.5px, 3.4cqw)', /* 7,7 px */
  ctaIcono: 'max(9px, 4.4cqw)', /* 10 px */
  ctaPadX: 'max(4px, 2.6cqw)', /* 6 px */
  ctaPadY: 'max(2px, 1.5cqw)', /* 3,4 px */
  play: 'max(38px, 19cqw)', /* 43 px */
  playIcono: 'max(13px, 7cqw)' /* 16 px */
} as const;

const CTA_CLASS =
  'group flex items-center gap-1.5 rounded-md border border-[#D4AF37]/30 font-semibold tracking-[0.1em] text-[#F2EEE8]/80 transition-colors duration-300 hover:border-[#D4AF37]/75 hover:text-[#D4AF37] focus-visible:border-[#D4AF37]/75 focus-visible:text-[#D4AF37] focus-visible:outline-none';

const CTA_STYLE: React.CSSProperties = {
  ...LEATHER,
  fontSize: P.cta,
  paddingInline: P.ctaPadX,
  paddingBlock: P.ctaPadY
};

export function MobilePlayer() {
  const { sonando, animar, alternar, track } = useControlDeSonido();

  return (
    <div
      className="ml-auto flex min-w-0 items-center justify-end gap-2 [container-type:inline-size]"
      style={{ width: ANCHO_MAX }}
    >
      <div className="flex min-w-0 flex-col items-stretch gap-1">
        {/* `<p>` y no `<h2>`: el encabezado de la canción lo pone el
            reproductor de escritorio, y los dos están en el DOM a la vez. El
            que no toca queda en `display:none`, que sí lo saca del árbol de
            accesibilidad — pero solo uno debe ser encabezado. */}
        <p
          className="truncate font-black leading-none tracking-wide text-[#F2EEE8] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
          style={{ fontSize: P.titulo }}
        >
          {track.title.toUpperCase()}
        </p>

        {track.youtubeUrl && (
          <a
            href={track.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Ver el videoclip de ${track.title} en YouTube`}
            style={CTA_STYLE}
            className={CTA_CLASS}
          >
            <YouTubeIcon
              className="shrink-0 opacity-80"
              style={{ width: P.ctaIcono, height: P.ctaIcono }}
            />
            VER VIDEOCLIP
          </a>
        )}

        {track.spotifyUrl && (
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Escuchar ${track.title} en Spotify`}
            style={CTA_STYLE}
            className={CTA_CLASS}
          >
            <SpotifyIcon
              className="shrink-0 opacity-80"
              style={{ width: P.ctaIcono, height: P.ctaIcono }}
            />
            ESCUCHAR EN SPOTIFY
          </a>
        )}
      </div>

      {/* PLAY CON EL ECUALIZADOR INTEGRADO.
          Las barras van DETRÁS del botón, desbordando por los dos lados: es lo
          que convierte dos controles en uno solo. Al no estar sonando quedan
          planas y apenas se leen, así que el botón no pierde legibilidad. */}
      <div className="relative flex shrink-0 items-center justify-center">
        <Equalizer
          active={animar}
          scale={1.9}
          barWidth="2px"
          gap="4px"
          className="pointer-events-none absolute inset-0 justify-center opacity-45"
        />
        <button
          type="button"
          onClick={alternar}
          aria-label={sonando ? 'Pausar' : 'Reproducir'}
          title={sonando ? 'Pausar' : 'Reproducir'}
          style={{ width: P.play, height: P.play }}
          className="relative flex items-center justify-center rounded-full border border-[#D4AF37]/45 bg-black/60 text-[#D4AF37]/90 backdrop-blur-sm transition-colors duration-300 hover:border-[#D4AF37]/85 hover:text-[#D4AF37] focus-visible:border-[#D4AF37]/85 focus-visible:outline-none"
        >
          {sonando ? (
            <PauseIcon style={{ width: P.playIcono, height: P.playIcono }} />
          ) : (
            <PlayIcon className="ml-[2px]" style={{ width: P.playIcono, height: P.playIcono }} />
          )}
        </button>
      </div>
    </div>
  );
}
