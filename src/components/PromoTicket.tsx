'use client';

import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import { ClickHint, TICKET_NATIVE, TICKET_SHADOW, TICKET_SHELL_BASE } from './NextShowTicket';

/* ---------------------------------------------------------------------------
   Tercera entrada del bloque: la promocional. No sale del array de eventos —
   es fija — pero usa el mismo `ticket-template.webp` que las reales para que
   se lea como otra pieza de la misma colección.

   Es un `<button>` y no un `<a>` porque la sección de contacto no vive en una
   URL propia: `page.tsx` cambia de sección por estado. «CONTÁCTANOS» es un
   recuadro dibujado dentro del ticket, no un control aparte: toda la pieza es
   la superficie pulsable, así que no hay controles anidados.
--------------------------------------------------------------------------- */

function MegaphoneIcon({
  className,
  style
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 48 40" fill="none" className={className} style={style} aria-hidden="true">
      {/* Cono */}
      <path
        d="M30 4.5 12.5 14.2v8.6L30 32.5V4.5Z"
        fill="#0d0b0a"
        stroke="#E8C766"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Boca del cono */}
      <ellipse cx="30" cy="18.5" rx="3.4" ry="14" fill="#0d0b0a" stroke="#E8C766" strokeWidth="2.4" />
      {/* Cuerpo trasero */}
      <path
        d="M12.5 14.2H8.2a3.2 3.2 0 0 0-3.2 3.2v2.2a3.2 3.2 0 0 0 3.2 3.2h4.3"
        fill="#0d0b0a"
        stroke="#E8C766"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Asa */}
      <path
        d="M14.5 23.4 17 33.6a2.9 2.9 0 0 0 5.7-.7l-.4-6.6"
        fill="#0d0b0a"
        stroke="#E8C766"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Ondas de sonido */}
      <g stroke="#E8C766" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
        <path d="M37.5 12.5c1.8 3.6 1.8 8 0 12" />
        <path d="M42.5 8.5c3 6 3 15.5 0 21.5" />
      </g>
    </svg>
  );
}

export function PromoTicket({
  onContact,
  widthClass
}: {
  onContact: () => void;
  widthClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onContact}
      aria-label="¿Quieres que tu evento sea el próximo? Pon aquí tu fecha — ir a contacto"
      className={`${TICKET_SHELL_BASE} ${widthClass} cursor-pointer text-left transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70`}
      style={TICKET_SHADOW}
    >
      <Image
        src={hosmanData.images.events.ticketTemplate}
        alt=""
        aria-hidden="true"
        width={TICKET_NATIVE.w}
        height={TICKET_NATIVE.h}
        sizes="(min-width: 640px) 340px, 84vw"
        className="h-auto w-full select-none"
        draggable={false}
      />

      {/* MEGÁFONO — ocupa la zona que en las entradas reales lleva la fecha,
          a la izquierda de la línea punteada impresa en el asset. */}
      <span
        className="absolute flex items-center justify-center"
        style={{ left: '3.5%', width: '20%', top: '8%', bottom: '10%' }}
      >
        <MegaphoneIcon className="h-auto" style={{ width: '15cqw' }} />
      </span>

      {/* MENSAJE — entre la línea punteada y el arranque del talón, igual que
          la información de las entradas reales. */}
      <span
        className="absolute flex flex-col justify-center text-center"
        style={{ left: '27.5%', right: '27%', top: '8%', bottom: '10%' }}
      >
        {/* El cuerpo del ticket es muy apaisado (3:1), así que el titular tiene
            que caber en dos líneas: a mayor tamaño rompe en tres y desborda por
            arriba. `text-balance` reparte las dos líneas de forma pareja. */}
        <span
          className="text-balance font-black uppercase text-amber-300"
          style={{ fontSize: '3.6cqw', lineHeight: 1.18 }}
        >
          ¿Quieres que tu evento sea el próximo?
        </span>

        {/* «PON AQUÍ TU FECHA» con filetes dorados a los lados, como en la
            referencia. */}
        <span
          className="flex items-center justify-center"
          style={{ gap: '1.8cqw', marginTop: '2.2cqw' }}
        >
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-400/45" />
          <span
            className="whitespace-nowrap font-semibold uppercase tracking-[0.12em] text-white/70"
            style={{ fontSize: '2.6cqw' }}
          >
            Pon aquí tu fecha
          </span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-400/45" />
        </span>

        {/* Recuadro «CONTÁCTANOS»: es dibujo dentro del ticket, no un control
            propio — el botón es la entrada entera. */}
        <span
          className="mx-auto block border border-amber-400/45 uppercase tracking-[0.2em] text-amber-200/90"
          style={{
            fontSize: '2.5cqw',
            marginTop: '2.2cqw',
            paddingTop: '1.2cqw',
            paddingBottom: '1.2cqw',
            paddingLeft: '4cqw',
            paddingRight: '4cqw'
          }}
        >
          Contáctanos
        </span>
      </span>

      {/* Esta entrada es siempre clicable —lleva a Contacto/Booking sin
          depender de ningún `ticketUrl`—, así que el indicador va siempre
          visible, no condicionado como en las entradas reales. Usa la
          posición por defecto (esquina inferior derecha, sobre el talón
          crema), que en esta pieza tampoco colisiona con nada: el mensaje
          termina en el 73% del ancho y el talón arranca en el 75%. */}
      <ClickHint />
    </button>
  );
}
