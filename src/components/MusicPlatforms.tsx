'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const sinSuscripcion = () => () => {};
const buscarCapaRails = () => document.querySelector<HTMLElement>('[data-hb-capa-rails]');
const sinCapaEnServidor = () => null;
import { hosmanData } from '@/data/hosman-data';
import { useAutoRecoger } from '@/hooks/useAutoRecoger';
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

/* Iconos y separación, derivados del mismo token con su propio suelo. El glifo
   ocupa ahora el 50% del botón (antes el 42%): la mayor parte del aumento de
   tamaño va aquí dentro, para que el icono se lea más grande sin que el rail
   crezca en proporción. */
const ICON_CLASS = 'h-[max(17px,calc(var(--hb-control)*0.5))] w-[max(17px,calc(var(--hb-control)*0.5))]';
const AFFORDANCE_CLASS = 'h-[max(14px,calc(var(--hb-control)*0.36))] w-[max(14px,calc(var(--hb-control)*0.36))]';
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
   * · `nunca` — todas las plataformas, sin controles.
   * · `siempre` — cuatro principales + desplegable. Es lo que usa la cabecera
   *   de las demás secciones.
   *
   * El rail de INICIO no lo lee: ahí se recoge solo cuando las ocho no caben
   * (ver `RailPlataformas`).
   */
  colapso?: 'nunca' | 'siempre';
  /**
   * RAIL DERECHO DE INICIO, vertical y superpuesto al hero en TODAS las
   * composiciones. Fuera de INICIO el bloque sigue siendo una fila en la
   * cabecera, porque ahí un rail se cruzaría con el contenido de la página.
   */
  enRail?: boolean;
}

/**
 * Enlaces a las plataformas de streaming del artista. Spotify primero, y el
 * resto en el orden de `hosmanData.musicPlatforms`.
 *
 * Es una sola instancia —la de la cabecera persistente— con dos presentaciones
 * según la ruta, no dos componentes: así no hay dos estados de despliegue que
 * puedan contradecirse.
 */
export function MusicPlatforms({
  colapso = 'nunca',
  enRail = false
}: MusicPlatformsProps) {
  // El llamante remonta el componente al cambiar de sección (con `key`), así
  // que basta con arrancar recogido: no hace falta reiniciar nada a mano.
  const [expanded, setExpanded] = useState(false);
  // La escena de INICIO está siempre montada (la conserva `SiteShell`), así que
  // basta con localizarla; no hay nada a lo que suscribirse.
  const capaRails = useSyncExternalStore(sinSuscripcion, buscarCapaRails, sinCapaEnServidor);

  const recogido = colapso !== 'nunca' && !expanded;
  const ocultas = hosmanData.musicPlatforms.length - COLLAPSED_COUNT;

  const botones = (
    <>
      {/* Abre y cierra el bloque; la flecha gira para indicar el sentido. */}
      {colapso !== 'nunca' && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          title={recogido ? `Ver las ${hosmanData.musicPlatforms.length} plataformas` : 'Recoger'}
          aria-label={
            recogido ? `Ver las ${hosmanData.musicPlatforms.length} plataformas` : 'Recoger'
          }
          className={BUTTON_CLASS}
        >
          <ChevronIcon open={expanded} />
        </button>
      )}

      {hosmanData.musicPlatforms.map(({ name, icon, url }, i) => {
        if (recogido && i >= COLLAPSED_COUNT) return null;
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

      {/* Los puntos avisan de que el bloque continúa; también despliegan. */}
      {recogido && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title={`Ver ${ocultas} plataformas más`}
          aria-label={`Ver ${ocultas} plataformas más`}
          className={BUTTON_CLASS}
        >
          <EllipsisIcon />
        </button>
      )}
    </>
  );

  /* El rail NO se pinta en la cabecera, que es `fixed`: se lleva por portal a
     la escena de INICIO (`data-hb-capa-rails`) para desplazarse con ella
     cuando supera la pantalla, igual que el rail de redes. Antes de hidratar
     no hay escena que buscar y no se pinta nada. */
  if (enRail) return capaRails ? createPortal(<RailPlataformas />, capaRails) : null;

  return <div className={`flex items-center ${ROW_GAP} rails:flex-wrap rails:justify-end`}>{botones}</div>;
}

/* Botón del rail: el mismo aspecto que `BUTTON_CLASS`, pero su tamaño sale de
   `--hb-plat-btn` (ver el comentario del rail), que puede encoger por debajo
   de `--hb-control` cuando la banda no da para más. */
const RAIL_BUTTON_CLASS = BUTTON_CLASS.replace(
  'h-[var(--hb-control)] w-[var(--hb-control)]',
  'h-[var(--hb-plat-btn)] w-[var(--hb-plat-btn)]',
);
const RAIL_ICON_CLASS = 'h-[calc(var(--hb-plat-btn)*0.5)] w-[calc(var(--hb-plat-btn)*0.5)]';
const RAIL_AFFORDANCE_CLASS = 'h-[calc(var(--hb-plat-btn)*0.36)] w-[calc(var(--hb-plat-btn)*0.36)]';

/**
 * RAIL DERECHO DE INICIO. Nunca tiene scroll propio, en ningún estado.
 *
 * Separa dos cosas que antes iban mezcladas en un solo `expanded`:
 *
 * · `caben` — DISPONIBILIDAD FÍSICA. ¿Entran las ocho en columna, a su tamaño
 *   normal, en la banda? Lo decide la geometría, no el usuario. Si caben, se
 *   ven las ocho y no hay control.
 * · `expandido` — ESTADO MANUAL. Solo existe cuando no caben: cuatro + un
 *   control abajo, que despliega las ocho en 2 columnas × 4 filas y pasa a
 *   ser el de recoger.
 */
function RailPlataformas() {
  const total = hosmanData.musicPlatforms.length;
  const bandaRef = useRef<HTMLDivElement>(null);
  const reglaRef = useRef<HTMLDivElement>(null);
  const [caben, setCaben] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const { handlers, programar, cancelar } = useAutoRecoger(!caben && expandido, setExpandido);

  /* CÓMO SE SABE SI CABEN. La banda tiene alto propio (la fijan `top` y
     `bottom`, no su contenido), y la REGLA es una caja invisible con el alto
     exacto de las ocho en columna: `8 × --hb-control + 7 × hueco`. Comparar
     las dos cajas es la medida entera; la fórmula vive en CSS, junto a los
     tokens de los que depende, y JS solo compara.

     No hay bucle: lo que se pinta dentro no cambia el alto de la banda, y la
     banda está fuera del flujo de la cabecera que mide `SiteShell`.

     `resize` acompaña al `ResizeObserver` porque el alto de la banda depende
     también de `svh` y de `--hb-header-real-h`, y conviene no depender de un
     solo aviso. */
  useEffect(() => {
    const banda = bandaRef.current;
    const regla = reglaRef.current;
    if (!banda || !regla) return;
    const medir = () => {
      const ok = regla.offsetHeight <= banda.clientHeight;
      setCaben(ok);
      // Al recuperar espacio se vuelve al estado natural; si luego falta otra
      // vez, se entra recogido, no desplegado de una vez anterior.
      if (ok) {
        setExpandido(false);
        cancelar();
      }
    };
    const observer = new ResizeObserver(medir);
    observer.observe(banda);
    observer.observe(regla);
    window.addEventListener('resize', medir);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [cancelar]);

  const abierto = !caben && expandido;
  const visibles = caben || abierto ? hosmanData.musicPlatforms : hosmanData.musicPlatforms.slice(0, COLLAPSED_COUNT);

  const alternar = () => {
    if (abierto) {
      cancelar();
      setExpandido(false);
      return;
    }
    setExpandido(true);
    // Con ratón el puntero está encima y no arranca nada; con un toque, el
    // `pointerleave` ya pasó antes del clic, así que la cuenta empieza aquí.
    programar();
  };

  /* EL RAIL. Dos capas con dos trabajos:

     · la BANDA (fija, transparente, sin eventos) ocupa la franja vertical
       libre de su lateral —bajo el reproductor, sobre el isotipo— y centra el
       rail dentro con `justify-content: safe center`. Es además el contenedor
       de tamaño (`container-type: size`) del que el rail lee su alto. Su
       ancho es el de las dos columnas del estado desplegado, para que ese
       estado no cambie la geometría de la que dependen las medidas;
     · el GRUPO (con eventos) va sin `overflow` y sin `max-height`: no puede
       generar scroll porque su tamaño ya se calcula para caber.

     TAMAÑO. `--hb-plat-btn` es `--hb-control` mientras quepa, y si no, lo que
     deja la banda para CINCO filas: las cuatro plataformas y el control, que
     mide 0,75 de botón (`100cqh − 4 huecos) / 4,75`). El estado desplegado
     usa exactamente esas mismas cinco filas —2 × 4 más el control—, así que
     desplegar no pide ni un píxel más de alto. El hueco también encoge
     (`2,5cqh`) y hay un suelo de 28px por debajo del cual no se sigue
     reduciendo. Con las ocho en columna la fórmula da siempre `--hb-control`:
     si caben, hay alto de sobra para cinco filas.

     DÓNDE EMPIEZA Y ACABA LA BANDA. En la composición abierta, con los tokens
     de siempre. En la compacta y en móvil, con los límites REALES que publica
     el coordinador de `HeroScene` (`useGeometriaPeriferica`): arriba, el borde
     inferior del reproductor; abajo, lo que ocupe el bloque inferior de la
     escena. Este rail solo los lee: nada de lo que hace vuelve a esas medidas.
     Los valores de reserva son los tokens, para el primer fotograma. */
  return (
    <div
      ref={bandaRef}
      className="pointer-events-none absolute right-[var(--hb-rail-inset)] top-[var(--hb-lim-sup-dcha,var(--hb-rail-dcha-arriba))] h-[max(0px,calc(var(--hb-lim-inf-dcha,100svh)-var(--hb-lim-sup-dcha,var(--hb-rail-dcha-arriba))))] z-40 flex w-[calc(2*var(--hb-control)+0.5rem)] flex-col items-end [container-type:size] [justify-content:safe_center] [--hb-plat-gap:clamp(0.25rem,0.8svh,0.5rem)] abierta:top-[var(--hb-rail-dcha-arriba)] abierta:bottom-[var(--hb-rail-dcha-abajo)] abierta:h-auto"
    >
      {/* Envoltorio de alto 0 recortado: la regla mide la columna de las ocho y
          en una banda baja sobresalía de la escena, lo que añadía scroll. */}
      <div aria-hidden="true" className="invisible absolute right-0 top-0 h-0 w-px overflow-hidden">
        <div
          ref={reglaRef}
          className="w-px"
          style={{ height: `calc(${total} * var(--hb-control) + ${total - 1} * var(--hb-plat-gap))` }}
        />
      </div>
      <div
        {...handlers}
        className={`pointer-events-auto grid justify-items-center gap-[var(--hb-plat-hueco)] [--hb-plat-hueco:min(var(--hb-plat-gap),2.5cqh)] [--hb-plat-btn:max(var(--hb-control-min),min(var(--hb-control),calc((100cqh-4*var(--hb-plat-hueco))/4.75)))] ${
          abierto ? 'grid-cols-[repeat(2,var(--hb-plat-btn))]' : 'grid-cols-[var(--hb-plat-btn)]'
        }`}
      >
        {visibles.map(({ name, icon, url }, i) => {
          const Icon = ICONS[icon];
          return (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={name}
              aria-label={`Escuchar a Hosman Bravo en ${name}`}
              // Desplegado, las cuatro principales siguen en SU columna y a
              // su altura —la derecha, la del rail— y las otras cuatro se
              // abren a la izquierda: nada se mueve bajo el dedo.
              style={abierto ? { gridColumn: i < COLLAPSED_COUNT ? 2 : 1, gridRow: (i % COLLAPSED_COUNT) + 1 } : undefined}
              className={`group ${RAIL_BUTTON_CLASS}`}
            >
              <Icon className={`${RAIL_ICON_CLASS} transition-colors duration-300`} />
            </a>
          );
        })}

        {!caben && (
          <button
            type="button"
            onClick={alternar}
            aria-expanded={abierto}
            title={abierto ? 'Recoger' : `Ver las ${total} plataformas`}
            aria-label={abierto ? 'Recoger' : `Ver las ${total} plataformas`}
            style={abierto ? { gridColumn: 2, gridRow: COLLAPSED_COUNT + 1 } : undefined}
            className={RAIL_BUTTON_CLASS.replace(
              'h-[var(--hb-plat-btn)]',
              'h-[calc(var(--hb-plat-btn)*0.75)]',
            )}
          >
            {/* Cerrado apunta a la izquierda, hacia donde se abre la segunda
                columna; abierto gira y apunta de vuelta. */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className={`${RAIL_AFFORDANCE_CLASS} transition-transform duration-300 ${abierto ? 'rotate-180' : ''}`}
            >
              <path d="M14.5 5.5 8 12l6.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
