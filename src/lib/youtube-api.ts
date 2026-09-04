/* ---------------------------------------------------------------------------
   Cargador compartido de la IFrame Player API de YouTube.

   POR QUÉ EXISTE ESTE ARCHIVO Y NO LO USA EL MODAL
   `YouTubeModal` incrusta un `<iframe>` normal a propósito (ver ARCHITECTURE
   §4): abre un vídeo con sonido y al cerrarse desaparece, así que no necesita
   mandar sobre el reproductor desde fuera. Las previews sí: hay que silenciar,
   arrancar en un segundo concreto, pausar al salir del hover y saber cuándo
   está de verdad reproduciendo para no dejar un hueco negro. Eso solo lo da la
   API.

   LOS DOS PROBLEMAS QUE RESUELVE
   1. `window.onYouTubeIframeAPIReady` es un callback GLOBAL y ÚNICO. Si cada
      consumidor lo asigna por su cuenta, el último pisa a los demás y esos se
      quedan esperando para siempre. Aquí se asigna UNA vez y se encadena el
      que hubiera antes, por si otro código lo hubiese puesto.
   2. YouTube lo llama UNA sola vez, al descargarse el script. Quien llegue
      después no recibe nada — de ahí la comprobación inmediata de
      `window.YT.Player`, que cubre a los consumidores tardíos.

   La promesa se cachea a nivel de módulo, así que el `<script>` se inyecta una
   sola vez por mucho que se llame. Y no se carga en el import: solo cuando
   alguien pide de verdad un reproductor.
--------------------------------------------------------------------------- */

/** Estados de `onStateChange` que nos importan. `1` es el único que garantiza
 *  que hay imagen en movimiento: entre `onReady` y esto está el buffering, que
 *  es justo cuando YouTube pinta su fondo negro. */
export const YT_REPRODUCIENDO = 1;

export interface YouTubePlayer {
  destroy(): void;
  mute(): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(segundos: number, permitirBusquedaAdelantada: boolean): void;
  unloadModule(modulo: string): void;
}

interface YouTubeApi {
  Player: new (
    elemento: HTMLElement,
    opciones: {
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (evento: { target: YouTubePlayer }) => void;
        onStateChange?: (evento: { data: number; target: YouTubePlayer }) => void;
        onError?: (evento: { data: number }) => void;
      };
    }
  ) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SCRIPT_SRC = 'https://www.youtube.com/iframe_api';

let promesa: Promise<YouTubeApi> | null = null;

/**
 * Devuelve la API, cargándola la primera vez. Idempotente: llamarla N veces
 * inyecta un solo `<script>` y devuelve siempre la misma promesa.
 *
 * Solo debe llamarse desde el navegador (efecto o manejador de evento), nunca
 * durante el render: los componentes de cliente también se prerenderizan en el
 * build del export estático, y allí no hay `window`.
 */
export function cargarYouTubeApi(): Promise<YouTubeApi> {
  if (promesa) return promesa;

  promesa = new Promise<YouTubeApi>((resolver) => {
    if (window.YT?.Player) {
      resolver(window.YT);
      return;
    }

    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolver(window.YT as YouTubeApi);
    };

    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return promesa;
}

/**
 * Opciones del reproductor para una preview.
 *
 * ⚠️ `controls: 0` quita la barra inferior, pero **YouTube no permite ocultar
 * el rótulo del título ni el botón central**: `modestbranding` está obsoleto y
 * lo ignoran. Eso se resuelve recortando el encuadre en CSS (ver
 * `ReleasePreview`), no aquí.
 *
 * `cc_load_policy: 0` tampoco basta para los subtítulos si el espectador los
 * tiene activados en su cuenta — hay que descargar el módulo con el
 * reproductor ya vivo, lo que hace `apagaSubtitulos`.
 */
export function opcionesDePreview(startSec: number): Record<string, string | number> {
  return {
    autoplay: 0,
    mute: 1,
    controls: 0,
    rel: 0,
    playsinline: 1,
    disablekb: 1,
    fs: 0,
    iv_load_policy: 3,
    cc_load_policy: 0,
    start: Math.max(0, Math.floor(startSec))
  };
}

/** Descarga el módulo de subtítulos. Se prueban los dos nombres porque el
 *  módulo ha cambiado de etiqueta entre versiones de la API. */
export function apagaSubtitulos(player: YouTubePlayer): void {
  try {
    player.unloadModule('captions');
  } catch {
    /* el módulo puede no existir todavía; no es un fallo */
  }
  try {
    player.unloadModule('cc');
  } catch {
    /* íd. */
  }
}
