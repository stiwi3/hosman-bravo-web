'use client';

import { useEffect, useRef, useState } from 'react';
import {
  apagaSubtitulos,
  cargarYouTubeApi,
  opcionesDePreview,
  YT_REPRODUCIENDO,
  type YouTubePlayer
} from '@/lib/youtube-api';
import type { MusicRelease } from '@/data/types';

/* ---------------------------------------------------------------------------
   La preview en movimiento de una pieza. Es SOLO una capa visual.

   No sustituye a nada: se apoya encima de la portada, que sigue ahí y sigue
   siendo lo que se ve mientras la preview no esté lista. Va con
   `pointer-events-none`, así que ni roba el clic al disparador del modal ni
   tapa los enlaces de plataforma — todo lo que ya existía sigue funcionando
   igual con la preview encendida.

   CASCADA
     1. clip propio (`previewVideoUrl`) → `<video muted loop playsinline>`;
     2. si no hay → reproductor de YouTube con la IFrame Player API;
     3. si YouTube falla (no embebible, privado, sin conexión) → no se hace
        nada y queda la portada, que nunca se quitó.

   EL FUNDIDO NO SE DISPARA CON `onReady`
   Se dispara cuando el reproductor dice que está REPRODUCIENDO de verdad
   (`playing` en el vídeo, estado `1` en YouTube). Entre «listo» y «hay imagen»
   está el buffering, y es ahí donde YouTube pinta su fondo negro. Esperar al
   estado real es lo que garantiza que nunca se vea un hueco.

   ⚠️ EL RECORTE DEL PLAYER DE YOUTUBE NO ES UN CAPRICHO
   YouTube **no permite ocultar** el rótulo del título ni el botón central:
   `modestbranding` está obsoleto y lo ignoran, y `controls: 0` solo quita la
   barra de abajo. La única forma es agrandar el iframe y centrarlo, para que
   esas franjas queden fuera del recorte de la tarjeta.
--------------------------------------------------------------------------- */

/** Cuánto se agranda el iframe para que su interfaz salga del encuadre. */
const RECORTE = 1.55;

/** Un vídeo 16:9 dentro de una caja 4:3 necesita este ancho para CUBRIR sin
 *  dejar bandas negras: (16/9) ÷ (4/3) = 1,3334. La caja del destacado ya es
 *  16:9, así que le basta el 100%. */
const ANCHO_EN_CAJA_4_3 = 133.34;

export function ReleasePreview({
  release,
  activa,
  precargar = false,
  featured = false
}: {
  release: MusicRelease;
  /** Debe estar reproduciéndose ahora mismo. */
  activa: boolean;
  /** Crear ya el reproductor de YouTube aunque todavía no toque reproducir.
   *  Quita la espera del primer hover a cambio de montarlo por adelantado. */
  precargar?: boolean;
  featured?: boolean;
}) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const clip = release.previewVideoUrl;
  const usaYouTube = !clip && Boolean(release.youtubeId);

  /* `hayImagen` solo lo ENCIENDEN los eventos del reproductor, nunca un
     efecto. Que se vea o no es entonces algo derivado —`hayImagen && activa`—
     y no un segundo estado que haya que mantener sincronizado a mano. */
  const [hayImagen, setHayImagen] = useState(false);
  const visible = hayImagen && activa;

  /* ⚠️ El `<video>` NO se monta hasta la primera activación. Montarlo siempre
     pondría un `<video preload>` por tarjeta y el navegador descargaría TODOS
     los clips al entrar en la sección. Una vez montado se queda: volver a
     pasar el ratón es instantáneo porque el archivo ya está en caché.
     Se ajusta durante el render, que es el patrón que React recomienda para
     derivar estado de una prop, en vez de un efecto que provoque otro render. */
  const [montado, setMontado] = useState(false);
  if (activa && !montado) setMontado(true);

  /* Lo mismo para el reproductor de YouTube: una vez que hace falta —porque se
     activó o porque tocó precargar— ya no se deshace hasta el desmontaje.
     Que sea un pestillo y no la condición viva `activa || precargar` es
     deliberado: con la condición viva, salir del hover destruiría el
     reproductor y volver a entrar lo recrearía, que es exactamente la espera
     que la precarga viene a quitar. */
  const [existePlayer, setExistePlayer] = useState(false);
  if ((activa || precargar) && !existePlayer) setExistePlayer(true);

  /* ⚠️ El reproductor de YouTube se crea de forma ASÍNCRONA, y eso abre una
     carrera que solo sufre la tarjeta que ya está activa en el primer render
     —o sea, la destacada—: el efecto de play/pausa corre al montar, no
     encuentra reproductor todavía y se va; sus dependencias no vuelven a
     cambiar nunca, así que no lo reintenta. Con `autoplay: 0`, nadie arranca
     el vídeo jamás.

     Por eso `onReady` consulta aquí si en ESE momento tocaba estar
     reproduciendo. Un ref y no una dependencia: el callback lo lee cuando la
     API termina de cargar, que es después de que el efecto haya pasado. */
  const activaRef = useRef(activa);
  useEffect(() => {
    activaRef.current = activa;
  }, [activa]);

  /* --- CLIP PROPIO ------------------------------------------------------ */
  useEffect(() => {
    if (!clip || !montado) return;
    const video = videoRef.current;
    if (!video) return;

    if (!activa) {
      video.pause();
      return;
    }

    const alReproducir = () => setHayImagen(true);
    video.addEventListener('playing', alReproducir);
    /* Un `play()` rechazado no es un fallo del sitio: el navegador puede
       negarse (ahorro de energía, pestaña en segundo plano). Queda la portada. */
    void video.play().catch(() => undefined);

    return () => {
      video.removeEventListener('playing', alReproducir);
      video.pause();
    };
  }, [clip, activa, montado]);

  /* --- YOUTUBE: creación y destrucción ---------------------------------- */
  useEffect(() => {
    if (!usaYouTube || !existePlayer) return;

    const contenedor = contenedorRef.current;
    if (!contenedor) return;

    /* Nodo aparte, creado a mano: la API lo SUSTITUYE por su iframe, así que
       no puede ser un nodo que React crea que gobierna. */
    const hueco = document.createElement('div');
    hueco.style.width = '100%';
    hueco.style.height = '100%';
    contenedor.appendChild(hueco);

    let cancelado = false;

    void cargarYouTubeApi().then((YT) => {
      /* El componente pudo desmontarse mientras cargaba el script. Sin esta
         guarda se crearía un reproductor sobre un nodo que ya no está en el
         documento, y quedaría vivo sin nadie que lo destruya. */
      if (cancelado || !hueco.isConnected) return;

      playerRef.current = new YT.Player(hueco, {
        videoId: release.youtubeId as string,
        playerVars: opcionesDePreview(release.previewStartSec ?? 0),
        events: {
          onReady: (evento) => {
            evento.target.mute();
            apagaSubtitulos(evento.target);
            /* Si mientras cargaba ya tocaba reproducir, se arranca aquí. Es lo
               que hace que la destacada suene sola al entrar. */
            if (activaRef.current) evento.target.playVideo();
          },
          onStateChange: (evento) => {
            if (evento.data === YT_REPRODUCIENDO) setHayImagen(true);
          },
          /* Vídeo no embebible, privado o eliminado: no se enseña nada y la
             portada se queda exactamente como estaba. */
          onError: () => setHayImagen(false)
        }
      });
    });

    return () => {
      cancelado = true;
      const player = playerRef.current;
      playerRef.current = null;
      if (player) {
        try {
          player.destroy();
        } catch {
          /* destruir dos veces, o antes de `onReady`, no está documentado como
             seguro; se ignora a propósito */
        }
      }
      hueco.remove();
    };
  }, [usaYouTube, existePlayer, release.youtubeId, release.previewStartSec]);

  /* --- YOUTUBE: play / pausa -------------------------------------------- */
  useEffect(() => {
    if (!usaYouTube) return;
    const player = playerRef.current;
    if (!player) return;
    try {
      if (activa) {
        player.mute();
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch {
      /* el reproductor puede no estar listo todavía; `onReady` lo recoge */
    }
  }, [usaYouTube, activa]);

  if (!clip && !usaYouTube) return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-500 ease-out motion-reduce:transition-none ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {clip ? (
        montado && (
          <video
            ref={videoRef}
            src={clip}
            muted
            loop
            playsInline
            preload="auto"
            className="h-full w-full object-cover"
          />
        )
      ) : (
        <div
          ref={contenedorRef}
          className="absolute left-1/2 top-1/2 h-full"
          style={{
            width: featured ? '100%' : `${ANCHO_EN_CAJA_4_3}%`,
            transform: `translate(-50%, -50%) scale(${RECORTE})`
          }}
        />
      )}
    </div>
  );
}
