'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAudio } from './AudioProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hosmanData } from '@/data/hosman-data';

/** Duración de la salida. Con movimiento reducido se acorta casi a cero. */
const EXIT_MS = 1600;

/** Duración del cierre discreto (X / Escape): sin apertura, solo se retira. */
const DISMISS_MS = 280;

/**
 * Ventana del fundido de salida, en fracción de `EXIT_MS`.
 *
 * Arranca pronto y termina antes que el desplazamiento: al completarse la
 * apertura el telón ya está prácticamente disuelto, en vez de esperar al
 * final y retirarse de golpe. Como el recorrido va con una curva que adelanta
 * la mayor parte del movimiento, al 85% de la animación las cortinas ya están
 * casi del todo fuera, así que el telón se desvanece cuando visualmente ya ha
 * abierto — no antes.
 */
const FADE_START = 0.2;
const FADE_SPAN = 0.65;

/* ---------------------------------------------------------------------------
   MINI-TELÓN DE ACCESO

   Las cinco piezas de `hosmanData.images.curtain` comparten el mismo lienzo de
   2778×1533 y conservan sus coordenadas originales, así que superpuestas al
   100% reconstruyen el telón. Aquí no se recorta, reposiciona ni recrea nada
   con CSS: lo único que hace este componente es apilarlas y desplazar
   horizontalmente las dos traseras.

   YA NO ES UNA PANTALLA COMPLETA. Es un popup flotante: la ruta pedida está
   renderizada, visible y utilizable desde el primer momento, y el telón solo
   ocupa su caja. Su función principal es conseguir el gesto de usuario que el
   navegador exige para reproducir audio.

   · El envoltorio `fixed inset-0` solo centra: es `pointer-events: none`.
     Únicamente la caja del telón captura puntero. Sin bloqueo de scroll, sin
     `inert` sobre la página y sin velo que oscurezca o desenfoque el contenido.
   · La caja tiene la proporción exacta del lienzo (2778/1533 = 1,8121), así
     que el ESCENARIO la llena sin recortar ni deformar, y los recorridos de
     abajo —calibrados en porcentaje del lienzo— valen igual que a pantalla
     completa. Las traseras que salen de la caja quedan recortadas por su
     `overflow-hidden` y escondidas tras el núcleo opaco de las frontales.
   · El telón no tiene fondo propio: por la abertura se ve el DOM real que ya
     está debajo (INICIO, MÚSICA, GALERÍA…). No hay ninguna escena duplicada.

   RECORRIDOS (en % del ancho del lienzo, medidos sobre el canal alfa de los
   propios assets y contrastados con las referencias de `public/references/`):

   · Bordes interiores en reposo: la trasera izquierda termina en el 51,80% y la
     derecha empieza en el 51,44% — se solapan un 0,36%, por eso CLOSED cierra
     sin costura.

   · PEEK ±4,5% deja una abertura del 8,64%; la referencia «telon poco
     abierto» mide 8,67%.

   · OPEN −43% / +42%. NO es simétrico con lo que sugiere medir la referencia
     «telon abierto del todo» (±39,4%): ese borde es el de la pieza FRONTAL en
     su punto de recogido, no el de la trasera. Las frontales solo son 100%
     opacas hasta el 9,72% (izquierda) y desde el 92,80% (derecha), así que con
     ±39,4% las traseras asomarían por sus zonas semitransparentes. Con estos
     valores sus bordes acaban en 8,80% y 93,44%: quedan realmente escondidas
     detrás del núcleo opaco de las frontales, que es lo que se busca — se
     ocultan por desplazamiento, no por desvanecido.

   La interpolación entre CLOSED y OPEN atraviesa por sí sola la composición de
   «telon más abierto» (−12,7% / +11,0%), sin necesidad de un estado propio.
--------------------------------------------------------------------------- */

const CANVAS = { w: 2778, h: 1533 };

const TRAVEL = {
  closed: { left: 0, right: 0 },
  /* 60% del recorrido de PEEK que había antes (±4,5%), a petición de Danny:
     el guiño del hover queda más contenido. Abertura resultante 3,24% en vez
     del 8,64% de la referencia «telon poco abierto». */
  peek: { left: -2.7, right: 2.7 },
  open: { left: -43, right: 42 }
} as const;

/**
 * Rebaja de luz del telón. Los assets vienen con una iluminación bastante
 * alta y el rojo salía demasiado encendido para la estética oscura del resto
 * del sitio.
 *
 * Va sobre el ESCENARIO —el grupo de las cinco capas— y no pieza a pieza: así
 * el tratamiento es matemáticamente idéntico en todas y no puede aparecer un
 * salto de tono en las uniones, que es justo donde se notaría.
 *
 * Es no destructivo: los archivos no se tocan, solo se filtran al pintar.
 * `brightness` hace el trabajo; el `contrast` ligero compensa el aplanado que
 * produce bajar la luz, para que el terciopelo conserve el relieve de los
 * pliegues y el dorado no se apague. Nada de velos negros por encima —
 * matarían el grano del terciopelo— ni de cambios de tono: el rojo sigue
 * siendo el mismo color, solo con menos luz.
 */
const CURTAIN_GRADE = 'brightness(0.76) contrast(1.04)';

/**
 * Tamaño de la caja: una sola regla fluida, sin valores por resolución.
 *
 * Es el MENOR de tres límites, con la proporción del lienzo fija:
 * · `90vw` — en pantallas estrechas deja ver la página a los lados;
 * · `46rem` — en escritorio es un popup, no un telón a pantalla completa;
 * · `(100svh − 2rem) × proporción` — en apaisados bajos nunca desborda en alto.
 */
const BOX_STYLE: React.CSSProperties = {
  width: `min(90vw, 46rem, calc((100svh - 2rem) * ${CANVAS.w} / ${CANVAS.h}))`,
  aspectRatio: `${CANVAS.w} / ${CANVAS.h}`
};

/** El escenario llena la caja, que ya tiene la proporción del lienzo. */
const STAGE_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  filter: CURTAIN_GRADE
};

/** Cada capa llena el escenario por completo. Como la caja ya tiene la
 *  proporción del lienzo, `object-fill` no deforma: no hace falta `cover`. */
const LAYER_CLASS = 'pointer-events-none absolute inset-0 h-full w-full select-none';

function CurtainLayer({
  src,
  z,
  shiftPct,
  duration,
  alt = ''
}: {
  src: string;
  z: number;
  /** Desplazamiento horizontal en % del ancho del escenario. 0 = pieza fija. */
  shiftPct?: number;
  duration?: number;
  alt?: string;
}) {
  const moves = shiftPct !== undefined;
  /* `<img>` y no `next/image`: el proyecto tiene `images.unoptimized`, así que
     `next/image` no optimizaría nada, y en cambio envuelve el elemento, lo que
     estorba aquí — las cinco capas tienen que llenar el escenario al 100% sin
     intermediarios para compartir exactamente el mismo sistema de coordenadas. */
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : 'true'}
      draggable={false}
      className={LAYER_CLASS}
      style={{
        zIndex: z,
        /* `translate3d` y no `left`/`margin`: mantiene la animación en la capa
           de composición, sin recalcular layout en cada frame. */
        transform: moves ? `translate3d(${shiftPct}%, 0, 0)` : undefined,
        transition: moves ? `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)` : undefined,
        willChange: moves ? 'transform' : undefined
      }}
    />
  );
}

/** Altavoz con ondas. Mismo trazado que el `SoundOnIcon` del reproductor
 *  (`TrackPlayer`), copiado aquí para no tocar el reproductor exportándolo. */
function SpeakerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
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
 * Mini-telón de acceso a la web.
 *
 * Existe por una razón concreta además de la estética: los navegadores no
 * permiten reproducir audio sin un gesto previo del usuario, y la pulsación
 * de ENTRAR es ese gesto.
 *
 * TRES SALIDAS, todas de un solo sentido (una vez fuera, no vuelve en toda la
 * carga del documento — `SiteShell` es persistente y conserva el estado):
 *
 * 1. ENTRAR → `enter()` arranca el audio con su fundido y el telón hace la
 *    apertura cinematográfica completa.
 * 2. PLAY PRIMERO — la página es interactiva, así que el reproductor puede
 *    arrancar la canción sin pasar por aquí. En cuanto el audio suena de
 *    verdad (`isPlaying`), la entrada sonora está satisfecha y el telón se
 *    retira con la MISMA apertura. Es puramente visual: no llama a `enter()`,
 *    no toca `currentTime` ni el volumen, así que la canción sigue donde va.
 * 3. X / Escape → se retira con un fundido breve, sin apertura y sin sonido.
 */
export function EntryScreen() {
  const { enter, isPlaying } = useAudio();
  const reducedMotion = useReducedMotion();

  /** Apertura cinematográfica en curso (ENTRAR o primera reproducción). */
  const [leaving, setLeaving] = useState(false);
  /** Cierre discreto en curso (X o Escape). */
  const [closing, setClosing] = useState(false);
  const [gone, setGone] = useState(false);
  /** Solo se activa con hover real de puntero o con foco de teclado; en
   *  táctil no existe y el tap va directo a la apertura completa. */
  const [peeking, setPeeking] = useState(false);

  const exiting = leaving || closing;

  useEffect(() => {
    if (!exiting) return;
    const delay = reducedMotion ? 60 : leaving ? EXIT_MS : DISMISS_MS;
    const timer = window.setTimeout(() => setGone(true), delay);
    return () => window.clearTimeout(timer);
  }, [exiting, leaving, reducedMotion]);

  /* PLAY PRIMERO: la primera reproducción efectiva retira el telón. Se ajusta
     el estado durante el render (patrón de React para derivar estado de una
     prop que cambia) en vez de en un efecto. Si ya se está saliendo —incluido
     el caso ENTRAR, que también pone `isPlaying`— no hace nada. `leaving` no
     vuelve a `false`, así que pausar después no hace volver el telón. */
  if (isPlaying && !exiting && !gone) {
    setLeaving(true);
  }

  const dismiss = useCallback(() => {
    if (exiting) return;
    setPeeking(false);
    setClosing(true);
  }, [exiting]);

  /* Escape cierra sin sonido. Se ignora si hay abierto un diálogo modal de la
     página (hoja de próximos shows, modal de vídeo): ese Escape es suyo. */
  useEffect(() => {
    if (gone || exiting) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
      dismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [gone, exiting, dismiss]);

  if (gone) return null;

  const handleEnter = () => {
    if (exiting) return;
    /* Con un modal abierto (videoclip, hoja de shows) no se arranca la canción
       por detrás: `enter()` no consulta las suspensiones de `AudioProvider`. */
    if (document.querySelector('dialog[open], [aria-modal="true"]')) return;
    setLeaving(true);
    // No se espera al audio: si el navegador lo rechaza, el telón se abre igual.
    void enter();
  };

  /* CLOSED → PEEK (hover/foco) → OPEN (ENTRAR o primera reproducción). La
     apertura manda siempre sobre el hover, para que soltar el ratón a media
     apertura no la aborte. El cierre discreto deja las cortinas como están. */
  const travel = leaving ? TRAVEL.open : peeking && !closing ? TRAVEL.peek : TRAVEL.closed;
  const moveMs = reducedMotion ? 0 : leaving ? EXIT_MS : 620;

  /* Fundido de la caja: largo y solapado con la apertura (ver `FADE_START` /
     `FADE_SPAN`) al entrar; breve y con una leve reducción al cerrar. */
  const boxExitStyle: React.CSSProperties | undefined = reducedMotion
    ? exiting
      ? { opacity: 0, transition: 'opacity 60ms linear' }
      : undefined
    : leaving
      ? {
          opacity: 0,
          transition: `opacity ${Math.round(EXIT_MS * FADE_SPAN)}ms ease-out ${Math.round(
            EXIT_MS * FADE_START
          )}ms`
        }
      : closing
        ? {
            opacity: 0,
            transform: 'scale(0.97)',
            transition: `opacity ${DISMISS_MS}ms ease-out, transform ${DISMISS_MS}ms ease-out`
          }
        : undefined;

  return (
    /* Solo centra. `pointer-events-none`: fuera de la caja la página recibe
       clics, scroll y foco con normalidad.
       `z-[80]`: por encima de la cabecera (`z-50`) y POR DEBAJO de los modales
       de la página (vídeo, `z-[90]`; la hoja de shows va en la capa superior del
       navegador). Ahora que la página es usable con el telón puesto, un
       videoclip puede abrirse antes de entrar, y debe quedar por delante. */
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Entrada a la experiencia"
        aria-hidden={exiting || undefined}
        /* `inert` SOLO sobre la propia caja y solo al salir: ENTRAR y la X dejan
           de ser enfocables y clicables en cuanto empieza cualquier salida. */
        inert={exiting}
        className={`relative overflow-hidden rounded-[3px] shadow-[0_28px_70px_-18px_rgba(0,0,0,0.95),0_0_0_1px_rgba(214,178,110,0.22)] [container-type:inline-size] ${
          exiting ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
        style={{ ...BOX_STYLE, ...boxExitStyle }}
      >
        {/* El telón NO lleva fondo opaco propio: la página real queda por debajo
            y tiene que verse de verdad por la abertura. Las propias piezas son
            semitransparentes en sus zonas oscuras, así que en CLOSED ya se
            intuye lo que hay detrás — es del asset, no un efecto añadido. */}
        <div style={STAGE_STYLE}>
          <CurtainLayer
            src={hosmanData.images.curtain.leftBack}
            z={10}
            shiftPct={travel.left}
            duration={moveMs}
          />
          <CurtainLayer
            src={hosmanData.images.curtain.rightBack}
            z={10}
            shiftPct={travel.right}
            duration={moveMs}
          />

          {/* Marco lateral recogido y galón: fijos, por delante. Son los que
              esconden a las traseras al final del recorrido. */}
          <CurtainLayer src={hosmanData.images.curtain.leftFront} z={20} />
          <CurtainLayer src={hosmanData.images.curtain.rightFront} z={20} />
          <CurtainLayer src={hosmanData.images.curtain.top} z={30} />
        </div>

        {/* BRANDING + ACCESO — por delante del telón, se desvanece al abrir para
            dejar el escenario limpio mientras las cortinas terminan su recorrido.
            Las medidas van en `cqw` de la caja: todo escala con el popup. */}
        <div
          className={`absolute inset-0 z-40 flex flex-col items-center justify-center px-[6cqw] pt-[5cqw] transition-all ease-out ${
            reducedMotion ? 'duration-150' : 'duration-500'
          } ${leaving ? 'pointer-events-none scale-[1.04] opacity-0' : 'scale-100 opacity-100'}`}
        >
          {/* Firma: el logotipo derivado de los contornos vectoriales del manual
              (BRAND.md §3), no texto con una fuente parecida. Sin sombra
              añadida: el manual la prohíbe y el logotipo ya trae la suya.
              `p` y no `h1`: la página que queda detrás ya tiene su propio
              encabezado principal y el popup no debe competir con él. */}
          <p className="w-[46cqw] max-w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hosmanData.images.logo.logotipoDoradoSvg}
              alt="Hosman Bravo"
              width={236}
              height={25}
              className="block h-auto w-full"
            />
          </p>
          <span className="mt-[2.2cqw] h-px w-[14cqw] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

          <button
            type="button"
            onClick={handleEnter}
            onPointerEnter={(e) => {
              // `pointerType` distingue ratón de dedo: en táctil el navegador
              // emite un `enter` sintético justo antes del tap, y sin este
              // filtro el telón haría el gesto de PEEK durante la apertura.
              if (e.pointerType === 'mouse') setPeeking(true);
            }}
            onPointerLeave={() => setPeeking(false)}
            onFocus={() => setPeeking(true)}
            onBlur={() => setPeeking(false)}
            /* Mismo cristal traslúcido del telón a pantalla completa, con las
               medidas pasadas a la escala de la caja (`cqw`) y un suelo para
               que siga siendo legible y pulsable en un móvil. */
            className="mt-[4.5cqw] rounded-full border-2 border-amber-200/45 bg-black/65 px-[max(1rem,4.5cqw)] py-[max(0.55rem,1.9cqw)] text-[max(9px,1.65cqw)] font-bold tracking-[0.28em] text-amber-100/95 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.03] hover:border-amber-400/80 hover:text-amber-300 hover:shadow-[0_0_26px_-4px_rgba(200,150,60,0.55)] focus-visible:border-amber-400/80 focus-visible:text-amber-300 focus-visible:outline-none"
          >
            ENTRAR EN LA EXPERIENCIA
          </button>

          {/* Pista de que al entrar sonará música. Decorativa: el botón ya
              tiene nombre claro y el icono no aporta información accesible. */}
          <SpeakerIcon className="pointer-events-none mt-[1.8cqw] h-[max(11px,2.1cqw)] w-[max(11px,2.1cqw)] text-amber-100/55" />
        </div>

        {/* CERRAR SIN SONIDO — pequeña y secundaria, sobre el marco derecho y bajo
            el galón. Después de ENTRAR en el orden de tabulación. */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar sin activar la música"
          className="absolute right-[2.4cqw] top-[10.5cqw] z-50 flex h-[max(28px,4.4cqw)] w-[max(28px,4.4cqw)] items-center justify-center rounded-full text-amber-100/60 transition-colors duration-200 hover:bg-black/40 hover:text-amber-200 focus-visible:bg-black/40 focus-visible:text-amber-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-amber-300/70"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[55%] w-[55%]">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
