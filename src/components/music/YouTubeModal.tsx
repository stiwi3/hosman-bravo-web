'use client';

import { useEffect, useRef } from 'react';
import { useAudio } from '@/components/audio/AudioProvider';
import { useScrollLock } from '@/hooks/useScrollLock';

/* ---------------------------------------------------------------------------
   El videoclip, a pantalla completa.

   CICLO DE VIDA = MONTAJE. El modal no recibe ninguna prop `isOpen`: existe
   mientras hay un vídeo que ver y desaparece cuando no lo hay. Así el bloqueo
   de scroll, la suspensión del audio y la destrucción del reproductor son la
   limpieza natural de React y no tres apagados manuales que puedan
   desincronizarse.

   POR QUÉ UN `<iframe>` Y NO LA IFRAME PLAYER API (`YT.Player`)
   La API hace falta cuando hay que MANDAR sobre el reproductor desde fuera:
   silenciar, arrancar en un segundo concreto, coordinar varias previews para
   que solo suene una. Nada de eso ocurre aquí — este modal abre un vídeo, con
   sonido, desde el principio, y al cerrarse desaparece.

   Traerla ahora costaría cuatro problemas que este archivo no tiene:

     · `window.onYouTubeIframeAPIReady` es un callback GLOBAL y único: hay que
       repartirlo entre consumidores sin que uno pise a otro, y no se vuelve a
       disparar para quien llegue después de que el script cargue;
     · `destroy()` no está documentado como idempotente ni como seguro antes de
       `onReady`, así que hay que protegerlo con banderas;
     · si el componente se desmonta mientras el script carga, hay que cancelar
       la creación del player o destruirlo nada más nacer;
     · el clic del usuario deja de estar pegado a la creación del reproductor,
       porque en medio hay una carga asíncrona — y con ella se debilita la
       activación que el navegador exige para reproducir CON SONIDO.

   Un `<iframe>` se crea en el mismo gesto, se destruye solo al desmontarse y
   no necesita ni cargador compartido ni callback global. Cuando lleguen las
   previews silenciosas —que sí necesitan mandar sobre varios reproductores a
   la vez— será el momento de montar el cargador, con sus requisitos reales
   delante y no adivinados.

   CONTRAPARTIDA ACEPTADA: sin la API no se pueden leer los códigos de error
   (101/150 = vídeo no embebible). No queda un hueco negro, porque YouTube
   pinta su propio aviso dentro del iframe con enlace para verlo en su sitio;
   simplemente no podemos sustituir ese aviso por uno nuestro.

   ⚠️ LÍMITE REAL DEL FOCO. El reproductor es un documento de otro origen: en
   cuanto el foco entra en él, sus pulsaciones ya no llegan a esta página, así
   que ni la trampa de foco ni Escape pueden actuar desde dentro del vídeo. Es
   inevitable con cualquier incrustación de YouTube. Por eso el botón de cerrar
   va FUERA del reproductor, es lo primero que recibe el foco, y el fondo
   también cierra.
--------------------------------------------------------------------------- */

/** Quién pide apartar la canción de fondo. Ver `suspend`/`release` en `AudioProvider`. */
const SUSPEND_ID = 'youtube-modal';

/**
 * Dominio sin cookies de seguimiento. Es el mismo reproductor: YouTube no
 * usa la reproducción para personalizar recomendaciones y sirve publicidad no
 * personalizada. No cuesta nada y es lo correcto para una web de vitrina.
 */
const EMBED_HOST = 'https://www.youtube-nocookie.com';

/**
 * `autoplay` necesita además el permiso delegado en el atributo `allow` del
 * iframe; sin él el navegador lo ignora. `playsinline` evita que iOS se lleve
 * el vídeo a su reproductor de pantalla completa y deje el modal detrás.
 *
 * Si aun así el navegador bloquea la reproducción con sonido, YouTube muestra
 * su propio botón de play: el respaldo ya viene puesto.
 */
function embedUrl(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1'
  });
  return `${EMBED_HOST}/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
}

export function YouTubeModal({
  videoId,
  title,
  onClose
}: {
  videoId: string;
  title: string;
  onClose: () => void;
}) {
  const { suspend, release } = useAudio();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  /* El scroll se bloquea con el contador compartido, NUNCA escribiendo
     `document.body.style.overflow` a mano: el telón usa el mismo `body` y el
     primero en soltarlo devolvería el scroll con el otro todavía abierto. */
  useScrollLock(true);

  /* La canción de fondo se aparta mientras dura el vídeo. `release` solo la
     reanuda si estaba sonando al apartarla, así que a quien la había pausado
     a propósito no se le arranca sola al cerrar. */
  useEffect(() => {
    suspend(SUSPEND_ID);
    return () => release(SUSPEND_ID);
  }, [suspend, release]);

  /* El foco entra en el modal por el botón de cerrar: es la salida, y es lo
     único que conviene tener a mano nada más abrirse. */
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      /* Trampa de foco sobre lo NUESTRO: el botón de cerrar y el reproductor.
         Mientras el foco esté en la página, el tabulador da la vuelta aquí
         dentro en vez de irse a la cabecera o a las tarjetas de detrás. */
      const root = dialogRef.current;
      const first = closeRef.current;
      const last = frameRef.current;
      if (!root || !first || !last) return;

      const active = document.activeElement;
      const outside = !root.contains(active);

      if (event.shiftKey && (active === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    /* Por encima de la cabecera (`z-50`) y por debajo del telón (`z-[100]`):
       el telón no puede coexistir con esto —solo se abre el vídeo después de
       entrar—, pero si alguna vez coincidieran, manda el telón. */
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Videoclip de ${title}`}
      /* Cerrar al pulsar el fondo, no al pulsar el vídeo: de ahí la
         comparación con `currentTarget`, que solo es cierta cuando el clic
         cayó en este mismo elemento y no en un descendiente. */
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[90] flex flex-col items-center justify-center gap-3 bg-black/92 p-scene-x backdrop-blur-sm"
    >
      {/* La barra de cerrar va sobre el vídeo y alineada con su borde derecho,
          para no taparle los controles a YouTube. */}
      <div className="flex w-[min(92vw,calc(78svh*16/9))] justify-end">
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar el videoclip"
          title="Cerrar (Esc)"
          className="flex items-center gap-2 rounded-full border border-[#D4AF37]/35 bg-black/60 px-4 py-2 text-[11px] font-semibold tracking-[0.18em] text-[#F2EEE8]/75 backdrop-blur-sm transition-colors duration-300 hover:border-[#D4AF37]/80 hover:text-[#D4AF37] focus-visible:border-[#D4AF37] focus-visible:text-[#D4AF37] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3 w-3" fill="none">
            <path
              d="M5 5l14 14M19 5L5 19"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          CERRAR
        </button>
      </div>

      {/* El mayor 16:9 que cabe: limitado por el ancho en pantallas estrechas
          y por el alto en las apaisadas. Sin breakpoints, como el resto del
          sistema (ver ARCHITECTURE §7). */}
      <div className="w-[min(92vw,calc(78svh*16/9))] overflow-hidden rounded-[3px] bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.95)] ring-1 ring-[#D4AF37]/15">
        <iframe
          ref={frameRef}
          src={embedUrl(videoId)}
          title={`Videoclip de ${title}`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="aspect-video h-full w-full border-0"
        />
      </div>
    </div>
  );
}
