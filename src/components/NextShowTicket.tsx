'use client';

import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';

/* ---------------------------------------------------------------------------
   Entrada de un show.

   Toda la materialidad —negro mate, marco dorado, perforaciones, talón,
   ADMIT ONE, código de barras, numeración— viene del asset
   `ticket-template.webp`. Aquí NO se recrea nada de eso con CSS: encima de la
   imagen solo se superpone el texto del evento, que es lo único dinámico.

   Los datos van aparte (`hosmanData.upcomingShows`) y entran por props, así
   que este componente ya puede recibir cualquier array: ordenarlo por fecha,
   filtrar las pasadas o traerlo de Google Sheets es trabajo de quien lo llame,
   sin tocar nada de aquí. De momento se pinta solo `events[0]`.

   El aspecto de esta pieza está aprobado y no debe rediseñarse. Para la
   entrada secundaria del bloque basta con pasarle un `widthClass` menor: como
   toda la tipografía está en `cqw` (relativa al ancho del contenedor), la
   entrada entera escala sola sin tocar una sola medida interna.
--------------------------------------------------------------------------- */

export interface ShowEvent {
  id: string;
  date: string;
  title: string;
  location: string;
  time: string;
  ticketUrl?: string;
}

/** Ancho de la entrada protagonista. El resto de piezas del bloque parten de
 *  este valor para mantener la proporción entre ellas. */
export const TICKET_WIDTH_MAIN = 'w-[min(92vw,380px)]';

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

/* El indicador de click también cambia de sitio entre estados: con `cover`
   ya no hay margen de letterbox, así que el borde real de la entrada apilada
   está donde lo mide el propio asset, ~4,5% (frente al 0% del template, que
   ocupa toda la caja). Se aplica el mismo criterio que en modo individual (la
   mano arranca 8 puntos antes del borde y termina 3 después). */
const CLICK_HINT_LEFT_SINGLE = '-8cqw';
const CLICK_HINT_LEFT_STACK = '-3.5cqw';

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
  left = CLICK_HINT_LEFT_SINGLE,
  transition
}: {
  className?: string;
  /** Dónde empieza, relativo al ancho del contenedor (`cqw`). Por defecto,
   *  el calibrado para `ticket-template.webp`; `ticket-stack.webp` necesita
   *  otro valor porque su borde real no está en el 0% de la caja (ver
   *  `CLICK_HINT_LEFT_STACK`). */
  left?: string;
  transition?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute z-10 ${className ?? ''}`}
      /* Queda casi entero fuera de la pieza: la zona de la fecha arranca en el
         3,5% del ancho, así que a menos desplazamiento la mano se comía el día.
         Con -8cqw de sangrado y 11cqw de ancho ocupa de -8 a 3cqw: no invade el
         número y sigue cabiendo en el margen lateral del bloque en móvil. */
      style={{ left, top: '50%', transform: 'translateY(-50%)', width: '11cqw', transition }}
    >
      <svg viewBox="0 0 40 44" fill="none" className="h-auto w-full">
        {/* Líneas de toque */}
        <g stroke="#E8C766" strokeWidth="2.6" strokeLinecap="round" opacity="0.9">
          <path d="M6.5 12.5 2.5 9" />
          <path d="M9.5 6.5 8 2" />
          <path d="M16.5 5.5 18.5 1.5" />
        </g>
        {/* Mano */}
        <path
          d="M13.4 13.2V7.6a2.8 2.8 0 0 1 5.6 0v10.1l2.4-1.1a3 3 0 0 1 3.9 1.4l4.4 8.9c1.5 3.1.6 6.9-2.2 8.9l-1.6 1.2a8.6 8.6 0 0 1-11.6-1.3l-7.2-8.4a2.9 2.9 0 0 1 .5-4.2 3 3 0 0 1 4 .5l2 2.2"
          fill="#0d0b0a"
          stroke="#E8C766"
          strokeWidth="2.3"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function NextShowTicket({
  events = hosmanData.upcomingShows,
  index = 0,
  widthClass = TICKET_WIDTH_MAIN,
  priority = true,
  stacked
}: {
  events?: readonly ShowEvent[];
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
          <span className="truncate">{event.location}</span>
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

  /* Sin `ticketUrl` la entrada no es un enlace ni muestra el indicador de
     pulsación: anunciar un destino que no existe sería peor que no anunciarlo. */
  return event.ticketUrl ? (
    <a
      href={event.ticketUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Entradas para ${event.title} — ${event.location}, ${day} de ${month} de ${year}`}
      className={`${shell} transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70`}
      style={shellStyle}
    >
      {content}
      <ClickHint
        left={isStacked ? CLICK_HINT_LEFT_STACK : CLICK_HINT_LEFT_SINGLE}
        transition={crossfade ? 'left 320ms ease' : undefined}
      />
    </a>
  ) : (
    <div className={shell} style={shellStyle}>
      {content}
    </div>
  );
}
