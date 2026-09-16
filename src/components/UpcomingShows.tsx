'use client';

import { useId, useState } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useAutoRecoger } from '@/hooks/useAutoRecoger';
import { useShowEvents } from '@/hooks/useShowEvents';
import { NextShowTicket } from './NextShowTicket';
import { PromoTicket } from './PromoTicket';
import type { ShowEvent } from '@/data/types';

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
      <span className="block h-px w-12 bg-gradient-to-r from-transparent to-amber-400/50" />
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
  events: eventsProp,
  onContact,
  variante = 'completa',
  panelAlLado = false
}: {
  /**
   * Abre el panel a la DERECHA del bloque, alineado abajo, en vez de encima.
   * Lo pide el coordinador cuando, con el bloque ya pegado al borde inferior
   * de una pantalla baja, encima no queda alto para las entradas.
   */
  panelAlLado?: boolean;
  events?: readonly ShowEvent[];
  onContact: () => void;
  /**
   * · `completa` — título + entrada protagonista + botón (la aprobada).
   * · `minima` — solo título + botón. Es el suelo del bloque cuando el ticket
   *   ya no cabe junto al rótulo del hero, o le quitaría demasiado alto a las
   *   redes. Todas las entradas, la protagonista incluida, van en el panel,
   *   que se abre como overlay y se recoge solo (`useAutoRecoger`).
   *
   * Quién elige la variante y a qué ancho se dibuja el ticket lo decide
   * `HeroScene` (`useGeometriaPeriferica`); este componente no mide nada.
   */
  variante?: 'completa' | 'minima';
}) {
  /* Por defecto, los eventos publicados en `content.json` ya sin los pasados
     (`useShowEvents`). La prop queda para pintar una lista concreta. */
  const publishedEvents = useShowEvents();
  const events = eventsProp ?? publishedEvents;
  const [open, setOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const panelId = useId();
  const esMinima = variante === 'minima';
  const { handlers, programar, cancelar } = useAutoRecoger(open, setOpen);

  /* Copia ordenada: `sort` muta el array que recibe, y este viene de
     la capa de datos — ordenarlo en sitio alteraría los datos compartidos
     para todo lo demás que los consuma. */
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
    <section
      aria-label="Próximos shows"
      className="relative flex flex-col items-center"
      {...(esMinima ? handlers : {})}
    >
      {/* TÍTULO — un par de puntos menos que antes (11/13px → 9/11px), mismo
          color, ornamentos y alineación: solo baja de protagonismo. */}
      <h2 className={`flex items-center gap-4 ${esMinima ? 'mb-2' : 'mb-3'}`}>
        <TitleOrnament />
        <span
          className="font-serif text-[11px] uppercase tracking-[0.3em] text-amber-300/90"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
        >
          Próximos shows
        </span>
        <TitleOrnament flip />
      </h2>

      {/* ENTRADA PROTAGONISTA — el aspecto de cada asset por separado sigue
          aprobado y sin tocar; `stacked` solo elige cuál mostrar (apilado en
          cerrado, individual en abierto) cruzando su opacidad. */}
      {!esMinima && <NextShowTicket events={sorted} index={0} stacked={!open} />}

      {/* PANEL DESPLEGABLE

          `inert` además de `aria-hidden`: el panel cerrado sigue teniendo
          controles dentro (la entrada promocional es un `<button>`, y la
          segunda fecha pasa a ser un `<a>` en cuanto tenga `ticketUrl`), y
          marcarlos como ocultos sin sacarlos del orden de tabulación es una
          contradicción — el foco de teclado caía en contenido invisible y
          declarado inexistente. `inert` los saca del foco Y del árbol de
          accesibilidad de una vez. Es el mismo problema que `LeatherMenuPhoto`
          ya resolvía con `tabIndex={open ? 0 : -1}`. */}
      {/* ⚠️ EL PANEL NO PARTICIPA EN EL REPARTO VERTICAL DE LA ESCENA.
          Va `absolute` anclado por encima del bloque (`bottom-full`), así que
          desplegarlo no cambia el alto de nada: se despliega sobre el hero.

          El ancho es el del ticket más los 4rem de relleno que los dos
          contenedores de dentro usan para que el `ClickHint` de cada entrada
          pueda asomar por su flanco. Fuera de flujo, la caja ya no la estira
          el bloque: hay que declararla, o el recorte se come el saliente.

          Antes estaba en el flujo, y en la composición compacta su fila es
          `auto`: al abrirse le robaba el alto a la fila del hero. Medido a
          1000×900 sobre el commit 1734a99: el bloque pasaba de 179 a 417px y
          el vídeo de 327 a 208 — un 36% menos de Hosman por pulsar «ver más
          fechas». En la composición abierta no se notaba porque ahí el pie ya
          está fuera de flujo; el fallo solo aparecía al reservar de verdad.

          Además impide que abrir eventos haga crecer la escena, y con ella el
          canvas del humo, cuya redimensión destruye las texturas de densidad. */}
      <div
        id={panelId}
        style={panelStyle}
        aria-hidden={!open}
        inert={!open}
        className={`absolute z-10 ${esMinima ? 'w-[calc(var(--hb-ticket-w)+4.5rem)]' : 'w-[calc(var(--hb-ticket-w)+4rem)]'} ${
          // Al lado baja hasta el pie real del bloque (con su aviso legal), que
          // el coordinador publica en `--hb-shows-panel-baja`.
          panelAlLado
            ? 'bottom-[calc(-1*var(--hb-shows-panel-baja,0px))] left-full'
            : 'bottom-full left-1/2 -translate-x-1/2'
        }`}
      >
        {/* `min-h-0` es imprescindible: sin él el hijo de la rejilla conserva
            su altura mínima de contenido y la fila nunca llega a colapsar a 0.
            `px-8`: el `ClickHint` de la promocional sobresale hasta 8cqw
            (~27px con el ancho de la secundaria) por fuera del borde
            izquierdo de su propia tarjeta — sin este margen, `overflow-hidden`
            (imprescindible para que el colapso a 0 no deje contenido
            asomando) se lo comía por completo y quedaba invisible aunque el
            elemento existiera y estuviera bien posicionado. */}
        {/* `px-2` y no `px-8`: el margen que necesita el `ClickHint` para
            asomar ya no va aquí sino en el contenedor de dentro, que es quien
            recorta de verdad (ver abajo). Aquí solo queda un respiro mínimo. */}
        <div className="min-h-0 overflow-hidden px-2">
          {/* `MusicBlock`, en la cabecera, y este bloque viven en árboles de
              DOM distintos (uno `fixed`, el otro `absolute` dentro del hero),
              así que no hay un contenedor común que reparta el alto entre los
              dos. `--hb-shows-panel-max` (ver `globals.css`) es la red de
              seguridad: garantiza que el panel abierto no pueda crecer hacia
              arriba hasta invadir el reproductor en un viewport bajo. Con el
              contenido actual no debería llegar a activar el scroll en
              ninguno de los tres viewports de control — verificado. */}
          {/* `px-6 pb-6`: este contenedor es el que recorta de verdad. Lleva
              `overflow-y-auto`, y en cuanto un eje deja de ser `visible` el
              navegador convierte el OTRO en `auto` — así que también recorta
              en horizontal, aunque nunca se pidiera. Eso dejaba al `ClickHint`
              (que asoma por el flanco derecho e inferior de cada entrada) con
              dos tercios de su ancho cortados. El recorte ocurre en la caja de
              PADDING, así que este relleno le devuelve el sitio; va simétrico
              en horizontal para no descentrar las entradas. */}
          {/* En la variante mínima el ancho de las entradas lo ajusta el
              coordinador (`--hb-ticket-w` local) para que el panel quepa entre
              la cabecera y el bloque; `data-hb-geo` es lo que mide. */}
          <div
            data-hb-geo={esMinima ? 'panel-shows' : undefined}
            className={`flex flex-col items-center gap-4 overflow-y-auto pb-6 pt-4 ${esMinima ? 'px-7' : 'px-6'}`}
            style={{ maxHeight: 'var(--hb-shows-panel-max)' }}
          >
            {esMinima && <NextShowTicket events={sorted} index={0} />}
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
        onClick={() => {
          if (!esMinima) {
            setOpen((v) => !v);
            return;
          }
          // Mínima: recoger a mano es inmediato; al abrir arranca la cuenta
          // (con ratón encima no arranca; con un toque, el `pointerleave` ya
          // pasó antes del clic).
          if (open) {
            cancelar();
            setOpen(false);
          } else {
            setOpen(true);
            programar();
          }
        }}
        aria-expanded={open}
        aria-controls={panelId}
        className={`${esMinima ? '' : 'mt-4'} flex items-center gap-2.5 border border-amber-400/35 bg-black/45 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-200/85 backdrop-blur-sm transition-colors duration-300 hover:border-amber-400/65 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70`}
      >
        {open ? 'Ocultar fechas' : 'Ver más fechas'}
        <ChevronIcon open={open} />
      </button>
    </section>
  );
}
