'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import type { ShowEvent } from '@/data/types';

/* ---------------------------------------------------------------------------
   Entrada de un show.

   Toda la materialidad —negro mate, marco dorado, perforaciones, talón,
   ADMIT ONE, código de barras, numeración— viene del asset
   `ticket-template.webp`. Aquí NO se recrea nada de eso con CSS: encima de la
   imagen solo se superpone el texto del evento, que es lo único dinámico.

   Los datos entran por props (`events` + `index`): ordenarlos, quitar los
   pasados y traerlos del snapshot publicado es trabajo de quien lo llama
   (`useShowEvents`), sin tocar nada de aquí.

   El aspecto de esta pieza está aprobado y no debe rediseñarse. Para la
   entrada secundaria del bloque basta con pasarle un `widthClass` menor: como
   toda la tipografía está en `cqw` (relativa al ancho del contenedor), la
   entrada entera escala sola sin tocar una sola medida interna.
--------------------------------------------------------------------------- */

/* `ShowEvent` vivía aquí; ahora está en `@/data/types`, junto a los datos que
   describe. Este componente pinta la entrada, no decide su forma. */

/** Ancho de la entrada protagonista. El resto de piezas del bloque parten de
 *  este valor para mantener la proporción entre ellas.
 *
 *  Sale del token `--hb-ticket-w` (ver `globals.css`). Antes era
 *  `min(92vw,380px)`: solo miraba el ancho, y entre los dos viewports de
 *  referencia el ancho no cambia de escalón, así que la entrada seguía
 *  midiendo 380px sobre una escena de 591px de alto. El token mantiene el
 *  `min(92vw, …)` —en pantallas estrechas sigue mandando el ancho— pero le
 *  añade el alto disponible, con suelo en 300px. */
export const TICKET_WIDTH_MAIN = 'w-[var(--hb-ticket-w)]';

/** Dos sombras: uná de contacto corta y otra difusa para la profundidad. Van
 *  en `drop-shadow` y no en `box-shadow` porque el asset tiene esquinas
 *  recortadas y perforaciones translúcidas — un `box-shadow` dibujaría la
 *  sombra de un rectángulo y delataría el recorte. */
export const TICKET_SHADOW = {
  filter:
    'drop-shadow(0 4px 6px rgba(0,0,0,0.65)) drop-shadow(0 18px 26px rgba(0,0,0,0.7))'
} as const;

export const TICKET_SHELL_BASE =
  'relative block select-none [container-type:inline-size]';

/**
 * Zonas útiles del asset, medidas sobre sus 2164×727 px reales muestreando
 * píxeles (canal alfa para el contorno, picos de luminancia para el hilo
 * dorado). Se guardan en fracción del ancho/alto y no en píxeles para que
 * sigan siendo válidas a cualquier tamaño de render:
 *
 *   marco interior   x 2,3%   ·  y 5,9% – 91,6%
 *   línea punteada   x 24,3%     (separa fecha de la información)
 *   inicio del talón x 75,0%     (a partir de ahí manda la imagen)
 */
export const TICKET_NATIVE = { w: 2164, h: 727 };

/** Zonas del contenido sobre `ticket-template.webp` — aprobadas, sin tocar. */
const ZONES_SINGLE = {
  dateLeft: '3.5%',
  dateWidth: '20%',
  infoLeft: '27.5%',
  infoRight: '27%',
  contentTop: '8%',
  contentBottom: '10%',
  titleSize: '4.7cqw'
};

/**
 * `ticket-stack.webp`: la misma entrada frontal, pero el lienzo (2314×910)
 * incluye las copias apiladas detrás asomando arriba a la izquierda. Medido
 * igual que el template (canal alfa + picos de luminancia del hilo dorado):
 * la entrada frontal ocupa, de SU PROPIO lienzo, x 4,5%–96,0% e y 13,7%–86,8%;
 * línea punteada en x 26,4%; talón desde x 74,1%.
 *
 * La caja del componente queda siempre fijada a la proporción del template
 * (`aspect-ratio` más abajo). Este asset es más «cuadrado», así que entra con
 * `object-fit: cover` y no `contain`: con `contain` la imagen se encogía para
 * caber entera, dejando un 7,3% de margen transparente a cada lado — la
 * pieza se veía notablemente más pequeña que el ticket abierto aunque la
 * CAJA midiera igual. Con `cover` manda el ANCHO (ocupa el 100%, sin margen
 * lateral) y sobra alto, que se recorta arriba y abajo a partes iguales —
 * comprobado por los píxeles que ese recorte (66px de los 910 del lienzo a
 * cada lado) cae dentro del margen del efecto apilado, nunca dentro del
 * cuerpo de la entrada frontal (que va de y=125 a y=790).
 *
 * Con el recorte, la franja vertical visible del lienzo ya no es 0–100% sino
 * 7,3%–92,9% (`66/910` a cada lado); los porcentajes de abajo ya están
 * convertidos a ese sistema de coordenadas de la CAJA:
 * `cajaY% = (imagenY% × 9,10 − 66,24) / 7,7752`. En horizontal `cover` no
 * añade márgenes, así que ahí sí es mapeo directo 1:1 con el lienzo.
 */
const ZONES_STACK = {
  dateLeft: '5.7%',
  dateWidth: '20%',
  infoLeft: '29.7%',
  infoRight: '28%',
  contentTop: '14.4%',
  contentBottom: '15.5%',
  /* Con `cover` la caja de información pasa a 42,3% de ancho —ya muy cerca
     del 45,5% del ticket abierto—, así que el título vuelve a caber en 2
     líneas sin necesidad de encogerlo tanto como con `contain` (antes hacía
     falta bajar a 3,5cqw). Verificado por render, no solo calculado. */
  titleSize: '4.5cqw'
};

/* ---------------------------------------------------------------------------
   Posición del indicador de pulsación (la «manito»).

   Va en la esquina INFERIOR DERECHA, sobre el talón crema del asset, justo
   debajo y a la derecha del código de barras. Antes colgaba del flanco
   izquierdo con un sangrado negativo (`-8cqw`) y quedaba prácticamente
   invisible: al mudarse el bloque de eventos a la esquina izquierda del hero,
   ese sangrado se salía del contenedor y lo recortaba (medido: de 38px de
   ancho solo se veían 10). En el talón hay sitio de sobra, el contraste
   dorado-sobre-crema se lee mucho mejor que sobre el negro del cuerpo, y ya
   no depende de que sobre margen fuera de la pieza.

   Los dos estados necesitan valores distintos porque el borde real de la
   entrada no cae en el mismo sitio dentro de la caja:
     · template  → la imagen ocupa la caja entera, borde derecho al 100% y
       borde inferior al 100%.
     · apilado   → con `object-cover` la entrada frontal ocupa x 4,5%–96,0%
       de su lienzo y su borde inferior queda al 93,1% de la caja (ver la
       conversión documentada en `ZONES_STACK`). De ahí los +4cqw en
       horizontal y los +2,3cqw en vertical respecto al template.
--------------------------------------------------------------------------- */
const CLICK_HINT_SINGLE = { right: '-2cqw', bottom: '-4.5cqw' };
const CLICK_HINT_STACK = { right: '2cqw', bottom: '-2.2cqw' };

/* ---------------------------------------------------------------------------
   Sello de estado.

   `agotado` y `cancelado` se siguen mostrando —activarlos en la hoja significa
   que queremos enseñarlos—, pero con una marca atravesada de lado a lado, en
   rojo translúcido, para que no se lean como una fecha normal. Es una capa
   encima del asset: no toca ni la imagen, ni las zonas de texto, ni el
   responsive. `pointer-events: none` para no robarle el clic al enlace.
--------------------------------------------------------------------------- */
const STATUS_SEALS: Record<string, string> = {
  agotado: 'AGOTADO',
  cancelado: 'CANCELADO'
};

function StatusSeal({ label }: { label: string }) {
  return (
    <span
      className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center overflow-hidden"
      style={{ transform: 'rotate(-13deg)' }}
    >
      <span
        className="whitespace-nowrap font-black uppercase"
        style={{
          fontSize: label.length > 8 ? '10cqw' : '12cqw',
          letterSpacing: '0.1em',
          color: 'rgba(214, 40, 40, 0.62)',
          textShadow: '0 1px 2px rgba(0,0,0,0.55)'
        }}
      >
        {label}
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Línea de ubicación: «Ciudad, País» mientras quepa.

   POR QUÉ SE MIDE Y NO SE CUENTAN CARACTERES
   La longitud de una cadena no es su ancho: «MEDELLÍN, COLOMBIA» y
   «ENVIGADO, COLOMBIA» tienen las mismas letras y no ocupan lo mismo. Antes
   esto se decidía con un tope de caracteres, que acababa abreviando ciudades
   que sí cabían.

   LA ESCALERA, EN ORDEN
     1. «Ciudad, País» entero, con salto natural, en DOS líneas como mucho;
     2. si no cabe, se abrevia solo el país a su código de tres letras;
     3. si sigue sin caber, la ubicación —y solo ella— baja un punto de tamaño;
     4. y si aun así no cabe, se recorta con puntos suspensivos.
   Nunca hay una tercera línea: el recorte a dos está en el CSS, así que ese
   límite se cumple aunque la medición no llegue a tiempo.

   CÓMO SE DECIDE
   Un elemento sonda, fuera de flujo e invisible, recibe el ancho real del
   hueco y va probando cada candidato con la tipografía que de verdad se está
   usando: se queda con el primero cuya altura no pase de dos líneas. Medir en
   la sonda y no en el texto pintado es lo que impide que la decisión oscile,
   porque lo que se mide no depende de lo que se esté mostrando. Un
   `ResizeObserver` vuelve a recorrer la escalera si cambia el ancho, y
   `document.fonts.ready` la repite cuando la fuente termina de cargar.

   El coste es una sonda y un observador por entrada (hay dos o tres a la vez),
   y ninguna medida sale de este componente: no hay estado global ni media
   queries nuevas. En el HTML exportado sale la forma larga y, si no cabe, se
   sustituye al hidratar.
--------------------------------------------------------------------------- */
const LOCATION_MAX_LINES = 2;
/** Un punto menos, lo justo para ganar una palabra sin romper la jerarquía. */
const LOCATION_SCALE_DOWN = 0.86;

interface LocationMode {
  texto: string;
  escala: number;
}

function LocationText({ full, short }: { full: string; short?: string }) {
  const [modo, setModo] = useState<LocationMode>({ texto: full, escala: 1 });
  const huecoRef = useRef<HTMLSpanElement>(null);
  const sondaRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const candidatos: LocationMode[] = [
      { texto: full, escala: 1 },
      ...(short ? [{ texto: short, escala: 1 }] : []),
      { texto: short ?? full, escala: LOCATION_SCALE_DOWN }
    ];

    const decidir = () => {
      const hueco = huecoRef.current;
      const sonda = sondaRef.current;
      if (!hueco || !sonda) return;

      const ancho = hueco.clientWidth;
      if (ancho <= 0) return;
      sonda.style.width = `${ancho}px`;

      const cabe = ({ texto, escala }: LocationMode) => {
        sonda.style.fontSize = escala === 1 ? 'inherit' : `${escala}em`;
        // Una sola letra da el alto de UNA línea con esta tipografía y este
        // tamaño, sin tener que leer `line-height` (que puede ser `normal`).
        sonda.textContent = 'M';
        const linea = sonda.getBoundingClientRect().height;
        sonda.textContent = texto;
        // Medio píxel de holgura: las medidas son subpíxeles y un redondeo no
        // debe abreviar un texto que en realidad cabe.
        //
        // Se comprueban las DOS dimensiones. Con solo el alto, un topónimo sin
        // espacios («Llanfairpwllgwyngyll…») daba dos líneas y se daba por
        // bueno mientras se salía por el costado del ticket: no desbordaba
        // hacia abajo porque lo hacía hacia el lado.
        return (
          sonda.getBoundingClientRect().height <= linea * LOCATION_MAX_LINES + 0.5 &&
          sonda.scrollWidth <= ancho + 0.5
        );
      };

      // El último candidato es también el respaldo: si ninguno cabe, se pinta
      // ese y el recorte del CSS le pone los puntos suspensivos.
      const elegido = candidatos.find(cabe) ?? candidatos[candidatos.length - 1];
      sonda.textContent = '';

      setModo((previo) =>
        previo.texto === elegido.texto && previo.escala === elegido.escala ? previo : elegido
      );
    };

    const observer = new ResizeObserver(decidir);
    if (huecoRef.current) observer.observe(huecoRef.current);

    let vivo = true;
    document.fonts?.ready
      .then(() => {
        if (vivo) decidir();
      })
      .catch(() => {});

    return () => {
      vivo = false;
      observer.disconnect();
    };
  }, [full, short]);

  const abreviado = modo.texto !== full;

  return (
    /* `min-w-0 flex-1`: el hueco tiene que ser el ESPACIO DISPONIBLE, no el
       ancho del texto que se está pintando. Sin esto, al abreviar la caja se
       encoge hasta la forma corta y ya nunca vuelve a la larga aunque quepa. */
    <span ref={huecoRef} className="relative block min-w-0 flex-1">
      <span
        // `break-words`: una palabra más ancha que el hueco se parte en vez de
        // salirse. Es lo que permite que el recorte a dos líneas ponga los
        // puntos suspensivos en lugar de dejar el texto cortado por el borde.
        className="line-clamp-2 break-words"
        // Cuando se abrevia, el texto completo sigue disponible para un lector
        // de pantalla en el `sr-only` de abajo; lo pintado sería ruido.
        aria-hidden={abreviado || undefined}
        style={modo.escala === 1 ? undefined : { fontSize: `${modo.escala}em` }}
      >
        {modo.texto}
      </span>
      {abreviado && <span className="sr-only">{full}</span>}
      <span
        ref={sondaRef}
        aria-hidden="true"
        // Mismas reglas de salto que el texto visible: si la sonda partiera las
        // palabras de otra forma, mediría algo que no es lo que se va a pintar.
        className="invisible pointer-events-none absolute left-0 top-0 break-words"
      />
    </span>
  );
}

const MONTHS_ES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'
];

/** `new Date('2026-05-24')` se interpreta en UTC y puede caer un día antes
 * según la zona horaria del navegador; se parsea a mano para que la fecha
 * mostrada sea siempre la escrita en los datos, no la de otro huso. */
function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

type IconProps = { className?: string; style?: React.CSSProperties };

function PinIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M12 21.5S5 14.86 5 9.9a7 7 0 1 1 14 0c0 4.96-7 11.6-7 11.6Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.7" r="2.4" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  );
}

function ClockIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.9" />
      <path d="M12 7.6V12l3.1 1.9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Señal de que la entrada se puede pulsar: mano señalando con las líneas de
 * toque, como en la referencia. Va anclada al flanco izquierdo y sobresale un
 * poco de la pieza, de modo que se lee como un elemento añadido sobre el
 * ticket y no como parte impresa del asset.
 *
 * Solo decorativo (`aria-hidden`): el destino ya lo anuncia el `aria-label`
 * del enlace que lo contiene, así que repetirlo aquí sería ruido para un
 * lector de pantalla.
 */
export function ClickHint({
  className,
  right = CLICK_HINT_SINGLE.right,
  bottom = CLICK_HINT_SINGLE.bottom,
  transition
}: {
  className?: string;
  /** Distancia al borde derecho e inferior de la caja, en `cqw`. Por defecto,
   *  los calibrados para `ticket-template.webp`; `ticket-stack.webp` necesita
   *  otros porque el borde real de su entrada frontal no coincide con el de
   *  la caja (ver `CLICK_HINT_STACK`). */
  right?: string;
  bottom?: string;
  transition?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 ${className ?? ''}`}
      style={{ right, bottom, width: '11cqw', transition }}
    >
      {/* Mano de cursor señalando hacia arriba, con las líneas de pulsación
          saliendo de la punta del índice — la misma estructura de la
          referencia. Los colores sí son los de la casa y no los del ejemplo:
          relleno negro mate y trazo dorado, como el resto de la interfaz. */}
      <svg viewBox="0 0 48 62" fill="none" className="h-auto w-full">
        {/* Líneas de pulsación. En NEGRO y no en dorado como el resto del
            icono: son lo único que queda sobre el talón crema del asset, sin
            el relleno oscuro de la mano por detrás que les diera contraste, y
            en dorado se perdían contra el fondo claro. El negro es el mismo
            `#0d0b0a` del relleno de la mano, así que el icono sigue siendo de
            dos tintas y no introduce un color nuevo. */}
        <g stroke="#0d0b0a" strokeWidth="3" strokeLinecap="round" opacity="0.9">
          <path d="M12.5 16.5 6 11.5" />
          <path d="M17 11 14.8 3.5" />
          <path d="M28.5 10.5 31.5 3.5" />
        </g>

        {/* Silueta: índice levantado y puño cerrado con los tres dedos
            insinuados por los escalones del contorno. */}
        <path
          d="M19 34V14.5a3.75 3.75 0 0 1 7.5 0V30.5l3.6-1.1a3.5 3.5 0 0 1 4.4 2.3l.5 1.7 2.6-.8a3.5 3.5 0 0 1 4.4 2.4l1.4 5.2c1.9 7.1-2 14.4-8.8 16.8l-2.6.9a11 11 0 0 1-12.1-3.4l-8.5-10.1a3.6 3.6 0 0 1 .6-5.1 3.7 3.7 0 0 1 5 .7l2 2.4Z"
          fill="#0d0b0a"
          stroke="#E8C766"
          strokeWidth="2.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Separación entre los dedos del puño. */}
        <g stroke="#E8C766" strokeWidth="1.9" strokeLinecap="round" opacity="0.75">
          <path d="M30.6 31.4v4.4" />
          <path d="M35.5 34.5v3.9" />
        </g>
      </svg>
    </span>
  );
}

export function NextShowTicket({
  events,
  index = 0,
  widthClass = TICKET_WIDTH_MAIN,
  priority = true,
  stacked
}: {
  events: readonly ShowEvent[];
  /** Cuál del array se pinta. El bloque usa 0 para la protagonista y 1 para la
   *  secundaria; el orden cronológico lo resuelve quien llama. */
  index?: number;
  widthClass?: string;
  priority?: boolean;
  /**
   * `true` → usa `ticket-stack.webp` (bloque cerrado). `false` → usa
   * `ticket-template.webp`. `undefined` (por defecto) → solo se monta el
   * template, sin la capa de cruce con el apilado: es el caso de la entrada
   * secundaria, que nunca alterna entre los dos assets.
   *
   * Cuando sí se pasa un booleano, se montan AMBAS imágenes superpuestas y se
   * cruza su opacidad — así el cambio de asset no es un corte, sino un
   * disolvido, igual que las zonas de texto, que también transicionan sus
   * posiciones en vez de saltar entre los dos juegos de coordenadas.
   */
  stacked?: boolean;
}) {
  const event = events[index];
  if (!event) return null;

  const date = parseLocalDate(event.date);
  const day = date.getDate();
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();

  const crossfade = stacked !== undefined;
  const isStacked = stacked ?? false;
  const zones = isStacked ? ZONES_STACK : ZONES_SINGLE;
  const positionTransition = crossfade
    ? 'left 320ms ease, right 320ms ease, top 320ms ease, bottom 320ms ease, font-size 320ms ease'
    : undefined;

  /* El texto se dimensiona en `cqw` (1cqw = 1% del ancho de la entrada), no en
     px por breakpoint: así la tipografía queda anclada a la imagen y las dos
     escalan juntas. Un tamaño en px obligaría a recalcular cada salto de
     tamaño y acabaría descuadrando el texto respecto al marco impreso. */
  const content = (
    <>
      {/* La caja tiene siempre la proporción del template (`aspect-ratio` en
          `shellStyle`), así que aquí basta con `object-contain`: para el
          template en sí no hay letterbox (misma proporción = llena la caja
          entera, píxel a píxel igual que antes de este cambio). */}
      <Image
        src={hosmanData.images.events.ticketTemplate}
        alt=""
        aria-hidden="true"
        fill
        priority={priority}
        sizes="(min-width: 640px) 380px, 92vw"
        className="select-none object-contain transition-opacity duration-300 ease-out"
        style={{ opacity: isStacked ? 0 : 1 }}
        draggable={false}
      />
      {crossfade && (
        // El apilado usa `object-cover`, no `contain` — ver `ZONES_STACK`
        // para el porqué: con `contain` la pieza se veía notablemente más
        // pequeña que el ticket abierto por el margen del letterbox.
        <Image
          src={hosmanData.images.events.ticketStack}
          alt=""
          aria-hidden="true"
          fill
          priority={priority}
          sizes="(min-width: 640px) 380px, 92vw"
          className="select-none object-cover transition-opacity duration-300 ease-out"
          style={{ opacity: isStacked ? 1 : 0 }}
          draggable={false}
        />
      )}

      {/* FECHA — a la izquierda de la línea punteada del asset. */}
      <div
        className="absolute flex flex-col items-center justify-center text-center leading-none"
        style={{
          left: zones.dateLeft,
          width: zones.dateWidth,
          top: zones.contentTop,
          bottom: zones.contentBottom,
          transition: positionTransition
        }}
      >
        <span
          className="font-bold tracking-[0.18em] text-white/60"
          style={{ fontSize: '3.4cqw' }}
        >
          {month}
        </span>
        <span
          className="font-black text-amber-400"
          style={{ fontSize: '12cqw', lineHeight: 1, marginTop: '0.4cqw' }}
        >
          {day}
        </span>
        <span
          className="font-semibold tracking-[0.12em] text-white/45"
          style={{ fontSize: '3.1cqw', marginTop: '0.6cqw' }}
        >
          {year}
        </span>
      </div>

      {/* INFORMACIÓN — entre la línea punteada y el arranque del talón. */}
      <div
        className="absolute flex flex-col justify-center"
        style={{
          left: zones.infoLeft,
          right: zones.infoRight,
          top: zones.contentTop,
          bottom: zones.contentBottom,
          transition: positionTransition
        }}
      >
        <p
          className="font-black uppercase text-amber-300"
          style={{ fontSize: zones.titleSize, lineHeight: 1.15, transition: positionTransition }}
        >
          {event.title}
        </p>
        <p
          className="flex items-center uppercase tracking-wide text-white/70"
          style={{ fontSize: '3.4cqw', gap: '1.4cqw', marginTop: '2.6cqw' }}
        >
          <PinIcon
            className="shrink-0 text-amber-400/80"
            style={{ width: '3.6cqw', height: '3.6cqw' }}
          />
          <LocationText full={event.location} short={event.locationShort} />
        </p>
        <p
          className="flex items-center uppercase tracking-wide text-white/70"
          style={{ fontSize: '3.4cqw', gap: '1.4cqw', marginTop: '1.4cqw' }}
        >
          <ClockIcon
            className="shrink-0 text-amber-400/80"
            style={{ width: '3.6cqw', height: '3.6cqw' }}
          />
          {event.time}
        </p>
      </div>
    </>
  );

  const shell = `${TICKET_SHELL_BASE} ${widthClass}`;
  /* La caja queda fijada siempre a la proporción del template, la tenga o no
     la imagen que se está mostrando en cada momento — es lo que evita el
     salto de alto al alternar entre `ticket-template.webp` y
     `ticket-stack.webp` (ver comentario de `ZONES_STACK`). */
  const shellStyle: React.CSSProperties = {
    ...TICKET_SHADOW,
    aspectRatio: `${TICKET_NATIVE.w} / ${TICKET_NATIVE.h}`
  };

  const seal = event.status ? STATUS_SEALS[event.status] : undefined;

  /* Cuando el enlace principal ES el de reserva —porque no hay venta, o porque
     el evento está agotado y solo queda el contacto— el destino no son
     entradas, y el rótulo del enlace no puede prometerlas. */
  const esContacto = Boolean(event.ticketUrl) && event.ticketUrl === event.bookingUrl;
  const cuando = `${event.location}, ${day} de ${month} de ${year}`;
  const rotulo = esContacto
    ? `Información y reservas para ${event.title} — ${cuando}`
    : `Entradas para ${event.title} — ${cuando}`;

  /* Sin `ticketUrl` la entrada no es un enlace ni muestra el indicador de
     pulsación: anunciar un destino que no existe sería peor que no anunciarlo.
     Un evento `cancelado` nunca lo trae (ver `primaryEventUrl`). */
  return event.ticketUrl ? (
    <a
      href={event.ticketUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={rotulo}
      className={`${shell} transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70`}
      style={shellStyle}
    >
      {content}
      {seal && <StatusSeal label={seal} />}
      <ClickHint
        right={isStacked ? CLICK_HINT_STACK.right : CLICK_HINT_SINGLE.right}
        bottom={isStacked ? CLICK_HINT_STACK.bottom : CLICK_HINT_SINGLE.bottom}
        transition={crossfade ? 'right 320ms ease, bottom 320ms ease' : undefined}
      />
    </a>
  ) : (
    <div className={shell} style={shellStyle}>
      {content}
      {seal && <StatusSeal label={seal} />}
    </div>
  );
}
