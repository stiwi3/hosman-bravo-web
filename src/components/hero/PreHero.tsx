'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useAudio } from '@/components/audio/AudioProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hosmanData } from '@/data/hosman-data';
import { registrarArranqueTelon, useSalidaTelon, type SalidaTelon } from './salidaTelon';

/* ---------------------------------------------------------------------------
   PRE-HERO — PRUEBA (28-09-2026). Introducción de ~6 s que aparece UNA vez,
   al retirarse el mini-telón en INICIO, por encima del vídeo del Hero y en su
   misma caja; al terminar se desvanece y deja ver el Hero, que nunca dejó de
   funcionar debajo.

   · Mientras el telón está puesto NO se ve (opacidad 0) y se precarga
     (`preload="auto"`, montado desde la carga): el Hero de detrás sigue
     exactamente igual.
   · Cualquier salida del telón lo dispara (ENTRAR, X/Escape, primer Play): lo
     anuncia `EntryScreen` en `salidaTelon.ts`. Solo si la página se cargó en
     `/` y la salida ocurre en `/`; nunca al volver a INICIO más tarde.
   · Misma geometría que el Hero por construcción: vive DENTRO de su marco (la
     misma caja, la misma máscara) con el mismo `object-cover`. El vídeo es
     9:16 y la caja 3:4, así que se recorta arriba y abajo como el Hero.
   · Movimiento reducido: no se monta; se queda el Hero de siempre.
   · El bloque de marca del Hero se desvanece a la vez que la capa entra y
     vuelve a la vez que se va (`onCubre` → `HeroScene`).

   FASES (una sola variable, cada paso lo decide un evento real del vídeo):

     espera ──salida del telón──▶ arrancando ──'playing'──▶ visible
        │                             │                        │
        │                             └─ error / sin arrancar ─┤
        │                                                      ▼
        └──── (otra ruta, movimiento reducido) ──▶ terminado ◀── saliendo
                                                                   ▲
                                        final útil del vídeo ──────┘

   La capa solo se hace visible con un fotograma real del propio vídeo (ya
   precargado, o con 'playing'): nunca hay un fotograma vacío ni un poster
   ajeno, porque hasta entonces se sigue viendo el Hero.

   SONIDO. Con ENTRAR y con el primer Play el vídeo suena con su propia pista
   y la canción global se aparta (`suspend`) mientras suena; se devuelve
   (`release`) una sola vez al terminar, sea cual sea el final (fin del vídeo,
   error, vigilante, navegación o desmontaje). Con X/Escape va muteado. Si el
   navegador rechaza el sonido, se reproduce muteado y la canción no se toca.
--------------------------------------------------------------------------- */

const SRC = `${hosmanData.basePath}/videos/pre-hero.mp4`;

/** Fundido de entrada y de salida de la capa (y del bloque de marca). */
export const FUNDIDO_PRE_HERO_MS = 250;

/**
 * PROVISIONAL, ligado al master actual: sus últimos ~0,7 s son un fundido a
 * negro (luminancia 107 → 18 entre 6,2 s y 6,9 s). La capa empieza a irse esta
 * cantidad de segundos antes del final, de modo que el negro no llega a verse.
 * Con un Pre-Hero editado cuyo final no sea negro, se pone a 0 y la salida la
 * dispara `ended`.
 */
const SALIDA_ANTES_DEL_FINAL_S = 0.95;

/** Si el vídeo no reproduce en este tiempo (red muy lenta, atasco), se salta. */
const ESPERA_MAX_MS = 2500;

/**
 * ¿Trae el vídeo sonido PROPIO? Sí desde el 28-09 (`pre-hero-audio`: AAC
 * estéreo). Con `false` todas las salidas irían muteadas.
 */
const CON_SONIDO = true;

/** Salidas que llevan el sonido del Pre-Hero: las que son un gesto sonoro. */
const salidaSonora = (tipo: SalidaTelon) => CON_SONIDO && (tipo === 'entrar' || tipo === 'play');

type Fase = 'espera' | 'arrancando' | 'visible' | 'saliendo' | 'terminado';

const sinSuscripcion = () => () => {};

export function PreHero({ onCubre }: { onCubre?: (cubre: boolean) => void }) {
  const segment = useSelectedLayoutSegment();
  const reducedMotion = useReducedMotion();
  const salida = useSalidaTelon();
  const { suspend, release, isPlaying, isMuted } = useAudio();

  /* Solo la carga en `/` tiene Pre-Hero. Se decide una vez: entrar por
     `/musica` y navegar después a INICIO no lo reproduce. */
  const [fase, setFase] = useState<Fase>(() => (segment === null ? 'espera' : 'terminado'));
  /** Ya hay un fotograma descodificado ('loadeddata'): la capa puede verse sin
   *  esperar a 'playing', porque lo que muestra es el primer fotograma real. */
  const [precargado, setPrecargado] = useState(false);
  /** Reproduce CON sonido de verdad (confirmado por 'playing' sin `muted`). */
  const [sonando, setSonando] = useState(false);
  const [esperandoImagen, setEsperandoImagen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const intentadoRef = useRef(false);

  /* ARRANQUE. Se llama en el MISMO instante del anuncio de la salida (dentro de
     la activación del usuario, que es lo que permite sonar). Si el navegador
     rechaza el sonido, se reintenta muteado; si tampoco, se salta al Hero. */
  const arrancar = useCallback((tipo: SalidaTelon) => {
    const video = videoRef.current;
    if (!video || intentadoRef.current) return;
    intentadoRef.current = true;
    video.muted = !salidaSonora(tipo);
    video.currentTime = 0;
    video.play().catch(() => {
      // Si mientras tanto se retiró la capa (navegación, vigilante), no se reintenta.
      if (!video.isConnected) return;
      if (!video.muted) {
        video.muted = true;
        video.play().catch(() => setFase('terminado'));
      } else {
        setFase('terminado');
      }
    });
  }, []);

  /* Se ofrece a `salidaTelon` solo mientras puede usarse: en `/`, sin
     movimiento reducido y esperando al telón. */
  useEffect(() => {
    if (fase !== 'espera' || segment !== null || reducedMotion) return;
    return registrarArranqueTelon(arrancar);
  }, [fase, segment, reducedMotion, arrancar]);

  /* LA SALIDA DEL TELÓN LO DISPARA. Se ajusta el estado durante el render
     (mismo patrón que el Play primero de `EntryScreen`). */
  if (fase === 'espera' && salida !== null) {
    setFase(segment === null && !reducedMotion ? 'arrancando' : 'terminado');
  }
  /* Si se navega fuera de INICIO a mitad, o se activa el movimiento reducido,
     se retira sin más (y con ello se devuelve la canción y el rótulo). */
  if ((fase === 'arrancando' || fase === 'visible' || fase === 'saliendo') && (segment !== null || reducedMotion)) {
    setFase('terminado');
  }

  /* Red de seguridad: si el vídeo aún no estaba montado al anunciarse la salida
     (antes de hidratar), arranca aquí. Ya fuera de la activación: si el
     navegador no deja sonar, va muteado. */
  useEffect(() => {
    if (fase === 'arrancando' && salida !== null) arrancar(salida);
  }, [fase, salida, arrancar]);

  /* VIGILANTE: la única espera con reloj. Si mientras se espera imagen (al
     arrancar o en un atasco) no llega 'playing' a tiempo, se salta al Hero. */
  useEffect(() => {
    const esperando = fase === 'arrancando' || ((fase === 'visible' || fase === 'saliendo') && esperandoImagen);
    if (!esperando) return;
    const timer = window.setTimeout(
      () => setFase((actual) => (actual === 'visible' ? 'saliendo' : 'terminado')),
      ESPERA_MAX_MS
    );
    return () => window.clearTimeout(timer);
  }, [fase, esperandoImagen]);

  /* FINAL ÚTIL: se mira cada fotograma presentado (`requestVideoFrameCallback`,
     o `timeupdate` donde no exista) para empezar a irse antes del negro. */
  useEffect(() => {
    if (fase !== 'visible') return;
    const video = videoRef.current;
    if (!video) return;
    const cerca = () =>
      Number.isFinite(video.duration) && video.currentTime >= video.duration - SALIDA_ANTES_DEL_FINAL_S;

    if (typeof video.requestVideoFrameCallback === 'function') {
      let id = 0;
      const mirar = () => {
        if (cerca()) setFase('saliendo');
        else id = video.requestVideoFrameCallback(mirar);
      };
      id = video.requestVideoFrameCallback(mirar);
      return () => video.cancelVideoFrameCallback(id);
    }
    const onTime = () => {
      if (cerca()) setFase('saliendo');
    };
    video.addEventListener('timeupdate', onTime);
    return () => video.removeEventListener('timeupdate', onTime);
  }, [fase]);

  /* LA CANCIÓN GLOBAL SE APARTA mientras suena el Pre-Hero. Un solo efecto
     empareja `suspend` y `release`: el `release` es su limpieza, así que ocurre
     exactamente una vez sea cual sea el final (fase `terminado`, desmontaje).
     Se aparta al confirmarse el sonido ('playing'), no antes: así no se corta a
     medias el `play()` que acaba de lanzar `enter()`. */
  const apartarCancion = sonando && fase !== 'terminado';
  useEffect(() => {
    if (!apartarCancion) return;
    suspend('pre-hero');
    return () => release('pre-hero');
  }, [apartarCancion, suspend, release]);

  /* EL REPRODUCTOR MANDA. `suspend` no impide un Play manual: si mientras suena
     el Pre-Hero el usuario vuelve a arrancar la canción, o silencia el sonido
     desde el reproductor, el Pre-Hero se calla (nunca dos fuentes a la vez, y
     el control global también gobierna este sonido). Solo cuenta un Play
     DESPUÉS de haberse apartado la canción: el `play()` de `enter()` aún puede
     figurar como activo en el primer render. */
  const cancionApartadaRef = useRef(false);
  useEffect(() => {
    if (!apartarCancion) {
      cancionApartadaRef.current = false;
      return;
    }
    if (!isPlaying) cancionApartadaRef.current = true;
    const video = videoRef.current;
    if (video && (isMuted || (isPlaying && cancionApartadaRef.current))) video.muted = true;
  }, [apartarCancion, isPlaying, isMuted]);

  /* Si ya está precargado, el fundido de entrada empieza en el MISMO render de
     la salida del telón (con el primer fotograma real), sin esperar a 'playing'.
     Sin precarga, espera a 'playing' y hasta entonces se sigue viendo el Hero. */
  const visible = fase === 'visible' || (fase === 'arrancando' && precargado);

  /* El bloque de marca del Hero acompaña a la capa: se va y vuelve con ella. */
  useEffect(() => {
    onCubre?.(visible);
  }, [visible, onCubre]);

  /* SOLO EN EL CLIENTE. El HTML del servidor no conoce `prefers-reduced-motion`:
     si llevara el `<video preload="auto">`, quien pidió movimiento reducido lo
     descargaría entero sin verlo nunca (medido: 2,76 MB). La precarga empieza
     al hidratar. */
  const enCliente = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  if (!enCliente || fase === 'terminado' || reducedMotion) return null;

  return (
    <video
      ref={videoRef}
      src={SRC}
      preload="auto"
      muted
      playsInline
      disablePictureInPicture
      disableRemotePlayback
      aria-hidden="true"
      tabIndex={-1}
      onLoadedData={() => setPrecargado(true)}
      onPlaying={(e) => {
        setEsperandoImagen(false);
        if (!e.currentTarget.muted) setSonando(true);
        if (fase === 'arrancando') setFase('visible');
      }}
      onWaiting={() => setEsperandoImagen(true)}
      /* Con sonido, la capa ya invisible sigue hasta el final real para no
         cortar la cola del audio; muteada se retira al acabar el fundido. */
      onEnded={() => setFase((actual) => (actual === 'visible' ? 'saliendo' : actual === 'saliendo' ? 'terminado' : actual))}
      onError={() => setFase('terminado')}
      onTransitionEnd={(e) => {
        // Con sonido espera a `ended`, salvo que el vídeo ya haya terminado.
        if (e.propertyName === 'opacity' && fase === 'saliendo' && (!sonando || e.currentTarget.ended)) {
          setFase('terminado');
        }
      }}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ opacity: visible ? 1 : 0, transition: `opacity ${FUNDIDO_PRE_HERO_MS}ms ease-out` }}
    />
  );
}
