'use client';

import { useId, useState } from 'react';
import { hosmanData } from '@/data/hosman-data';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { NextShowTicket, type ShowEvent } from './NextShowTicket';
import { PromoTicket } from './PromoTicket';

/* ---------------------------------------------------------------------------
   Bloque PRÓXIMOS SHOWS del hero.

   Cerrado: título + entrada protagonista + botón.
   Abierto: se añaden la segunda fecha (menor) y la entrada promocional.

   El bloque nunca muestra más de dos fechas reales, aunque el array traiga
   más: en el hero se busca un aperitivo, no la agenda completa.
--------------------------------------------------------------------------- */

/**
 * Ancho de las piezas secundarias: un 10% menor que la protagonista, dentro
 * del 8–12% pedido, para que se perciba de inmediato cuál es el próximo show
 * sin que la diferencia resulte exagerada.
 *
 * Ahora se deriva del mismo token que la protagonista (`--hb-ticket-w`) en vez
 * de repetir su fórmula multiplicada a mano (antes: `min(82.8vw,342px)`, que
 * era `min(92vw,380px)` × 0,9 resuelto término a término). Al haber una sola
 * fuente de verdad, el día que cambie el ancho del ticket no hay que recordar
 * actualizar aquí un segundo juego de números.
 *
 * Sigue siendo un string literal y no una plantilla con el cálculo en tiempo
 * de ejecución (`` `w-[calc(${…})]` ``): Tailwind solo genera CSS para clases
 * que puede leer como texto literal en el código fuente al escanearlo — una
 * clase construida dinámicamente con JS no se compila y el ancho no aplica.
 *
 * Al estar toda la tipografía en `cqw`, esto escala la entrada entera sin
 * tocar ninguna medida interna. */
const TICKET_WIDTH_SECONDARY = 'w-[calc(var(--hb-ticket-w)*0.9)]';

/** Ornamento del título: filete que se desvanece y un pequeño rombo, a cada
 *  lado del texto. `scaleX` invierte el filete para el lado derecho en vez de
 *  duplicar el marcado. */
function TitleOrnament({ flip = false }: { flip?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex items-center"
      style={{ gap: '6px', transform: flip ? 'scaleX(-1)' : undefined }}
    >
      <span className="block h-px w-8 bg-gradient-to-r from-transparent to-amber-400/50 sm:w-12" />
      <svg viewBox="0 0 10 10" className="h-[5px] w-[5px] shrink-0" fill="none">
        <path d="M5 0.6 9.4 5 5 9.4 0.6 5Z" stroke="#D4AF37" strokeWidth="1.6" />
      </svg>
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`h-3 w-3 transition-transform duration-300 ease-out ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UpcomingShows({
  events = hosmanData.upcomingShows,
  onContact
}: {
  events?: readonly ShowEvent[];
  onContact: () => void;
}) {
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const panelId = useId();

  /* Copia ordenada: `sort` muta el array que recibe, y este viene de
     `hosmanData` — ordenarlo en sitio alteraría los datos compartidos para
     todo lo demás que los consuma. */
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;

  const hasSecond = sorted.length > 1;

  /* La apertura anima `grid-template-rows` de 0fr a 1fr: es la forma de
     transicionar hasta una altura automática sin medirla con JS ni fijarla a
     un valor que se rompa al cambiar el contenido. */
  const panelStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateRows: open ? '1fr' : '0fr',
    opacity: open ? 1 : 0,
    transform: open || reducedMotion ? 'none' : 'translateY(-6px)',
    transition: reducedMotion
      ? 'none'
      : 'grid-template-rows 380ms cubic-bezier(0.22,0.61,0.36,1), opacity 260ms ease-out, transform 380ms cubic-bezier(0.22,0.61,0.36,1)'
  };

  return (
    <section aria-label="Próximos shows" className="flex flex-col items-center">
      {/* TÍTULO — un par de puntos menos que antes (11/13px → 9/11px), mismo
          color, ornamentos y alineación: solo baja de protagonismo. */}
      <h2 className="mb-3 flex items-center gap-3 sm:gap-4">
        <TitleOrnament />
        <span
          className="font-serif text-[9px] uppercase tracking-[0.3em] text-amber-300/90 sm:text-[11px]"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          Próximos shows
        </span>
        <TitleOrnament flip />
      </h2>

      {/* ENTRADA PROTAGONISTA — el aspecto de cada asset por separado sigue
          aprobado y sin tocar; `stacked` solo elige cuál mostrar (apilado en
          cerrado, individual en abierto) cruzando su opacidad. */}
      <NextShowTicket events={sorted} index={0} stacked={!open} />

      {/* PANEL DESPLEGABLE */}
      <div id={panelId} style={panelStyle} aria-hidden={!open}>
        {/* `min-h-0` es imprescindible: sin él el hijo de la rejilla conserva
            su altura mínima de contenido y la fila nunca llega a colapsar a 0.
            `px-8`: el `ClickHint` de la promocional sobresale hasta 8cqw
            (~27px con el ancho de la secundaria) por fuera del borde
            izquierdo de su propia tarjeta — sin este margen, `overflow-hidden`
            (imprescindible para que el colapso a 0 no deje contenido
            asomando) se lo comía por completo y quedaba invisible aunque el
            elemento existiera y estuviera bien posicionado. */}
        <div className="min-h-0 overflow-hidden px-8">
          <div className="flex flex-col items-center gap-3 pt-3 sm:gap-4 sm:pt-4">
            {hasSecond && (
              <NextShowTicket
                events={sorted}
                index={1}
                widthClass={TICKET_WIDTH_SECONDARY}
                priority={false}
              />
            )}
            <PromoTicket onContact={onContact} widthClass={TICKET_WIDTH_SECONDARY} />
          </div>
        </div>
      </div>

      {/* BOTÓN */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="mt-3 flex items-center gap-2.5 border border-amber-400/35 bg-black/45 px-5 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-amber-200/85 backdrop-blur-sm transition-colors duration-300 hover:border-amber-400/65 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70 sm:mt-4 sm:text-[10px]"
      >
        {open ? 'Ocultar fechas' : 'Ver más fechas'}
        <ChevronIcon open={open} />
      </button>
    </section>
  );
}
