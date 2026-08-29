import type { MusicRelease } from '@/data/types';

/* ---------------------------------------------------------------------------
   FRONTERA CON EL CONTENIDO EXTERNO.

   Aquí, y solo aquí, se sabe que los datos vienen de una hoja de cálculo a
   través de un Apps Script. `MusicSection` y `MusicCard` no lo saben ni deben
   saberlo: reciben `MusicRelease[]` y ya está.

       Apps Script (JSON)
         → fetch
         → validación fila a fila
         → mapeo snake_case → camelCase
         → MusicRelease[]

   PRINCIPIO: el JSON externo NO es de fiar. Lo edita una persona en una hoja
   de cálculo, así que puede traer una celda mal pegada, una fecha imposible o
   un enlace en la columna equivocada. Una fila inválida se descarta SOLA; no
   puede tumbar el catálogo entero. Un campo inválido se descarta SOLO; no
   puede tumbar su fila.
--------------------------------------------------------------------------- */

/** Forma que promete el Apps Script. Nada de esto se da por bueno sin validar. */
interface RawRelease {
  active?: unknown;
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
  notes?: unknown;
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
    previewStartSec: parseStartSeconds(row.preview_start_sec),
    notes: asTrimmedString(row.notes)
  };
}

/* --- fetch ---------------------------------------------------------------- */

/** URL base del contenido. No es un secreto: es un endpoint público de lectura. */
export const CONTENT_API_URL = process.env.NEXT_PUBLIC_CONTENT_API_URL ?? '';

/** Si el endpoint no responde en este tiempo, se abandona y se usa el fallback. */
const TIMEOUT_MS = 8000;

/**
 * Trae y normaliza el catálogo de música. Sin caché: es la petición cruda.
 *
 * Lanza si la red o la forma de la respuesta fallan; quien llama decide qué
 * hacer. Lo que NO lanza es una fila mala: eso se descarta y se sigue.
 *
 * Para consumo normal usa `getMusicReleases()`, que añade caché y reutiliza
 * las peticiones en vuelo.
 */
export async function fetchMusicReleases(signal?: AbortSignal): Promise<MusicFetchResult> {
  if (!CONTENT_API_URL) {
    throw new Error('NEXT_PUBLIC_CONTENT_API_URL no está configurada');
  }

  // Timeout propio, combinado con el `signal` de quien llama (el desmontaje del
  // componente). Sin esto, un endpoint que acepta la conexión y no responde
  // dejaría la sección esperando para siempre.
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), TIMEOUT_MS);
  const signals = signal ? [signal, timeout.signal] : [timeout.signal];

  try {
    const response = await fetch(`${CONTENT_API_URL}?resource=music`, {
      signal: AbortSignal.any(signals),
      // El interés es ver los cambios de la hoja sin recompilar, así que no se
      // cachea la respuesta.
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`El endpoint respondió ${response.status}`);
    }

    const payload: unknown = await response.json();
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('La respuesta no es un objeto');
    }

    const body = payload as { ok?: unknown; data?: unknown; updatedAt?: unknown };
    if (body.ok !== true) throw new Error('La respuesta no trae ok: true');
    if (!Array.isArray(body.data)) throw new Error('La respuesta no trae un array en data');

    const releases: MusicRelease[] = [];
    const rejectedRows: RejectionNote[] = [];
    const rejectedFields: RejectionNote[] = [];

    for (const entry of body.data as RawRelease[]) {
      if (typeof entry !== 'object' || entry === null) {
        rejectedRows.push({ id: '(desconocido)', field: '(fila)', reason: 'no es un objeto' });
        continue;
      }
      // El Apps Script ya filtra `active = FALSE`, pero se vuelve a comprobar
      // aquí: es la última barrera antes de publicar algo, y es barata.
      if (entry.active === false) {
        rejectedRows.push({
          id: asTrimmedString(entry.id) ?? '(sin id)',
          field: 'active',
          reason: 'marcada como inactiva'
        });
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
      updatedAt: asTrimmedString(body.updatedAt),
      rejectedRows,
      rejectedFields
    };
  } finally {
    clearTimeout(timer);
  }
}

/* --- caché ---------------------------------------------------------------- */

/**
 * CACHÉ DEL CATÁLOGO.
 *
 * El problema que resuelve: `MusicSection` vive dentro de `children`, así que
 * se remonta en cada navegación a `/musica`. Sin caché, cada visita pagaba una
 * consulta al Apps Script — medidos ~3 s de espera con el esqueleto delante,
 * una y otra vez.
 *
 * Es deliberadamente pequeña: dos variables de módulo. No hace falta más, y
 * cualquier biblioteca de datos sería infraestructura nueva para un único
 * recurso.
 *
 * NO se persiste en `localStorage`: la vida útil de esta caché es la de la
 * pestaña. Persistirla obligaría a decidir invalidación entre sesiones y a
 * tratar datos corruptos de una sesión anterior, y todavía no hace falta.
 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Última respuesta buena del endpoint, con el momento en que se obtuvo. */
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
    `[música] ${result.releases.length} lanzamientos desde el endpoint` +
      (result.updatedAt ? ` · actualizado ${result.updatedAt}` : '')
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
 * SI LA NUEVA CONSULTA FALLA pero hay un catálogo remoto anterior, se devuelve
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
            '[música] el endpoint falló; se conserva el catálogo remoto anterior.',
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
