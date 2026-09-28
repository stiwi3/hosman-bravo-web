'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useAudio } from '@/components/audio/AudioProvider';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hosmanData } from '@/data/hosman-data';
import { useSalidaTelon } from './salidaTelon';

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
--------------------------------------------------------------------------- */

const SRC = `${hosmanData.basePath}/videos/pre-hero.mp4`;

/** Fundido de entrada y de salida de la capa. */
const FUNDIDO_MS = 250;

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
 * ¿El vídeo trae sonido PROPIO que deba oírse al entrar con ENTRAR? El master
 * actual lleva una pista de silencio digital (−91 dB), así que no. Si un día
 * se edita con sonido, se pone a `true`: con ENTRAR sonará el vídeo y la
 * canción global quedará apartada (`suspend`/`release`) mientras dure, para no
 * sonar dos fuentes a la vez. Con X/Escape y con el primer Play va siempre
 * muteado.
 */
const CON_SONIDO = false;

type Fase = 'espera' | 'arrancando' | 'visible' | 'saliendo' | 'terminado';

const sinSuscripcion = () => () => {};

export function PreHero() {
  const segment = useSelectedLayoutSegment();
  const reducedMotion = useReducedMotion();
  const salida = useSalidaTelon();
  const { suspend, release } = useAudio();

  /* Solo la carga en `/` tiene Pre-Hero. Se decide una vez: entrar por
     `/musica` y navegar después a INICIO no lo reproduce. */
  const [fase, setFase] = useState<Fase>(() => (segment === null ? 'espera' : 'terminado'));
  /** Ya hay un fotograma descodificado ('loadeddata'): la capa puede verse sin
   *  esperar a 'playing', porque lo que muestra es el primer fotograma real. */
  const [precargado, setPrecargado] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sonoroRef = useRef(false);

  /* LA SALIDA DEL TELÓN LO DISPARA. Se ajusta el estado durante el render
     (mismo patrón que el Play primero de `EntryScreen`); el `play()` real va
     en el efecto de abajo. */
  if (fase === 'espera' && salida !== null) {
    setFase(segment === null && !reducedMotion ? 'arrancando' : 'terminado');
  }
  /* Si se navega fuera de INICIO a mitad, se retira sin más. */
  if ((fase === 'arrancando' || fase === 'visible') && segment !== null) {
    setFase('terminado');
  }

  /* ARRANQUE: con el gesto de la salida ya hecho. Muteado salvo ENTRAR con un
     vídeo que tenga sonido propio. */
  useEffect(() => {
    if (fase !== 'arrancando') return;
    const video = videoRef.current;
    if (!video) return;
    const sonoro = CON_SONIDO && salida === 'entrar';
    sonoroRef.current = sonoro;
    video.muted = !sonoro;
    video.currentTime = 0;
    /* En el MISMO fotograma en que empieza el fundido de entrada: la salida del
       telón coincide con trabajo pesado en el hilo principal (telón, audio,
       reproductor) y, si el vídeo arrancara antes, avanzaría invisible
       (medido: hasta ~0,5 s perdidos con el primer Play). */
    const id = requestAnimationFrame(() => {
      video.play().catch(() => setFase('terminado'));
    });
    return () => cancelAnimationFrame(id);
  }, [fase, salida]);

  /* VIGILANTE: la única espera con reloj. Si mientras se espera imagen (al
     arrancar o en un atasco) no llega 'playing' a tiempo, se salta al Hero. */
  const [esperandoImagen, setEsperandoImagen] = useState(false);
  useEffect(() => {
    if (!(fase === 'arrancando' || (fase === 'visible' && esperandoImagen))) return;
    const timer = window.setTimeout(
      () => setFase((actual) => (actual === 'arrancando' ? 'terminado' : 'saliendo')),
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

  /* SONIDO PROPIO (solo con `CON_SONIDO`): la canción global se aparta mientras
     el Pre-Hero se oye y vuelve al terminar, con el mecanismo de siempre. */
  useEffect(() => {
    if (fase !== 'visible' || !sonoroRef.current) return;
    suspend('pre-hero');
    return () => release('pre-hero');
  }, [fase, suspend, release]);

  /* SOLO EN EL CLIENTE. El HTML del servidor no conoce `prefers-reduced-motion`:
     si llevara el `<video preload="auto">`, quien pidió movimiento reducido lo
     descargaría entero sin verlo nunca (medido: 2,76 MB). La precarga empieza
     al hidratar. */
  const enCliente = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  if (!enCliente || fase === 'terminado' || reducedMotion) return null;

  /* Si ya está precargado, el fundido de entrada empieza en el MISMO render de
     la salida del telón (con el primer fotograma real), sin esperar a 'playing':
     en ese instante el hilo principal está ocupado con el telón y el audio, y
     esperar costaba ~330 ms de vídeo invisible. Sin precarga, espera a 'playing'
     y hasta entonces se sigue viendo el Hero. */
  const visible = fase === 'visible' || (fase === 'arrancando' && precargado);

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
      onPlaying={() => {
        setEsperandoImagen(false);
        if (fase === 'arrancando') setFase('visible');
      }}
      onWaiting={() => setEsperandoImagen(true)}
      onEnded={() => setFase((actual) => (actual === 'visible' ? 'saliendo' : actual))}
      onError={() => setFase('terminado')}
      onTransitionEnd={(e) => {
        if (e.propertyName === 'opacity' && fase === 'saliendo') setFase('terminado');
      }}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover"
      style={{ opacity: visible ? 1 : 0, transition: `opacity ${FUNDIDO_MS}ms ease-out` }}
    />
  );
}
