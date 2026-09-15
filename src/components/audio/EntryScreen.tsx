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
     `inert` sobre la página y sin desenfoque; solo una penumbra ligera que no
     captura nada (ver «INTEGRACIÓN EN LA ESCENA»).
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
  /* Peek fuerte (hover/foco de ENTRAR): ±4,5 %, a petición de Danny para que la
     diferencia con el hover del telón sea evidente. Es el recorrido calibrado del
     telón original: abertura 8,64 % (2 × 4,5 − 0,36 de solape) frente a la
     referencia «telon poco abierto» (8,67 %). */
  peek: { left: -4.5, right: 4.5 },
  open: { left: -43, right: 42 }
} as const;

/* ---------------------------------------------------------------------------
   JERARQUÍA DE INTERACCIÓN — un único estado visual derivado:

     idle  <  curtain  <  cta  <  leaving

   · idle     — telón cerrado; penumbra y atmósfera; CTA estable.
   · curtain  — cursor sobre el telón (solo con hover real: `(hover: hover) and
                (pointer: fine)` y puntero de ratón). Apertura intermedia,
                escena revelada y salto del CTA una vez por visita.
   · cta      — hover o foco de TECLADO sobre ENTRAR. Apertura fuerte; la
                escena sigue revelada (no hay segundo cambio de luz).
   · leaving  — cualquier salida (ENTRAR, Play primero, X, Escape).

   Se deriva de tres hechos de entrada independientes (hover telón, hover CTA,
   foco visible del CTA): no hay combinaciones imposibles porque la prioridad
   la decide la derivación. Al salir del botón sin salir del telón, `curtain`
   sigue siendo cierto y se vuelve a la apertura intermedia, no a cerrado.

   En táctil no existe `curtain`: el telón queda cerrado y tocar ENTRAR entra
   directamente, sin toque previo de vista.
--------------------------------------------------------------------------- */

/** Apertura del hover sobre el telón, como fracción del PEEK. Parámetro de ajuste.
 *  ±2,7 % sobre el peek de ±4,5 (abertura 5,04 % frente a 8,64 %): se ve que el
 *  telón reacciona, sin llegar a lo que abre ENTRAR. */
const CURTAIN_HOVER_FRACTION = 2.7 / 4.5;
const TRAVEL_CURTAIN = {
  left: TRAVEL.peek.left * CURTAIN_HOVER_FRACTION,
  right: TRAVEL.peek.right * CURTAIN_HOVER_FRACTION
};

/** Consulta de capacidad (no de anchura) para el hover sobre el telón. */
const HOVER_REAL = '(hover: hover) and (pointer: fine)';

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
 * Tamaño y posición de la caja: una sola ley fluida, sin valores por resolución.
 *
 * El ancho es el MENOR de tres límites, con la proporción del lienzo fija:
 * · `80vw` — en pantallas estrechas deja ver la página a los lados y libera
 *   los rails de redes y plataformas (a 390 px de ancho solo los roza la franja
 *   del feather; con `90vw` el arte opaco tapaba el 67–78 % de cada icono);
 * · `48rem` — en escritorio es un popup, no un telón a pantalla completa;
 * · `52svh × proporción` — TECHO DE ALTURA: la caja nunca pasa del 52 % del alto
 *   de la pantalla. En apaisados bajos manda este límite y el popup se reduce
 *   de verdad en vez de comerse casi todo el alto (antes el techo era
 *   `100svh − 2rem`).
 *
 * POSICIÓN: centrada y subida un 20 % del ALTO LIBRE (pantalla − caja). Con la
 * escena de INICIO detrás, el galón intercepta la zona de la cara en vez de
 * empezar justo debajo. Es proporcional al hueco libre y no un valor fijo
 * porque en ventanas altas el hero va limitado por el ancho y la cara queda más
 * arriba en proporción; en apaisados bajos, con poco hueco, apenas se mueve.
 * Nunca sale por arriba: el borde superior queda en el 30 % del hueco libre.
 * Va en `translate` y no en `transform` para no pisar la reducción del cierre
 * discreto.
 */
const BOX_WIDTH = `min(80vw, 48rem, calc(52svh * ${CANVAS.w} / ${CANVAS.h}))`;
const BOX_STYLE: React.CSSProperties = {
  width: BOX_WIDTH,
  aspectRatio: `${CANVAS.w} / ${CANVAS.h}`,
  translate: `0 calc((100svh - ${BOX_WIDTH} * ${CANVAS.h} / ${CANVAS.w}) * -0.2)`
};

/* ---------------------------------------------------------------------------
   INTEGRACIÓN EN LA ESCENA — que el popup no se lea como una caja pegada.

   · FEATHER: una máscara desvanece solo el perímetro de la caja (unos pocos %
     por lado). El centro del telón queda nítido; no hay ningún blur.
   · PENUMBRA: negro ligero sobre la página, `pointer-events: none`. No bloquea
     clics ni scroll: es luz de escena, no un modal. Con el telón activo (hover
     del telón o de ENTRAR, foco de teclado) casi desaparece —la escena se
     revela— y en cualquier salida se va junto con el telón.
   · SOMBRA AMBIENTAL: halo negro amplio y blando alrededor de la caja.

   REGLA: EL TELÓN NUNCA SE OSCURECE. Penumbra y halo afectan solo a la página
   de detrás. Las piezas del telón son semitransparentes en sus zonas oscuras,
   así que cualquier velo DEBAJO de la caja se vería a través de ellas y
   cambiaría su luz entre reposo y peek. Por eso las dos capas son `box-shadow`
   de un HUECO con la forma de la caja: una sombra exterior no se pinta nunca
   bajo su propio elemento. El hueco llega justo hasta donde empieza el
   feather, de modo que la franja desvanecida del perímetro sí se funde hacia
   la sombra, y todo lo que queda dentro —arte, logo, CTA, X— conserva siempre
   la misma luminosidad. Ni opacidad, ni filtro, ni transición de estas capas
   toca la caja.
--------------------------------------------------------------------------- */

/** Opacidad del negro de la penumbra en reposo. */
const PENUMBRA_ALPHA = 0.28;
/* ESCENA REVELADA — con el telón ACTIVO (`curtain` o `cta`) la página recupera su
   luz: penumbra, halo y atmósfera caen prácticamente a cero en cuanto el cursor
   entra en el telón, y NO vuelven a cambiar al pasar a ENTRAR ni al volver de él.
   Solo regresan, despacio, cuando el cursor sale del telón (`idle`). El foco de
   teclado en ENTRAR revela igual, porque va directo a `cta`. */
/** Fracción de la penumbra que queda con el telón activo. */
const PENUMBRA_REVELADA = 0.04;
/** Fracción del halo que queda con el telón activo. */
const HALO_REVELADO = 0.12;
/** Duración de la vuelta a reposo (`idle`): más lenta que la revelación. */
const VUELTA_REPOSO_MS = 900;

/** Ancho del feather por eje, en % de la caja. Lo usan la máscara y el hueco. */
const FEATHER_X = 3.5;
const FEATHER_Y = 5;

const FEATHER_MASK = `linear-gradient(to right, transparent 0%, #000 ${FEATHER_X}%, #000 ${100 - FEATHER_X}%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 ${FEATHER_Y}%, #000 ${100 - FEATHER_Y}%, transparent 100%)`;

const FEATHER_STYLE: React.CSSProperties = {
  maskImage: FEATHER_MASK,
  WebkitMaskImage: FEATHER_MASK,
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in'
};

/** El hueco: la caja menos la franja del feather. Base de penumbra y halo. */
const HUECO_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: `${FEATHER_Y}% ${FEATHER_X}%`
};

/** Penumbra: una sombra sin desenfoque que se extiende más allá de cualquier
 *  pantalla. Cubre toda la página excepto el hueco. */
const PENUMBRA_SHADOW = `0 0 0 250vmax rgba(0, 0, 0, ${PENUMBRA_ALPHA})`;

/** Halo: sombra blanda que cae desde el borde del hueco hacia la página. */
const HALO_SHADOW = '0 0 9vmin 3.5vmin rgba(0, 0, 0, 0.55), 0 1.5vmin 18vmin 6vmin rgba(0, 0, 0, 0.3)';

/* ---------------------------------------------------------------------------
   ATMÓSFERA PERIFÉRICA DE ENTRADA — penumbra con profundidad en los bordes.

   No pretende ser humo (el hero ya tiene humo real con Stable Fluids): cierra
   visualmente el viewport y da profundidad. Paleta negro-burdeos y charcoal,
   algo más luminosa que el fondo para que se perciba sin llamar la atención.
   NO imita el humo del hero: no hay canvas, WebGL, partículas, vídeo
   ni JavaScript por fotograma. Son CUATRO regiones fijas (inferior, izquierda,
   derecha, superior), cada una un único gradiente elíptico oscuro, animadas
   solo con `transform` por `@keyframes` en ciclos lentos. El navegador pinta
   cada gradiente una vez y luego solo lo desplaza en el compositor.

   · NO ES UNA BARRERA: `pointer-events: none` y `aria-hidden`. Densidad baja
     (alfa máxima 0,55) y centro despejado: la página sigue legible y usable.
   · EL TELÓN NO SE OSCURECE: el contenedor lleva una máscara estática con un
     hueco del tamaño del arte (la caja menos el feather), igual que la
     penumbra. El humo nunca pasa por debajo de las piezas.
   · RESPONSIVE SIN BREAKPOINTS: grosores y recorridos en `vmin`, así que en
     pantallas pequeñas o bajas las bandas son proporcionalmente más finas y
     no convierten la superficie en una mancha.
   · TELÓN ACTIVO (`curtain` o `cta`): casi desaparece y se abre hacia los bordes
     (opacity + scale en un contenedor intermedio). Salidas: se va con la penumbra.
   · REDUCED MOTION: sin animación continua; queda como atmósfera estática.
--------------------------------------------------------------------------- */

/** Presencia de la atmósfera que queda con el telón activo (ver «ESCENA REVELADA»). */
const HUMO_REVELADO = 0.05;
/** Cuánto se abre la atmósfera hacia los bordes al revelarse. */
const HUMO_REVELADO_SCALE = 1.08;

/* SALTO DEL CTA — al entrar con el ratón en el telón, ENTRAR da un pequeño salto
   vertical (sube, vuelve y un rebote mínimo) para señalar dónde pulsar.

   · Una vez por visita: se arma al alcanzar `curtain` y solo se desarma al salir
     físicamente del telón. Pasar a ENTRAR y volver (`curtain → cta → curtain`)
     no lo repite, porque la animación sigue aplicada (ya terminada) mientras el
     cursor no abandone el telón.
   · Va en el ENVOLTORIO del botón y solo con `transform`: el botón conserva su
     propio hover (escala, borde, texto, sombra) sin que las dos animaciones
     escriban la misma propiedad. Sin reflow y sin JS por fotograma.
   · Sin salto con movimiento reducido, en táctil (no hay `curtain`) ni con foco
     de teclado (va directo a `cta`).
   · Desplazamiento `max(4px, 0,9cqw)`: ~6,9 px en escritorio, 4 px en cajas pequeñas. */
const CTA_NUDGE = 'hb-cta-nudge 820ms cubic-bezier(0.33, 0, 0.25, 1) 1 both';

const HUECO_W = `calc(${BOX_WIDTH} * ${1 - (2 * FEATHER_X) / 100})`;
const HUECO_H = `calc(${BOX_WIDTH} * ${CANVAS.h} / ${CANVAS.w} * ${1 - (2 * FEATHER_Y) / 100})`;
const HUECO_Y = `calc(50% + (100svh - ${BOX_WIDTH} * ${CANVAS.h} / ${CANVAS.w}) * -0.2)`;
const HUMO_MASK = 'linear-gradient(#000 0 0), linear-gradient(#000 0 0)';

/** Máscara del humo: todo el viewport menos el hueco del telón. */
const HUMO_MASK_STYLE: React.CSSProperties = {
  maskImage: HUMO_MASK,
  WebkitMaskImage: HUMO_MASK,
  maskSize: `100% 100%, ${HUECO_W} ${HUECO_H}`,
  WebkitMaskSize: `100% 100%, ${HUECO_W} ${HUECO_H}`,
  maskPosition: `0 0, 50% ${HUECO_Y}`,
  WebkitMaskPosition: `0 0, 50% ${HUECO_Y}`,
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskComposite: 'exclude',
  WebkitMaskComposite: 'xor'
};

/** Las cuatro regiones: posición, gradiente y animación. */
const HUMO_CAPAS: { style: React.CSSProperties; animation: string }[] = [
  {
    // Inferior: la de más presencia, sube desde el borde de abajo.
    style: {
      left: '-30vw',
      right: '-30vw',
      bottom: '-24vmin',
      height: '56vmin',
      background:
        'radial-gradient(ellipse 50% 50% at 50% 62%, rgba(44,20,24,0.55) 0%, rgba(36,17,20,0.38) 34%, rgba(28,14,17,0.15) 60%, transparent 78%)'
    },
    animation: 'hb-humo-inf 34s ease-in-out infinite alternate'
  },
  {
    // Izquierda: burdeos ennegrecido, algo más baja que el centro.
    style: {
      top: '-18vmin',
      bottom: '-18vmin',
      left: '-40vmin',
      width: '76vmin',
      background:
        'radial-gradient(ellipse 50% 46% at 42% 62%, rgba(62,20,26,0.48) 0%, rgba(46,16,21,0.28) 40%, rgba(32,12,16,0.09) 66%, transparent 76%)'
    },
    animation: 'hb-humo-izq 28s ease-in-out infinite alternate'
  },
  {
    // Derecha: charcoal, algo más alta que el centro.
    style: {
      top: '-18vmin',
      bottom: '-18vmin',
      right: '-40vmin',
      width: '76vmin',
      background:
        'radial-gradient(ellipse 50% 46% at 58% 40%, rgba(40,35,37,0.48) 0%, rgba(34,29,31,0.28) 40%, rgba(24,20,22,0.09) 66%, transparent 76%)'
    },
    animation: 'hb-humo-dcha 38s ease-in-out infinite alternate'
  },
  {
    // Superior: la más ligera, una caída de sombra desde arriba.
    style: {
      left: '-20vw',
      right: '-20vw',
      top: '-22vmin',
      height: '44vmin',
      background:
        'radial-gradient(ellipse 50% 50% at 50% 38%, rgba(30,22,25,0.42) 0%, rgba(26,17,20,0.22) 42%, transparent 74%)'
    },
    animation: 'hb-humo-sup 44s ease-in-out infinite alternate'
  }
];

/** Recorridos cortos en `vmin`: en móvil el movimiento es proporcionalmente menor. */
const HUMO_KEYFRAMES = `
@keyframes hb-humo-inf { from { transform: translate3d(-3vmin, 0, 0) scale(1); } to { transform: translate3d(3vmin, -2.5vmin, 0) scale(1.06); } }
@keyframes hb-humo-izq { from { transform: translate3d(0, 3vmin, 0) scale(1); } to { transform: translate3d(2.5vmin, -3vmin, 0) scale(1.05); } }
@keyframes hb-humo-dcha { from { transform: translate3d(0, -2.5vmin, 0) scale(1.04); } to { transform: translate3d(-2.5vmin, 3vmin, 0) scale(1); } }
@keyframes hb-humo-sup { from { transform: translate3d(2vmin, 0, 0) scale(1); } to { transform: translate3d(-2vmin, 1.5vmin, 0) scale(1.05); } }
@keyframes hb-cta-nudge {
  0% { transform: translate3d(0, 0, 0); }
  32% { transform: translate3d(0, calc(-1 * max(4px, 0.9cqw)), 0); }
  62% { transform: translate3d(0, 0, 0); }
  80% { transform: translate3d(0, calc(-0.22 * max(4px, 0.9cqw)), 0); }
  100% { transform: translate3d(0, 0, 0); }
}
`;

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
  /* Hechos de entrada (ver «JERARQUÍA DE INTERACCIÓN»). Ninguno decide el
     aspecto por sí solo: el estado visual se DERIVA más abajo. */
  /** Cursor de ratón dentro del telón, en un dispositivo con hover real. */
  const [curtainHover, setCurtainHover] = useState(false);
  /** Cursor de ratón sobre ENTRAR. */
  const [ctaHover, setCtaHover] = useState(false);
  /** Foco VISIBLE (teclado) en ENTRAR. Un clic o un toque no cuentan. */
  const [ctaFocus, setCtaFocus] = useState(false);

  const exiting = leaving || closing;
  const visual: 'idle' | 'curtain' | 'cta' | 'leaving' = exiting
    ? 'leaving'
    : ctaHover || ctaFocus
      ? 'cta'
      : curtainHover
        ? 'curtain'
        : 'idle';

  /** Salto del CTA armado en esta visita al telón (ver «SALTO DEL CTA»). Se
   *  ajusta durante el render, como `leaving` con Play primero: se arma al
   *  alcanzar `curtain` y solo se desarma al salir físicamente del telón. */
  const [nudgeArmado, setNudgeArmado] = useState(false);
  if (visual === 'curtain' && !nudgeArmado) setNudgeArmado(true);
  if (!curtainHover && nudgeArmado) setNudgeArmado(false);

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

  /* CLOSED → CURTAIN (hover telón) → PEEK (hover/foco ENTRAR) → OPEN (ENTRAR o
     primera reproducción). La apertura manda siempre sobre el hover, para que
     soltar el ratón a media apertura no la aborte. El cierre discreto deja las
     cortinas cerradas. */
  const travel = leaving
    ? TRAVEL.open
    : visual === 'cta'
      ? TRAVEL.peek
      : visual === 'curtain'
        ? TRAVEL_CURTAIN
        : TRAVEL.closed;
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

  /* Iluminación de la escena: ver «ESCENA REVELADA». Un único valor para
     `curtain` y `cta`, así que pasar entre ellos no produce ninguna transición. */
  const revelada = visual === 'curtain' || visual === 'cta';
  const segunEstado = (valorRevelado: number) =>
    visual === 'leaving' ? 0 : revelada ? valorRevelado : 1;
  const penumbraOpacity = segunEstado(PENUMBRA_REVELADA);
  const haloOpacity = segunEstado(HALO_REVELADO);
  const penumbraMs = reducedMotion
    ? 60
    : leaving
      ? Math.round(EXIT_MS * (FADE_START + FADE_SPAN))
      : closing
        ? DISMISS_MS
        : revelada
          ? 620
          : VUELTA_REPOSO_MS;
  const penumbraStyle: React.CSSProperties = {
    ...HUECO_STYLE,
    boxShadow: PENUMBRA_SHADOW,
    opacity: penumbraOpacity,
    transition: `opacity ${penumbraMs}ms ease-out`
  };
  const humoStyle: React.CSSProperties = {
    opacity: segunEstado(HUMO_REVELADO),
    transform: revelada && !reducedMotion ? `scale(${HUMO_REVELADO_SCALE})` : 'scale(1)',
    transition: `opacity ${penumbraMs}ms ease-out, transform ${reducedMotion ? 0 : penumbraMs}ms ease-out`
  };
  const haloStyle: React.CSSProperties = {
    ...HUECO_STYLE,
    boxShadow: HALO_SHADOW,
    opacity: haloOpacity,
    transition: `opacity ${penumbraMs}ms ease-out`
  };
  /* Salto del CTA: ver «SALTO DEL CTA». */
  const ctaWrapperStyle: React.CSSProperties | undefined =
    nudgeArmado && !reducedMotion && !exiting ? { animation: CTA_NUDGE } : undefined;

  /** Hover sobre el telón: solo ratón en un dispositivo con hover real. */
  const onCurtainEnter = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && window.matchMedia(HOVER_REAL).matches) setCurtainHover(true);
  };

  return (
    /* Solo centra. `pointer-events-none`: fuera de la caja la página recibe
       clics, scroll y foco con normalidad.
       `z-[80]`: por encima de la cabecera (`z-50`) y POR DEBAJO de los modales
       de la página (vídeo, `z-[90]`; la hoja de shows va en la capa superior del
       navegador). Ahora que la página es usable con el telón puesto, un
       videoclip puede abrirse antes de entrar, y debe quedar por delante. */
    <div className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* HUMO DE ENTRADA — ver su bloque arriba. Por debajo del marco del telón:
          el hueco de la máscara coincide con el arte, así que nunca lo cubre. */}
      {/* Keyframes de la atmósfera y del salto del CTA. Con movimiento reducido no se
          emiten: ninguna animación continua puede arrancar. */}
      {!reducedMotion && <style>{HUMO_KEYFRAMES}</style>}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={HUMO_MASK_STYLE}>
        <div className="absolute inset-0" style={humoStyle}>
          {HUMO_CAPAS.map((capa) => (
            <div
              key={capa.animation}
              className="absolute"
              style={{ ...capa.style, animation: reducedMotion ? undefined : capa.animation }}
            />
          ))}
        </div>
      </div>

      {/* Marco de posición: lleva el tamaño, la posición y el fundido de salida,
          y agrupa penumbra y halo con la caja para que se vayan juntos. */}
      <div className="pointer-events-none relative" style={{ ...BOX_STYLE, ...boxExitStyle }}>
        {/* PENUMBRA y HALO — sombras del hueco, nunca debajo del arte. Ver
            «INTEGRACIÓN EN LA ESCENA». Decorativas y sin puntero. */}
        <div aria-hidden="true" className="pointer-events-none" style={penumbraStyle} />
        <div aria-hidden="true" className="pointer-events-none" style={haloStyle} />

        <div
          role="dialog"
          aria-modal="false"
          aria-label="Entrada a la experiencia"
          aria-hidden={exiting || undefined}
          /* `inert` SOLO sobre la propia caja y solo al salir: ENTRAR y la X dejan
             de ser enfocables y clicables en cuanto empieza cualquier salida. */
          inert={exiting}
          /* Región lógica del telón: toda la caja. Aquí se detecta el hover
             (`onCurtainEnter` filtra a ratón con hover real). En táctil el
             diagnóstico mostró que lo que intercepta la caja está tapado de
             verdad por el arte opaco (cortinas frontales y borlas), así que la
             caja sigue capturando: dejar pasar esos toques abriría enlaces que
             no se ven. */
          onPointerEnter={onCurtainEnter}
          onPointerLeave={() => setCurtainHover(false)}
          className={`absolute inset-0 overflow-hidden [container-type:inline-size] ${
            exiting ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
          style={FEATHER_STYLE}
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

            {/* Envoltorio: solo lleva el salto (`transform`); el botón, su hover. */}
            <span className="relative mt-[4.5cqw] inline-flex" style={ctaWrapperStyle}>
            <button
              type="button"
              onClick={handleEnter}
              onPointerEnter={(e) => {
                // `pointerType` distingue ratón de dedo: en táctil el navegador
                // emite un `enter` sintético justo antes del tap, y sin este
                // filtro el telón haría el gesto de PEEK durante la apertura.
                if (e.pointerType === 'mouse') setCtaHover(true);
              }}
              onPointerLeave={() => setCtaHover(false)}
              // Solo el foco VISIBLE (teclado) abre el peek: el foco que deja un
              // clic o un toque no debe dejar el telón entreabierto.
              onFocus={(e) => setCtaFocus(e.currentTarget.matches(':focus-visible'))}
              onBlur={() => setCtaFocus(false)}
              /* Mismo cristal traslúcido del telón a pantalla completa, con las
                 medidas pasadas a la escala de la caja (`cqw`) y un suelo para
                 que siga siendo legible y pulsable en un móvil. */
              className="relative rounded-full border-2 border-amber-200/45 bg-black/65 px-[max(1rem,4.5cqw)] py-[max(0.55rem,1.9cqw)] text-[max(9px,1.65cqw)] font-bold tracking-[0.28em] text-amber-100/95 shadow-[0_8px_28px_-8px_rgba(0,0,0,0.95)] backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.03] hover:border-amber-400/80 hover:text-amber-300 hover:shadow-[0_0_26px_-4px_rgba(200,150,60,0.55)] focus-visible:border-amber-400/80 focus-visible:text-amber-300 focus-visible:outline-none"
            >
              ENTRAR EN LA EXPERIENCIA
            </button>
            </span>

            {/* Pista de que al entrar sonará música. Decorativa: el botón ya
                tiene nombre claro y el icono no aporta información accesible. */}
            <SpeakerIcon className="pointer-events-none mt-[1.8cqw] h-[max(11px,2.1cqw)] w-[max(11px,2.1cqw)] text-amber-100/55" />
          </div>

          {/* CERRAR SIN SONIDO — pequeña y secundaria, en la esquina superior
              derecha, donde se espera un cierre. Después de ENTRAR en el orden de
              tabulación.
              · Vertical: el área empieza justo bajo el galón, que en el lienzo
                ocupa y 0–230 de 1533 (15 % del alto = 8,28cqw).
              · Horizontal: centrada a 6,5cqw del borde derecho, así el glifo
                queda fuera de la franja del feather (3,5cqw).
              · El ÁREA táctil mide al menos 44 px; el GLIFO conserva el tamaño
                de antes (máx. 15,4 px / 2,42cqw). Sin círculo ni placa: solo
                cambia el color al pasar o enfocar. */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Cerrar sin activar la música"
            className="absolute right-[6.5cqw] top-[calc(8.6cqw+max(22px,2.75cqw))] z-50 flex h-[max(44px,5.5cqw)] w-[max(44px,5.5cqw)] -translate-y-1/2 translate-x-1/2 items-center justify-center text-amber-100/60 transition-colors duration-200 hover:text-amber-200 focus-visible:text-amber-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-10px] focus-visible:outline-amber-300/60"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="h-[max(15.4px,2.42cqw)] w-[max(15.4px,2.42cqw)]"
            >
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
