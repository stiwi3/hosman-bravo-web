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

   EL «HOY» ES EL DE BOGOTÁ, no el del visitante. La agenda es colombiana: un
   show del 24 debe seguir a la vista durante todo el 24 en Colombia, lo mire
   quien lo mire desde donde lo mire. Se obtiene con `Intl` en formato ISO
   (nunca `toISOString()`, que es UTC y desde las 19:00 en Colombia ya devuelve
   el día siguiente) y se compara como texto con la fecha del evento.

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

/* `en-CA` da exactamente AAAA-MM-DD, que es el formato con el que se comparan
   las fechas. Se crea una sola vez: construir un formateador es caro y esto se
   consulta en cada render. */
const bogotaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: EVENT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

function todayIso(): string {
  return bogotaDay.format(new Date());
}

/** Se reevalúa al volver a la pestaña y cada minuto: puede cruzarse la medianoche
 *  con la página a la vista. El valor es una cadena, así que si no cambia el día
 *  React no vuelve a pintar. */
function subscribe(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  const timer = window.setInterval(onChange, 60_000);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
    window.clearInterval(timer);
  };
}

export function useShowEvents(): readonly ShowEvent[] {
  const today = useSyncExternalStore(subscribe, todayIso, getPublishedFloorDay);
  const events = getPublishedShowEvents();
  return today === null ? events : upcomingShowEvents(events, today);
}
