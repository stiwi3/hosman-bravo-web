/* ---------------------------------------------------------------------------
   Frontera de tipos del proyecto.

   Aquí vive la FORMA de los datos y de la navegación. Ningún componente debe
   definir el contrato de los datos que pinta: antes `ShowEvent` estaba dentro
   de `NextShowTicket.tsx` y `MenuItem` dentro de `LeatherMenu.tsx`, así que el
   componente que dibuja mandaba sobre el dato. Con los tipos aquí, cambiar la
   fuente (hoy `hosman-data.ts`, mañana una hoja de cálculo) no obliga a tocar
   el JSX.

   Sin librerías de validación por ahora: solo tipos.
--------------------------------------------------------------------------- */

/**
 * Identificador de cada escena. **Coincide exactamente con el segmento de ruta**
 * (`/el-show` → `'el-show'`), salvo INICIO, que vive en `/` y no tiene segmento.
 *
 * Una sola taxonomía para ruta, icono y estado activo: no hay mapa de
 * traducción que pueda desincronizarse.
 */
export type SectionId =
  | 'home'
  | 'el-show'
  | 'musica'
  | 'galeria'
  | 'sobre-mi'
  | 'contacto';

/**
 * Lo que `useSelectedLayoutSegment()` puede devolver: el segmento activo, o
 * `null` cuando la ruta es `/`. Convertirlo a `SectionId` es `segment ?? 'home'`.
 */
export type SectionSegment = Exclude<SectionId, 'home'>;

/** Una entrada de navegación: la misma para el menú de cuero y para la nav central. */
export interface NavItem {
  id: SectionId;
  label: string;
  /** Ruta sin `basePath`: `next/link` lo aplica solo. Nunca escribir `${bp}` aquí. */
  href: string;
  /** Distintivo opcional junto a la etiqueta. Se decide aquí, no dentro del menú. */
  badge?: string;
}

/**
 * Orden y contenido de la navegación. Fuente única: el menú de cuero, la
 * navegación central y el pie leen de aquí.
 *
 * ⚠️ Añadir una entrada obliga a tres cosas más: crear su carpeta de ruta en
 * `src/app/`, crear su sección en `src/components/sections/`, y darle icono en
 * `LeatherMenuPhoto` (si falta, es error de compilación, no un fallo silencioso).
 * Y ojo: el cuerpo del menú es una fotografía con SEIS renglones impresos —
 * una séptima entrada exige regenerar el asset. Ver ARCHITECTURE.md §9.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'home', label: 'INICIO', href: '/' },
  { id: 'el-show', label: 'EL SHOW', href: '/el-show' },
  { id: 'musica', label: 'MÚSICA', href: '/musica', badge: 'NUEVO' },
  { id: 'galeria', label: 'GALERÍA', href: '/galeria' },
  { id: 'sobre-mi', label: 'SOBRE MÍ', href: '/sobre-mi' },
  { id: 'contacto', label: 'CONTACTO', href: '/contacto' }
];

/**
 * Una fecha del bloque PRÓXIMOS SHOWS.
 *
 * `date` en ISO (AAAA-MM-DD): es lo que permitirá descartar fechas pasadas
 * comparando contra `Date.now()` sin cambiar la forma del dato.
 * `ticketUrl` vacío = la entrada no es un enlace y no muestra el indicador de
 * pulsación.
 */
export interface ShowEvent {
  id: string;
  date: string;
  title: string;
  location: string;
  time: string;
  ticketUrl?: string;
}

/** Un caballo del elenco ecuestre. */
export interface Horse {
  name: string;
  description: string;
  role: string;
  color: string;
}

/** Una canción del listado de SOBRE MÍ. */
export interface Song {
  title: string;
  year: number;
}

/* ---------------------------------------------------------------------------
   MÚSICA

   Este contrato está pensado para que la MISMA estructura llegue después desde
   un endpoint conectado a Google Sheets. Cuando eso ocurra solo cambia el
   origen (`src/data/music-releases.ts`); ni los tipos ni la interfaz cambian.

   Por eso todo lo opcional es opcional de verdad: la UI decide qué mostrar a
   partir de lo que hay, no al revés. Una hoja de cálculo tendrá celdas vacías.
--------------------------------------------------------------------------- */

/**
 * Qué es un lanzamiento se DERIVA de los datos, no se declara a mano: si tiene
 * `youtubeId` es un videoclip, y si no, un single. Así una hoja de cálculo no
 * puede contradecirse a sí misma diciendo `video` en una fila sin vídeo.
 */
export type ReleaseKind = 'video' | 'audio';

/** Un lanzamiento musical. */
export interface MusicRelease {
  id: string;
  title: string;
  /** ISO (AAAA-MM-DD). Ordena la sección: el más reciente es el destacado. */
  releaseDate: string;
  /**
   * Portada del single o miniatura del videoclip. Si falta, la pieza cae en el
   * fallback de marca — no se rompe ni deja un hueco.
   */
  coverUrl?: string;
  /**
   * Identificador del vídeo en YouTube. Su presencia es lo que convierte al
   * lanzamiento en `video`. Más adelante alimentará la preview silenciosa y el
   * reproductor; hoy solo clasifica.
   */
  youtubeId?: string;
  spotifyUrl?: string;
  appleMusicUrl?: string;
  youtubeMusicUrl?: string;
}
