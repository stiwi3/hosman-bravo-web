/* ---------------------------------------------------------------------------
   Ayudas del catálogo de música, y el respaldo cuando no hay catálogo remoto.

   LA FUENTE REAL ES LA HOJA DE CÁLCULO, a través de `src/lib/content-api`
   (ver `useMusicReleases`). Aquí no vive contenido.

   POR QUÉ EL RESPALDO ESTÁ VACÍO
   Hasta ahora contenía seis lanzamientos inventados para poder aprobar el
   diseño. Eso convertía un fallo del endpoint en algo peor que una sección
   vacía: la web del artista publicando una discografía falsa —títulos, fechas
   y enlaces que no existen— sin que nada avisara de que era un respaldo.

   No se ha sustituido por «datos reales» sacados de otro sitio del repositorio
   porque no los hay: `hosmanData.songs` tiene títulos y años, pero no día ni
   mes ni enlaces por canción, así que rellenarlo sería inventar igualmente.

   Un array vacío es el estado seguro: si el endpoint cae, MÚSICA lo dice en
   una línea y no afirma nada falso. Ver el estado vacío de `MusicSection`.

   Este archivo se mantiene porque las dos funciones de abajo sí aportan: son
   las reglas del catálogo —qué es un vídeo y cómo se ordena— y valen para los
   datos vengan de donde vengan.
--------------------------------------------------------------------------- */

import type { MusicRelease, ReleaseKind } from './types';

/**
 * Catálogo de respaldo. **Vacío a propósito** — ver el comentario de arriba.
 *
 * Si algún día hay lanzamientos que merezca la pena garantizar aunque la hoja
 * no responda, este es su sitio, pero solo con datos verificados.
 */
export const musicReleasesFallback: readonly MusicRelease[] = [];

/**
 * Qué tipo de pieza es. Se deriva del dato, nunca se declara: si hay
 * `youtubeId` hay videoclip. Ver `ReleaseKind` en `./types.ts`.
 *
 * La hoja trae además una columna `has_video`, que NO se usa para esto: sin un
 * identificador no hay vídeo que reproducir por mucho que la casilla diga que
 * sí, así que manda el dato que de verdad permite hacer algo.
 */
export function releaseKind(release: MusicRelease): ReleaseKind {
  return release.youtubeId ? 'video' : 'audio';
}

/**
 * Los lanzamientos del más reciente al más antiguo.
 *
 * Ordena sobre una COPIA: `sort` muta el array que recibe, y este puede venir
 * del estado de React o de la caché del módulo — ordenarlo en sitio alteraría
 * los datos compartidos. Es la misma trampa que ya está documentada en
 * `UpcomingShows`.
 *
 * `localeCompare` sobre fechas ISO ordena bien porque el formato AAAA-MM-DD es
 * lexicográficamente equivalente a su orden cronológico.
 */
export function releasesByDateDesc(
  releases: readonly MusicRelease[] = musicReleasesFallback
): MusicRelease[] {
  return [...releases].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}
