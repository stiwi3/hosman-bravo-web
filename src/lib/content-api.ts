import type { MusicRelease } from '@/data/types';

/* ---------------------------------------------------------------------------
   FRONTERA CON EL CONTENIDO PUBLICADO.

   Aquí, y solo aquí, se sabe de dónde sale el contenido. `MusicSection` y
   `MusicCard` no lo saben ni deben saberlo: reciben `MusicRelease[]` y ya está.

       public/content.json  (snapshot estático del propio sitio)
         → fetch
         → validación del sobre (esquema)
         → validación fila a fila
         → mapeo snake_case → camelCase
         → MusicRelease[]

   EL NAVEGADOR YA NO HABLA CON GOOGLE. Antes pedía el catálogo a un Apps
   Script que leía la hoja en vivo, y una sola petición llegó a tardar 23 s: el
   visitante pagaba la latencia de Google. Ahora Hosman edita la hoja y pulsa
   PUBLICAR; el Apps Script valida y escribe `public/content.json` en el
   repositorio, y la web sirve ese archivo como un asset más. Si Google falla o
   tarda, lo sufre Hosman una vez al publicar — nunca el visitante, que sigue
   viendo el último snapshot válido.

   PRINCIPIO, QUE NO CAMBIA: el contenido NO es de fiar aunque venga de nuestro
   propio repositorio. Lo escribe una persona en una hoja de cálculo, así que
   puede traer una celda mal pegada, una fecha imposible o un enlace en la
   columna equivocada, y el Apps Script no es la última barrera. Una fila
   inválida se descarta SOLA; no puede tumbar el catálogo entero. Un campo
   inválido se descarta SOLO; no puede tumbar su fila.
--------------------------------------------------------------------------- */

/** Forma que promete el snapshot. Nada de esto se da por bueno sin validar. */
interface RawRelease {
  id?: unknown;
  title?: unknown;
  release_date?: unknown;
  cover_url?: unknown;
  youtube_id?: unknown;
  spotify_url?: unknown;
  apple_music_url?: unknown;
  youtube_music_url?: unknown;
  amazon_music_url?: unknown;
  deezer_url?: unknown;
  tidal_url?: unknown;
  soundcloud_url?: unknown;
  audiomack_url?: unknown;
  audio_preview_url?: unknown;
  preview_start_sec?: unknown;
  has_video?: unknown;
}

/** Por qué se descartó algo. Se usa solo para el aviso en desarrollo. */
export interface RejectionNote {
  id: string;
  field: string;
  reason: string;
}

export interface MusicFetchResult {
  releases: MusicRelease[];
  updatedAt?: string;
  /** Filas descartadas enteras, con el motivo. */
  rejectedRows: RejectionNote[];
  /** Campos sueltos descartados dentro de filas por lo demás válidas. */
  rejectedFields: RejectionNote[];
}

/* --- utilidades de validación -------------------------------------------- */

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Convierte `DD-MM-YYYY` en ISO `AAAA-MM-DD`.
 *
 * A mano y NO con `new Date('12-08-2022')`: ese constructor interpreta la
 * cadena según reglas del motor —en la práctica como MM-DD-YYYY en varios
 * navegadores—, así que el 12 de agosto se convertiría en 8 de diciembre. Con
 * un día > 12 directamente daría `Invalid Date`. El error sería silencioso y
 * solo cambiaría el ORDEN de la sección, que es justo lo que nadie mira.
 *
 * Se devuelve ISO porque es el formato que ya usa el modelo interno y el que
 * permite ordenar comparando cadenas.
 */
export function parseDdMmYyyy(value: unknown): string | undefined {
  const raw = asTrimmedString(value);
  if (!raw) return undefined;

  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(raw);
  if (!match) return undefined;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (month < 1 || month > 12) return undefined;
  if (day < 1 || day > 31) return undefined;
  if (year < 1900 || year > 2999) return undefined;

  // Que la fecha EXISTA: descarta 31-02 o 31-04. Se construye con componentes
  // (no parseando una cadena) y se comprueba que el motor no la haya
  // desbordado al mes siguiente.
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Un ID de YouTube y nada más: 11 caracteres del alfabeto de YouTube.
 *
 * Es deliberadamente estricto para que una celda con un `<iframe>`, una URL
 * completa o cualquier fragmento de HTML no pueda pasar de aquí — el juego de
 * caracteres ya excluye `<`, `>`, `/`, `"`, `:` y el espacio.
 */
export function parseYouTubeId(value: unknown): string | undefined {
  const raw = asTrimmedString(value);
  if (!raw) return undefined;
  return /^[A-Za-z0-9_-]{11}$/.test(raw) ? raw : undefined;
}

/**
 * URL segura: solo `http:` y `https:`.
 *
 * Rechaza de plano `javascript:`, `data:`, `vbscript:` y cualquier otro
 * esquema — una celda de la hoja no puede acabar siendo un vector de ejecución
 * en el `href` de un enlace.
 */
function parseHttpUrl(value: unknown): URL | undefined {
  const raw = asTrimmedString(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url;
  } catch {
    return undefined;
  }
}

/**
 * Reconocedores por plataforma.
 *
 * Existen porque el contenido lo escribe una persona en una hoja de cálculo y
 * pegar un enlace en la columna de al lado es el error más fácil de cometer.
 * Sin esta comprobación, un enlace de Amazon en `apple_music_url` se pintaría
 * bajo el icono de Apple Music y mandaría al oyente al sitio equivocado —y eso
 * está pasando HOY en la fila `borracho-todavia`.
 *
 * Se compara el HOSTNAME completo, nunca `includes()`: `music.apple.com.evil`
 * contiene «music.apple.com» y no es Apple.
 */
const PLATFORM_HOSTS: Record<string, (host: string) => boolean> = {
  spotify: (h) => h === 'open.spotify.com',
  appleMusic: (h) => h === 'music.apple.com',
  youtubeMusic: (h) => h === 'music.youtube.com',
  // Amazon Music tiene un dominio por país (`.es`, `.fr`, `.com`…), así que se
  // acepta cualquier TLD pero SIEMPRE bajo el subdominio `music.amazon.`.
  amazonMusic: (h) => /^music\.amazon\.[a-z]{2,}(\.[a-z]{2,})?$/.test(h),
  deezer: (h) => h === 'deezer.com' || h === 'www.deezer.com',
  tidal: (h) => h === 'tidal.com' || h === 'www.tidal.com' || h === 'listen.tidal.com',
  soundcloud: (h) => h === 'soundcloud.com' || h === 'www.soundcloud.com',
  audiomack: (h) => h === 'audiomack.com' || h === 'www.audiomack.com'
};

/** Segundos de arranque de la preview: entero, finito y no negativo. */
function parseStartSeconds(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value < 0 || value > 60 * 60) return undefined;
  return Math.floor(value);
}

/* --- mapeo ---------------------------------------------------------------- */

function mapRow(
  row: RawRelease,
  rejectedFields: RejectionNote[]
): MusicRelease | { error: string; field: string } {
  const id = asTrimmedString(row.id);
  if (!id) return { error: 'sin id utilizable', field: 'id' };

  const title = asTrimmedString(row.title);
  if (!title) return { error: 'sin título', field: 'title' };

  const releaseDate = parseDdMmYyyy(row.release_date);
  if (!releaseDate) {
    return { error: `fecha no válida (${String(row.release_date)})`, field: 'release_date' };
  }

  /** Valida una URL de plataforma y anota por qué se cae, si se cae. */
  const platform = (
    field: string,
    value: unknown,
    key: keyof typeof PLATFORM_HOSTS
  ): string | undefined => {
    const raw = asTrimmedString(value);
    if (!raw) return undefined;

    const url = parseHttpUrl(raw);
    if (!url) {
      rejectedFields.push({ id, field, reason: `no es una URL http(s) válida: ${raw}` });
      return undefined;
    }
    if (!PLATFORM_HOSTS[key](url.hostname)) {
      rejectedFields.push({
        id,
        field,
        reason: `el dominio ${url.hostname} no corresponde a la plataforma`
      });
      return undefined;
    }
    return url.toString();
  };

  const coverRaw = asTrimmedString(row.cover_url);
  let coverUrl: string | undefined;
  if (coverRaw) {
    const url = parseHttpUrl(coverRaw);
    if (url) coverUrl = url.toString();
    else rejectedFields.push({ id, field: 'cover_url', reason: `URL no válida: ${coverRaw}` });
  }

  const youtubeRaw = asTrimmedString(row.youtube_id);
  const youtubeId = parseYouTubeId(youtubeRaw);
  if (youtubeRaw && !youtubeId) {
    rejectedFields.push({
      id,
      field: 'youtube_id',
      reason: `no es un identificador de 11 caracteres: ${youtubeRaw}`
    });
  }

  const previewRaw = row.audio_preview_url;
  const previewUrl = parseHttpUrl(previewRaw);
  if (asTrimmedString(previewRaw) && !previewUrl) {
    rejectedFields.push({ id, field: 'audio_preview_url', reason: 'URL no válida' });
  }

  return {
    id,
    title,
    releaseDate,
    coverUrl,
    youtubeId,
    spotifyUrl: platform('spotify_url', row.spotify_url, 'spotify'),
    appleMusicUrl: platform('apple_music_url', row.apple_music_url, 'appleMusic'),
    youtubeMusicUrl: platform('youtube_music_url', row.youtube_music_url, 'youtubeMusic'),
    amazonMusicUrl: platform('amazon_music_url', row.amazon_music_url, 'amazonMusic'),
    deezerUrl: platform('deezer_url', row.deezer_url, 'deezer'),
    tidalUrl: platform('tidal_url', row.tidal_url, 'tidal'),
    soundcloudUrl: platform('soundcloud_url', row.soundcloud_url, 'soundcloud'),
    audiomackUrl: platform('audiomack_url', row.audiomack_url, 'audiomack'),
    audioPreviewUrl: previewUrl?.toString(),
    previewStartSec: parseStartSeconds(row.preview_start_sec)
  };
}

/* --- fetch ---------------------------------------------------------------- */

/**
 * Ruta del snapshot publicado.
 *
 * Es un asset del propio sitio, así que va prefijada con el `basePath` igual
 * que las imágenes: en local resuelve a `/content.json` y en GitHub Pages a
 * `/hosman-bravo-web/content.json`. Nunca una URL absoluta a GitHub ni a
 * `raw.githubusercontent.com`: el navegador debe descargar el mismo archivo
 * que sirve el hosting, sea cual sea.
 */
const CONTENT_SNAPSHOT_URL = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/content.json`;

/**
 * Red de seguridad por si la conexión se queda colgada sin responder.
 *
 * Con el snapshot servido por el propio hosting esto casi no debería saltar
 * nunca —si ese archivo no llega, el sitio entero está en problemas—, pero
 * cuesta cuatro líneas y evita que la sección espere indefinidamente.
 */
const TIMEOUT_MS = 5000;

/** La versión de esquema que este código sabe leer. */
const SUPPORTED_SCHEMA_VERSION = 1;

/**
 * Trae y normaliza el catálogo de música. Sin caché: es la petición cruda.
 *
 * Lanza si la red o el ESQUEMA del snapshot fallan; quien llama decide qué
 * hacer. Lo que NO lanza es una fila mala: eso se descarta y se sigue, para
 * que un enlace mal pegado no deje al artista sin discografía.
 *
 * Para consumo normal usa `getMusicReleases()`, que añade caché y reutiliza
 * las peticiones en vuelo.
 */
export async function fetchMusicReleases(): Promise<MusicFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(CONTENT_SNAPSHOT_URL, {
      signal: controller.signal,
      /* `no-cache` y NO `no-store`: se revalida siempre contra el servidor,
         pero si el snapshot no ha cambiado responde 304 y no se descarga el
         cuerpo. Así una publicación nueva de Hosman se ve en la siguiente
         carga sin recompilar el frontend, y a la vez no se malgasta ancho de
         banda cuando no ha publicado nada. `no-store` obligaría a bajar el
         JSON entero cada vez sin ninguna ganancia. */
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`El snapshot respondió ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      throw new Error('El snapshot no es un objeto');
    }

    /* VALIDACIÓN DEL SOBRE. Que el archivo salga de nuestro repositorio no lo
       hace fiable: lo genera un Apps Script a partir de lo que alguien escribe
       en una hoja. Se comprueba explícitamente antes de mirar las filas. */
    const body = payload as {
      schemaVersion?: unknown;
      music?: unknown;
      publishedAt?: unknown;
    };

    if (body.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
      throw new Error(
        `Esquema no compatible: se esperaba ${SUPPORTED_SCHEMA_VERSION} y llegó ${String(
          body.schemaVersion
        )}`
      );
    }
    if (!Array.isArray(body.music)) {
      throw new Error('El snapshot no trae un array en `music`');
    }

    const releases: MusicRelease[] = [];
    const rejectedRows: RejectionNote[] = [];
    const rejectedFields: RejectionNote[] = [];

    for (const entry of body.music as RawRelease[]) {
      if (typeof entry !== 'object' || entry === null) {
        rejectedRows.push({ id: '(desconocido)', field: '(fila)', reason: 'no es un objeto' });
        continue;
      }

      const mapped = mapRow(entry, rejectedFields);
      if ('error' in mapped) {
        rejectedRows.push({
          id: asTrimmedString(entry.id) ?? '(sin id)',
          field: mapped.field,
          reason: mapped.error
        });
        continue;
      }
      releases.push(mapped);
    }

    return {
      releases,
      // Solo se acepta si es una cadena con algo: se muestra en el aviso de
      // desarrollo, no se interpreta como fecha.
      updatedAt: asTrimmedString(body.publishedAt),
      rejectedRows,
      rejectedFields
    };
  } finally {
    clearTimeout(timer);
  }
}

/* --- caché ---------------------------------------------------------------- */

/**
 * CACHÉ DEL CATÁLOGO. Se mantiene, pero ahora sirve para otra cosa.
 *
 * Con el Apps Script existía para no pagar ~3 s de latencia de Google en cada
 * visita. Eso ya no aplica: el snapshot es un archivo del propio hosting y la
 * caché HTTP del navegador se encarga del tráfico.
 *
 * SIGUE HACIENDO FALTA por una razón distinta y puramente de interfaz:
 * `MusicSection` vive dentro de `children`, así que **se remonta en cada
 * navegación a `/musica`**. Sin nada en memoria, cada reentrada arrancaría con
 * el estado de carga y el esqueleto parpadearía aunque los datos llegasen del
 * disco en milisegundos — porque `fetch` es asíncrono por definición y siempre
 * habría al menos un render sin datos. La caché permite que el primer render
 * ya traiga el catálogo (ver `peekMusicReleases`).
 *
 * El TTL, además, es lo que hace que una publicación nueva de Hosman aparezca
 * en una pestaña que lleve horas abierta, sin obligar a recargar.
 *
 * Es deliberadamente pequeña: dos variables de módulo. Cualquier biblioteca de
 * datos sería infraestructura nueva para un único recurso.
 *
 * NO se persiste en `localStorage`: la vida útil de esta caché es la de la
 * pestaña. Persistirla obligaría a decidir invalidación entre sesiones y a
 * tratar datos corruptos de una sesión anterior, y no hace falta.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Último snapshot bueno, con el momento en que se leyó. */
let cached: { result: MusicFetchResult; at: number } | null = null;

/**
 * Petición en curso, si la hay. Dos montajes simultáneos —o un remontaje
 * rápido mientras la primera sigue viajando— comparten esta promesa en vez de
 * abrir una segunda conexión.
 */
let inFlight: Promise<MusicFetchResult> | null = null;

/** Registro de diagnóstico, solo en desarrollo y solo al resolver la red. */
function logResult(result: MusicFetchResult) {
  if (process.env.NODE_ENV === 'production') return;
  console.info(
    `[música] ${result.releases.length} lanzamientos desde el snapshot` +
      (result.updatedAt ? ` · publicado ${result.updatedAt}` : '')
  );
  for (const r of result.rejectedRows) {
    console.warn(`[música] fila descartada «${r.id}» (${r.field}): ${r.reason}`);
  }
  for (const r of result.rejectedFields) {
    console.warn(`[música] campo descartado «${r.id}».${r.field}: ${r.reason}`);
  }
}

/**
 * El catálogo cacheado, si sigue fresco. `null` si no hay o ya caducó.
 *
 * Lo usa el hook para pintar de inmediato al volver a la sección, sin pasar
 * por el estado de carga.
 */
export function peekMusicReleases(): MusicFetchResult | null {
  if (!cached) return null;
  if (Date.now() - cached.at >= CACHE_TTL_MS) return null;
  return cached.result;
}

/**
 * El catálogo, con caché.
 *
 *   · dentro del TTL      → se devuelve lo cacheado sin tocar la red;
 *   · petición en vuelo   → se comparte esa misma promesa;
 *   · caducado o vacío    → se consulta de nuevo.
 *
 * SI LA NUEVA CONSULTA FALLA pero hay un catálogo anterior, se devuelve
 * ese aunque esté caducado: datos reales viejos son mejores que ninguno. No se
 * refresca su marca de tiempo, así que el siguiente intento volverá a probar la
 * red en lugar de quedarse anclado a una copia rancia.
 */
export function getMusicReleases(): Promise<MusicFetchResult> {
  const fresh = peekMusicReleases();
  if (fresh) return Promise.resolve(fresh);

  if (inFlight) return inFlight;

  inFlight = fetchMusicReleases()
    .then((result) => {
      cached = { result, at: Date.now() };
      logResult(result);
      return result;
    })
    .catch((error: unknown) => {
      if (cached) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[música] el snapshot falló; se conserva el catálogo anterior.',
            error
          );
        }
        return cached.result;
      }
      throw error;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
