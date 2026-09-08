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
   * Cuándo el bloque se recoge.
   *
   * · `nunca` — la fila completa, sin controles. Es lo que hace INICIO en
   *   escritorio: ahí sobra espacio y las ocho plataformas caben.
   * · `siempre` — recogido en cualquier tamaño. Fuera de la portada la fila
   *   completa se cruzaba con el contenido de la página.
   * · `solo-rail` — recogido únicamente cuando el bloque pasa a ser el rail
   *   vertical derecho y solo caben las cuatro principales. Las demás siguen
   *   accesibles por el mismo desplegable.
   *
   * Lo decide la RUTA, no el viewport: el corte por tamaño lo resuelve el CSS
   * con la variante `rails`, sin que React tenga que leer `innerWidth`.
   */
  colapso?: 'nunca' | 'siempre' | 'solo-rail';
  /**
   * Cuando el pie ya no sostiene los módulos de esquina, el bloque abandona la
   * cabecera y se convierte en el rail derecho, superpuesto al hero. Solo tiene
   * sentido en INICIO — en las demás secciones se cruzaría con el contenido —,
   * así que también lo decide la ruta.
   */
  enRail?: boolean;
}

/**
 * Enlaces a las plataformas de streaming del artista.
 *
 * Una sola fila en la esquina superior derecha mientras hay sitio. Cuando el
 * pie pasa a rails, dentro de INICIO, el mismo bloque se convierte en el rail
 * vertical derecho, superpuesto al hero: es una sola instancia con otra
 * dirección de flujo, no un segundo componente — así no hay dos estados de
 * despliegue que puedan contradecirse.
 *
 * Con `colapso: 'solo-rail'` se renderizan SIEMPRE las ocho y el recorte lo
 * hace el CSS. Es la única forma de que la fila completa siga intacta mientras
 * hay sitio y el rail muestre cuatro, sin que React consulte el tamaño de la
 * ventana.
 */
export function MusicPlatforms({
  colapso = 'nunca',
  enRail = false
}: MusicPlatformsProps) {
  // El llamante remonta el componente al cambiar de sección (con `key`), así
  // que basta con arrancar recogido: no hace falta reiniciar nada a mano.
  const [expanded, setExpanded] = useState(false);

  const recogido = colapso !== 'nunca' && !expanded;
  const soloRail = colapso === 'solo-rail';
  const ocultas = hosmanData.musicPlatforms.length - COLLAPSED_COUNT;

  /* Cuando el recorte es responsabilidad del CSS, los controles existen en el
     DOM pero solo se ven en la composición móvil. `display:none` los saca
     también del árbol de accesibilidad, así que en escritorio no hay un botón
     «ver más» invisible esperando al tabulador. */
  const claseControl = soloRail ? `hidden rails:flex ${BUTTON_CLASS}` : BUTTON_CLASS;

  return (
    <div
      className={`flex items-center ${ROW_GAP} ${
        enRail
          ? // `max-height` + scroll interno: el rail es `fixed`, así que si al
            // desplegarse las ocho plataformas midieran más que la pantalla,
            // sus extremos quedarían fuera y NO habría forma de alcanzarlos —
            // desplazar el documento no mueve un elemento fijo. Con 9 controles
            // de 36px hacen falta 356px, y una pantalla baja tiene 320-390.
            'rails:fixed rails:right-[var(--hb-rail-inset)] rails:top-1/2 rails:z-40 rails:max-h-[calc(100svh-1.5rem)] rails:-translate-y-1/2 rails:flex-col rails:overflow-y-auto rails:overscroll-contain'
          : 'rails:flex-wrap rails:justify-end'
      }`}
    >
      {/* Abre y cierra la fila; la flecha gira para indicar el sentido. */}
      {colapso !== 'nunca' && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          title={recogido ? `Ver las ${hosmanData.musicPlatforms.length} plataformas` : 'Recoger'}
          aria-label={
            recogido ? `Ver las ${hosmanData.musicPlatforms.length} plataformas` : 'Recoger'
          }
          className={claseControl}
        >
          <ChevronIcon open={expanded} />
        </button>
      )}

      {hosmanData.musicPlatforms.map(({ name, icon, url }, i) => {
        const Icon = ICONS[icon];
        const sobrante = recogido && i >= COLLAPSED_COUNT;
        // Con `siempre` el recorte es real (no se renderiza); con `solo-rail`
        // lo hace el CSS, para que escritorio conserve la fila completa.
        if (sobrante && !soloRail) return null;
        return (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={name}
            aria-label={`Escuchar a Hosman Bravo en ${name}`}
            className={`group ${BUTTON_CLASS} ${sobrante ? 'rails:hidden' : ''}`}
          >
            <Icon className={`${ICON_CLASS} transition-colors duration-300`} />
          </a>
        );
      })}

      {/* Los puntos avisan de que la fila continúa; también despliegan. */}
      {recogido && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={`Ver ${ocultas} plataformas más`}
          aria-label={`Ver ${ocultas} plataformas más`}
          className={claseControl}
        >
          <EllipsisIcon />
        </button>
      )}
    </div>
  );
}
