'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSelectedLayoutSegment } from 'next/navigation';
import { useAudio } from './AudioProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useScrollLock } from '@/hooks/useScrollLock';
import { hosmanData } from '@/data/hosman-data';
import { DIRECT_ENTRY_SECTIONS, type SectionId } from '@/data/types';

/** Duración de la salida. Con movimiento reducido se acorta casi a cero. */
const EXIT_MS = 1600;

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
   TELÓN DE ACCESO

   Las cinco piezas de `hosmanData.images.curtain` comparten el mismo lienzo de
   2778×1533 y conservan sus coordenadas originales, así que superpuestas al
   100% reconstruyen el telón. Aquí no se recorta, reposiciona ni recrea nada
   con CSS: lo único que hace este componente es apilarlas y desplazar
   horizontalmente las dos traseras.

   ESCALADO EN CUALQUIER PROPORCIÓN DE PANTALLA
   El «escenario» (`stage`) es una caja con la proporción exacta del lienzo
   (2778/1533 = 1,8121) dimensionada como un `object-fit: cover` hecho a mano:
   toma el mayor entre el viewport y lo que exige la otra dimensión, así que
   siempre cubre los dos ejes sin dejar franjas y sin deformar nada. Se centra
   y lo que sobra se recorta con el `overflow-hidden` del contenedor fijo.

   Que las capas se midan contra el ESCENARIO y no contra el viewport es lo que
   hace que los recorridos de abajo —calibrados en porcentaje del lienzo— valgan
   igual en 21:9 que en 4:3.

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

/** Caja con la proporción del lienzo que siempre cubre el viewport entero.
 *  Es el equivalente en CSS de `object-fit: cover`, pero aplicado al grupo de
 *  las cinco capas a la vez para que compartan escala y origen. */
const STAGE_STYLE: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  width: `max(100vw, calc(100svh * ${CANVAS.w} / ${CANVAS.h}))`,
  height: `max(100svh, calc(100vw * ${CANVAS.h} / ${CANVAS.w}))`,
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

/**
 * Portada de acceso a la web.
 *
 * Existe por una razón concreta además de la estética: los navegadores no
 * permiten reproducir audio sin un gesto previo del usuario, y la pulsación
 * del acceso es ese gesto.
 */
export function EntryScreen() {
  const { enter } = useAudio();
  const reducedMotion = useReducedMotion();
  const router = useRouter();

  /* `useSelectedLayoutSegment` y no `usePathname`: lee el árbol de rutas y no
     la cadena de URL, así que no le afecta el `basePath` de GitHub Pages.
     Devuelve `null` cuando la ruta es `/`. */
  const segment = useSelectedLayoutSegment();
  const isHome = segment === null;
  const staysOnRoute =
    isHome || DIRECT_ENTRY_SECTIONS.includes(segment as SectionId);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);
  /** Solo se activa con hover real de puntero; en táctil no existe y el tap
   *  va directo a la apertura completa. */
  const [peeking, setPeeking] = useState(false);

  /* Mientras la portada está visible no debe poder desplazarse la página.
     El bloqueo pasa por `useScrollLock` —y no por un `body.style.overflow`
     escrito aquí— porque el modal de vídeo de MÚSICA bloquea el mismo body:
     sin contador compartido, el primero en soltarlo restauraría el scroll
     con el otro todavía abierto. Los recorridos y la calibración del telón
     no se han tocado. */
  useScrollLock(!gone);

  useEffect(() => {
    if (!leaving) return;
    const delay = reducedMotion ? 60 : EXIT_MS;
    const timer = window.setTimeout(() => setGone(true), delay);
    return () => window.clearTimeout(timer);
  }, [leaving, reducedMotion]);

  if (gone) return null;

  const handleEnter = () => {
    if (leaving) return;
    setLeaving(true);
    // No se espera al audio: si el navegador lo rechaza, se entra igual.
    void enter();

    /* EMBUDO DE ENTRADA.
     *
     * Quien pega una URL profunda acaba en INICIO: el hero es la carta de
     * presentación y la experiencia está pensada para empezar ahí. Las escenas
     * de `DIRECT_ENTRY_SECTIONS` se libran — hoy solo `/contacto`, porque es el
     * enlace que se manda a un promotor.
     *
     * `replace` y no `push`: la URL profunda desaparece del historial, así que
     * el botón «atrás» devuelve al sitio de donde vino el visitante y no a una
     * sección que nunca llegó a ver.
     *
     * Se lanza AHORA, no al terminar la animación. `SiteShell` ya está pintando
     * el hero detrás del telón (ver allí), así que el cambio de ruta ocurre
     * mientras las cortinas se abren y el visitante nunca ve un salto. */
    if (!staysOnRoute) {
      router.replace('/');
    }
  };

  /* CLOSED → PEEK (hover) → OPEN (clic). El estado de apertura manda siempre
     sobre el de hover, para que soltar el ratón a media apertura no la aborte. */
  const travel = leaving ? TRAVEL.open : peeking ? TRAVEL.peek : TRAVEL.closed;
  const moveMs = reducedMotion ? 0 : leaving ? EXIT_MS : 620;

  return (
    <div
      aria-hidden={leaving}
      className={`fixed inset-0 z-[100] overflow-hidden ${
        leaving ? 'pointer-events-none' : ''
      }`}
      /* El marco lateral y el galón siguen siendo opacos cuando el componente
         se desmonta al terminar `EXIT_MS`, así que sin esto desaparecerían de
         golpe. El fundido se solapa con el desplazamiento (ver `FADE_START` /
         `FADE_SPAN`): la apertura se sigue leyendo como movimiento —que es lo
         que debe ser— pero para cuando termina, el telón ya se ha ido. */
      style={
        leaving && !reducedMotion
          ? {
              opacity: 0,
              transition: `opacity ${Math.round(EXIT_MS * FADE_SPAN)}ms ease-out ${Math.round(
                EXIT_MS * FADE_START
              )}ms`
            }
          : undefined
      }
    >
      {/* El telón NO lleva fondo opaco propio: el hero real queda por debajo y
          tiene que verse de verdad por la abertura. Las propias piezas son
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
          dejar el escenario limpio mientras las cortinas terminan su recorrido. */}
      <div
        className={`absolute inset-0 z-40 flex flex-col items-center justify-center px-6 transition-all ease-out ${
          reducedMotion ? 'duration-150' : 'duration-500'
        } ${leaving ? 'pointer-events-none scale-[1.04] opacity-0' : 'scale-100 opacity-100'}`}
      >
        <h1 className="text-center text-4xl font-black tracking-[0.18em] text-amber-200/90 drop-shadow-[0_4px_18px_rgba(0,0,0,0.9)] sm:text-5xl md:text-6xl">
          HOSMAN BRAVO
        </h1>
        <span className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

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
          /* Mismo cristal traslúcido de antes, pero más presente sobre el
             telón: el vidrio va más oscuro (`bg-black/65`) para separarse del
             terciopelo en vez de fundirse con él, el contorno pasa a 2px y
             sube algo de opacidad, y una sombra proyectada lo despega del
             fondo. El desenfoque sube a `md` para que se siga leyendo como
             cristal y no como un rectángulo plano. El texto gana algo de
             cuerpo (`/95`) porque era lo que peor se veía. */
          className="mt-10 rounded-full border-2 border-amber-200/45 bg-black/65 px-8 py-4 text-[11px] font-bold tracking-[0.28em] text-amber-100/95 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.03] hover:border-amber-400/80 hover:text-amber-300 hover:shadow-[0_0_26px_-4px_rgba(200,150,60,0.55)] focus-visible:border-amber-400/80 focus-visible:text-amber-300 focus-visible:outline-none sm:px-10 sm:text-xs"
        >
          ENTRAR A LA EXPERIENCIA
        </button>
      </div>
    </div>
  );
}
