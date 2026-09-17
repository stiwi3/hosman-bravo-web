'use client';

import { useSyncExternalStore } from 'react';
import {
  getPublishedFloorDay,
  getPublishedShowEvents,
  upcomingShowEvents
} from '@/lib/content-api';
import type { ShowEvent } from '@/data/types';

/* ---------------------------------------------------------------------------
   Próximos shows: los eventos publicados que todavía no han pasado, en orden.

   EL RELOJ ES EL DE BOGOTÁ, no el del visitante. La agenda es colombiana: un
   show de las 20:00 sigue a la vista hasta las 22:00 en Colombia, lo mire quien
   lo mire desde donde lo mire. La hora se obtiene con `Intl` en formato
   AAAA-MM-DDTHH:mm (nunca `toISOString()`, que es UTC y desde las 19:00 en
   Colombia ya devuelve el día siguiente) y se compara como texto con el
   `visibleUntil` que calculó `content-api`.

   La HORA del evento no se toca: se muestra tal como está escrita en la hoja.

   POR QUÉ `useSyncExternalStore`
   El export estático no sabe qué día visitará nadie la página. En el servidor
   —y durante la hidratación, que debe coincidir con ese HTML— el «hoy» es la
   víspera de la publicación (`getPublishedFloorDay`): ya quedan fuera los
   eventos que habían pasado al publicar. Justo después React vuelve a pintar
   con el día real del visitante. Un evento solo puede asomar hasta que carga
   el JavaScript si pasó DESPUÉS de la última publicación.
--------------------------------------------------------------------------- */

/** Zona de la agenda y del propio Sheet. Sin zona por evento, todavía. */
const EVENT_TIME_ZONE = 'America/Bogota';

/* Se crea una sola vez: construir un formateador es caro y esto se consulta en
   cada render. `hourCycle: 'h23'` evita el «24» de la medianoche, que rompería
   la comparación de textos. */
const bogotaMinute = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
});

/** «Ahora» en Bogotá como AAAA-MM-DDTHH:mm, el formato de `visibleUntil`. */
function nowIso(): string {
  const p: Record<string, string> = {};
  for (const parte of bogotaMinute.formatToParts(new Date())) p[parte.type] = parte.value;
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Se reevalúa al volver a la pestaña y cada minuto: un evento caduca dos horas
 *  después de empezar, y eso puede ocurrir con la página a la vista. El valor es
 *  una cadena, así que si no cambia el minuto React no vuelve a pintar. */
function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  const timer = window.setInterval(onChange, 60_000);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
    window.clearInterval(timer);
  };
}

export function useShowEvents(): readonly ShowEvent[] {
  const ahora = useSyncExternalStore(subscribe, nowIso, getPublishedFloorDay);
  const events = getPublishedShowEvents();
  return ahora === null ? events : upcomingShowEvents(events, ahora);
}
