'use client';

import { useSyncExternalStore } from 'react';

/* ---------------------------------------------------------------------------
   INTERRUPTOR TEMPORAL — NUEVA ENTRADA vs MINI-TELÓN (01-10-2026).

   Elige el ASPECTO de la entrada; el comportamiento (salidas, audio, Pre-Hero)
   es el mismo en los dos, porque vive en `EntryScreen` y `salidaTelon.ts` y no
   se toca.

   · 'portada' — tarjeta centrada + portada oscura en el marco del Hero (INICIO).
   · 'telon'   — el mini-telón de siempre, como referencia durante la fase.

   Por defecto 'portada'. Para comparar en local: `?entrada=telon` en la URL.
   El servidor siempre pinta el valor por defecto; con el parámetro, el cliente
   cambia al hidratar (un parpadeo aceptable en una herramienta de comparación).

   ⚠️ Se borra entero, con el telón, cuando Danny apruebe el diseño nuevo.
--------------------------------------------------------------------------- */

export type DisenoEntrada = 'portada' | 'telon';

const POR_DEFECTO: DisenoEntrada = 'portada';

const sinSuscripcion = () => () => {};

const leerUrl = (): DisenoEntrada =>
  new URLSearchParams(window.location.search).get('entrada') === 'telon' ? 'telon' : POR_DEFECTO;

export function useDisenoEntrada(): DisenoEntrada {
  return useSyncExternalStore(sinSuscripcion, leerUrl, () => POR_DEFECTO);
}
