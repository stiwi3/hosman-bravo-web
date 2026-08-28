/* ---------------------------------------------------------------------------
   Discografía de la sección MÚSICA.

   ⚠️ DATOS PROVISIONALES. Este archivo es el ÚNICO punto que hay que sustituir
   cuando los lanzamientos vengan del endpoint de Google Sheets: los tipos ya
   viven en `./types.ts` y los componentes solo conocen el tipo, no este array.
   La sustitución será cambiar el literal de abajo por un `fetch`.

   ⚠️ PORTADAS PROVISIONALES. Ninguna es el arte real de su single: son fotos
   que ya estaban en `public/images/` reutilizadas para poder aprobar la
   composición. No se ha creado ni generado ningún asset nuevo. Al llegar las
   portadas de verdad solo cambian estas rutas.

   Los `youtubeId` de las canciones con videoclip son los reales del canal;
   todavía no se usan para pintar nada — solo clasifican el lanzamiento.
--------------------------------------------------------------------------- */

import type { MusicRelease, ReleaseKind } from './types';

const bp = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const musicReleases: readonly MusicRelease[] = [
  {
    // El más reciente → es el que la sección destaca automáticamente.
    // Con videoclip y con todas las plataformas: el caso completo.
    id: 'borracho-todavia',
    title: 'Borracho Todavía',
    releaseDate: '2026-07-18',
    coverUrl: `${bp}/images/show-02.jpg`,
    youtubeId: 'wOtsMOie4bw',
    spotifyUrl: 'https://open.spotify.com/artist/5IZ9yQEhRQ3rTq76sm93R3',
    appleMusicUrl: 'https://music.apple.com/us/artist/hosman-bravo/1635792181',
    youtubeMusicUrl: 'https://music.youtube.com/@hosmanbravo'
  },
  {
    // Con videoclip, pero SIN Apple Music: comprueba que un icono ausente no
    // deja hueco ni se pinta deshabilitado, simplemente no existe.
    id: 'ranchero-genuino',
    title: 'Ranchero Genuino',
    releaseDate: '2025-11-05',
    coverUrl: `${bp}/images/show-04.jpg`,
    youtubeId: 'wOtsMOie4bw',
    spotifyUrl: 'https://open.spotify.com/artist/5IZ9yQEhRQ3rTq76sm93R3',
    youtubeMusicUrl: 'https://music.youtube.com/@hosmanbravo'
  },
  {
    // Sin videoclip pero CON portada: single con vinilo, una sola plataforma.
    id: 'ya-perdiste',
    title: 'Ya Perdiste',
    releaseDate: '2024-09-12',
    coverUrl: `${bp}/images/sesion-01.jpg`,
    spotifyUrl: 'https://open.spotify.com/artist/5IZ9yQEhRQ3rTq76sm93R3'
  },
  {
    // SIN videoclip y SIN portada: cae en el fallback de marca.
    id: 'no-lo-decidi',
    title: 'No Lo Decidí',
    releaseDate: '2024-03-01',
    spotifyUrl: 'https://open.spotify.com/artist/5IZ9yQEhRQ3rTq76sm93R3',
    youtubeMusicUrl: 'https://music.youtube.com/@hosmanbravo'
  },
  {
    // Con videoclip y todas las plataformas, pero antiguo: va a la cuadrícula.
    id: 'una-botella',
    title: 'Una Botella',
    releaseDate: '2022-08-19',
    coverUrl: `${bp}/images/galeria/galeria-04.jpg`,
    youtubeId: 'wOtsMOie4bw',
    spotifyUrl: 'https://open.spotify.com/artist/5IZ9yQEhRQ3rTq76sm93R3',
    appleMusicUrl: 'https://music.apple.com/us/artist/hosman-bravo/1635792181',
    youtubeMusicUrl: 'https://music.youtube.com/@hosmanbravo'
  },
  {
    // Sin vídeo y SIN NINGUNA plataforma: al pasar el ratón solo aparece el
    // título. Comprueba que la fila de iconos no deja un hueco vacío.
    id: 'el-circo-de-tu-amor',
    title: 'El Circo de Tu Amor',
    releaseDate: '2022-02-14',
    coverUrl: `${bp}/images/sesion-02.jpg`
  }
];

/**
 * Qué tipo de pieza es. Se deriva del dato, nunca se declara: si hay
 * `youtubeId` hay videoclip. Ver `ReleaseKind` en `./types.ts`.
 */
export function releaseKind(release: MusicRelease): ReleaseKind {
  return release.youtubeId ? 'video' : 'audio';
}

/**
 * Los lanzamientos del más reciente al más antiguo.
 *
 * Ordena sobre una COPIA: `sort` muta el array que recibe, y este es un módulo
 * compartido — ordenarlo en sitio alteraría los datos para todo lo demás. Es la
 * misma trampa que ya está documentada en `UpcomingShows`.
 *
 * `localeCompare` sobre fechas ISO ordena bien porque el formato AAAA-MM-DD es
 * lexicográficamente equivalente a su orden cronológico.
 */
export function releasesByDateDesc(
  releases: readonly MusicRelease[] = musicReleases
): MusicRelease[] {
  return [...releases].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}
