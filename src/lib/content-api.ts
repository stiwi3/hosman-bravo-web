import type { MusicRelease, ShowEvent, ShowEventStatus, ShowEventType } from '@/data/types';
import contentSnapshot from '../../public/content.json';

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
  preview_video_url?: unknown;
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

/** Carpeta única donde pueden vivir las portadas propias. */
const COVER_DIR = '/images/covers/';
/** Carpeta única donde pueden vivir los clips de preview propios. */
const PREVIEW_DIR = '/videos/previews/';

/**
 * Referencia a un asset nuestro: URL externa http(s), o ruta interna acotada
 * a una carpeta concreta.
 *
 * Las rutas internas se limitan a su directorio a propósito, igual que hace el
 * Apps Script con `cleanUrlOrLocalPath`. `//dominio.com` NO es una ruta interna
 * —el navegador la resuelve como URL absoluta a otro dominio— y cualquier `..`
 * abre la puerta a salir del directorio previsto.
 *
 * La ruta interna sale con el prefijo `${bp}` aplicado, porque en GitHub Pages
 * el sitio vive en un subdirectorio: sin él, `/images/...` da 404 en
 * producción y funciona en local, que es el peor de los fallos posibles.
 *
 * La usan `cover_url` y `preview_video_url`, que solo se diferencian en su
 * carpeta: la regla de seguridad es la misma y no debe escribirse dos veces.
 */
function parseAssetReference(value: unknown, dir: string): string | undefined {
  const raw = asTrimmedString(value);
  if (!raw) return undefined;

  if (raw.startsWith('/')) {
    if (raw.startsWith('//')) return undefined;
    if (!raw.startsWith(dir)) return undefined;
    if (raw.split('/').includes('..')) return undefined;
    return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${raw}`;
  }

  return parseHttpUrl(raw)?.toString();
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
    const cover = parseAssetReference(coverRaw, COVER_DIR);
    if (cover) coverUrl = cover;
    else
      rejectedFields.push({
        id,
        field: 'cover_url',
        reason: `Portada no válida: ${coverRaw}. Debe ser http(s) o una ruta bajo ${COVER_DIR}`
      });
  }

  const previewVideoRaw = asTrimmedString(row.preview_video_url);
  let previewVideoUrl: string | undefined;
  if (previewVideoRaw) {
    const clip = parseAssetReference(previewVideoRaw, PREVIEW_DIR);
    if (clip) previewVideoUrl = clip;
    else
      rejectedFields.push({
        id,
        field: 'preview_video_url',
        reason: `Clip no válido: ${previewVideoRaw}. Debe ser http(s) o una ruta bajo ${PREVIEW_DIR}`
      });
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
    previewVideoUrl,
    previewStartSec: parseStartSeconds(row.preview_start_sec)
  };
}

/* --- eventos -------------------------------------------------------------- */

/* PRÓXIMOS SHOWS — `events` del MISMO snapshot, con la misma filosofía:
   fila inválida fuera sola, campo inválido fuera solo.

   A diferencia de la música, los eventos se leen del `content.json` que se
   compiló con el despliegue, no con `fetch`. Cada publicación desde la hoja
   es un commit a `master` y todo commit a `master` redespliega, así que el
   archivo compilado y el servido son siempre el mismo. A cambio, el bloque
   vive en el hero —capa persistente, medida por el coordinador de geometría—
   y así nace con sus entradas en el HTML exportado: sin esqueleto, sin salto
   de composición al llegar la red y sin fechas de ejemplo que se sustituyen. */

const EVENT_STATUSES: readonly ShowEventStatus[] = [
  'confirmado', 'provisional', 'agotado', 'cancelado', 'privado'
];
const EVENT_TYPES: readonly ShowEventType[] = [
  'concierto', 'show_ecuestre', 'festival', 'evento_privado', 'otro'
];

/** Forma que promete cada evento del snapshot. Nada se da por bueno. */
interface RawEvent {
  active?: unknown;
  id?: unknown;
  date?: unknown;
  time?: unknown;
  event_name?: unknown;
  city?: unknown;
  venue?: unknown;
  event_type?: unknown;
  status?: unknown;
  ticket_url?: unknown;
  booking_url?: unknown;
  country?: unknown;
}

export interface ShowEventsParseResult {
  /** Válidos, ordenados por fecha ascendente. SIN filtrar los pasados. */
  events: ShowEvent[];
  rejectedRows: RejectionNote[];
  rejectedFields: RejectionNote[];
}

/**
 * Códigos ISO de tres letras para los países que pueden aparecer de verdad en
 * la agenda. Es una tabla pequeña y explícita a propósito: no compensa una
 * dependencia para esto, y lo que no esté aquí no tiene forma corta — la
 * entrada conserva el nombre completo y lo recorta con puntos suspensivos.
 *
 * El dato original NUNCA se altera: `country` se publica entero y la forma
 * larga sigue siendo la que se anuncia a un lector de pantalla.
 */
const COUNTRY_CODES: Record<string, string> = {
  colombia: 'COL', 'españa': 'ESP', espana: 'ESP', 'méxico': 'MEX', mexico: 'MEX',
  'estados unidos': 'USA', 'perú': 'PER', peru: 'PER', ecuador: 'ECU',
  venezuela: 'VEN', chile: 'CHL', argentina: 'ARG', 'panamá': 'PAN', panama: 'PAN',
  'costa rica': 'CRI', guatemala: 'GTM', honduras: 'HND', nicaragua: 'NIC',
  'el salvador': 'SLV', bolivia: 'BOL', paraguay: 'PRY', uruguay: 'URY',
  'república dominicana': 'DOM', 'republica dominicana': 'DOM', 'puerto rico': 'PRI',
  cuba: 'CUB', brasil: 'BRA', portugal: 'PRT', italia: 'ITA', francia: 'FRA',
  alemania: 'DEU', 'reino unido': 'GBR', suiza: 'CHE', 'canadá': 'CAN', canada: 'CAN'
};

/**
 * Versión corta de la ubicación, o `undefined` si no hay código para ese país.
 *
 * AQUÍ NO SE DECIDE CUÁL SE USA. Esta capa no sabe nada de anchos: publica las
 * dos formas y es la entrada quien, midiendo su propio hueco, elige. Antes esto
 * se resolvía comparando longitudes de cadena, que no equivale al ancho real.
 */
function buildShortLocation(city: string, country: string | undefined): string | undefined {
  if (!country) return undefined;

  const code = COUNTRY_CODES[country.trim().toLowerCase()];
  return code ? `${city}, ${code}` : undefined;
}

/**
 * Enlace principal de la entrada, según el estado editorial:
 *
 *   cancelado — ninguno. No se vende ni se reserva algo que no va a ocurrir.
 *   agotado   — la venta de entradas queda fuera; si hay un canal de contacto
 *               (`booking_url`, que puede ser el WhatsApp que generó el Apps
 *               Script), ese sí se mantiene.
 *   resto     — `ticket_url` manda y `booking_url` es el respaldo.
 *
 * Sin ninguno de los dos, la entrada se muestra pero no se convierte en enlace.
 */
function primaryEventUrl(
  status: ShowEventStatus | undefined,
  ticketUrl: string | undefined,
  bookingUrl: string | undefined
): string | undefined {
  if (status === 'cancelado') return undefined;
  if (status === 'agotado') return bookingUrl;
  return ticketUrl ?? bookingUrl;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

/**
 * Valida y traduce `events` del snapshot. Pura: no mira la fecha de hoy.
 *
 * Duplicados de `id`: el Apps Script ya los bloquea, pero si llegaran se
 * queda el primero, para que un evento no aparezca dos veces.
 */
export function parseShowEvents(raw: unknown): ShowEventsParseResult {
  const events: ShowEvent[] = [];
  const rejectedRows: RejectionNote[] = [];
  const rejectedFields: RejectionNote[] = [];
  if (!Array.isArray(raw)) return { events, rejectedRows, rejectedFields };

  const seen = new Set<string>();

  for (const entry of raw as unknown[]) {
    if (typeof entry !== 'object' || entry === null) {
      rejectedRows.push({ id: '(desconocido)', field: '(fila)', reason: 'no es un objeto' });
      continue;
    }
    const row = entry as RawEvent;
    const id = asTrimmedString(row.id);
    const reject = (field: string, reason: string) =>
      rejectedRows.push({ id: id ?? '(sin id)', field, reason });

    // `active` no se publica; si apareciera en falso, manda.
    if (row.active === false) { reject('active', 'evento inactivo'); continue; }
    if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) { reject('id', 'sin id utilizable'); continue; }
    if (seen.has(id)) { reject('id', 'id duplicado'); continue; }

    const date = parseDdMmYyyy(row.date);
    if (!date) { reject('date', `fecha no válida (${String(row.date)})`); continue; }

    const title = asTrimmedString(row.event_name);
    if (!title) { reject('event_name', 'sin nombre'); continue; }

    const city = asTrimmedString(row.city);
    if (!city) { reject('city', 'sin ciudad'); continue; }

    const field = (name: string, value: unknown, reason: string) => {
      if (asTrimmedString(value)) rejectedFields.push({ id, field: name, reason });
    };

    const timeRaw = asTrimmedString(row.time);
    const time = timeRaw && /^([01]\d|2[0-3]):[0-5]\d$/.test(timeRaw) ? timeRaw : undefined;
    if (!time) field('time', row.time, `hora no válida: ${String(row.time)}`);

    const status = oneOf(row.status, EVENT_STATUSES);
    if (!status) field('status', row.status, `estado desconocido: ${String(row.status)}`);

    const eventType = oneOf(row.event_type, EVENT_TYPES);
    if (!eventType) field('event_type', row.event_type, `tipo desconocido: ${String(row.event_type)}`);

    const ticketUrl = parseHttpUrl(row.ticket_url)?.toString();
    if (!ticketUrl) field('ticket_url', row.ticket_url, 'URL no válida');
    const bookingUrl = parseHttpUrl(row.booking_url)?.toString();
    if (!bookingUrl) field('booking_url', row.booking_url, 'URL no válida');

    const country = asTrimmedString(row.country);

    seen.add(id);
    events.push({
      id,
      date,
      title,
      location: country ? `${city}, ${country}` : city,
      locationShort: buildShortLocation(city, country),
      // La entrada muestra la hora tal cual la escribió la hoja (hora local del
      // evento), con el sufijo de siempre. No se convierte a ningún huso.
      time: time ? `${time} HRS` : '',
      // Enlace principal según el estado (ver `primaryEventUrl`).
      ticketUrl: primaryEventUrl(status, ticketUrl, bookingUrl),
      // Se conserva como acción secundaria; hoy la entrada no la pinta aparte.
      bookingUrl,
      status,
      eventType
    });
  }

  // Mismo orden que publica el Apps Script: fecha, hora (`HH:mm HRS`, o vacía
  // primero) e id para que sea estable.
  events.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.id.localeCompare(b.id)
  );
  return { events, rejectedRows, rejectedFields };
}

/** Eventos del snapshot compilado con este despliegue, validados una sola vez. */
let publishedShowEvents: ShowEventsParseResult | null = null;

/** Todos los eventos válidos publicados, en orden. Los pasados los quita quien pinta. */
export function getPublishedShowEvents(): readonly ShowEvent[] {
  if (!publishedShowEvents) {
    // El sobre se valida igual que en la música: con otro esquema, nada.
    const body = contentSnapshot as { schemaVersion?: unknown; events?: unknown };
    publishedShowEvents = parseShowEvents(
      body.schemaVersion === SUPPORTED_SCHEMA_VERSION ? body.events : undefined
    );

    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      for (const r of publishedShowEvents.rejectedRows) {
        console.warn(`[eventos] fila descartada «${r.id}» (${r.field}): ${r.reason}`);
      }
      for (const r of publishedShowEvents.rejectedFields) {
        console.warn(`[eventos] campo descartado «${r.id}».${r.field}: ${r.reason}`);
      }
    }
  }
  return publishedShowEvents.events;
}

/**
 * Día (AAAA-MM-DD) que sirve de «hoy» al HTML exportado, que no sabe cuándo
 * se visitará: la víspera, en UTC, de `publishedAt`. Todo evento anterior ya
 * había pasado en cualquier huso cuando se publicó; restar un día evita
 * esconder uno que en América todavía es hoy. Sale del snapshot, así que el
 * servidor y la hidratación calculan exactamente lo mismo.
 */
export function getPublishedFloorDay(): string | null {
  const raw = (contentSnapshot as { publishedAt?: unknown }).publishedAt;
  const time = typeof raw === 'string' ? Date.parse(raw) : NaN;
  if (!Number.isFinite(time)) return null;
  return new Date(time - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Descarta los eventos anteriores a `todayIso` (AAAA-MM-DD). El día del evento
 * sigue visible entero: la hoja no dice a qué hora termina.
 */
export function upcomingShowEvents(
  events: readonly ShowEvent[],
  todayIso: string
): ShowEvent[] {
  return events.filter((event) => event.date >= todayIso);
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
