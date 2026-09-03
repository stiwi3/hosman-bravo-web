'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { hosmanData } from '@/data/hosman-data';

/** Volumen al que sube el fundido de entrada. Ambiental, no protagonista. */
const TARGET_VOLUME = 0.45;
/** Duración del fundido, en milisegundos. */
const FADE_IN_MS = 1800;

export interface AudioApi {
  /** El usuario ya pulsó el acceso: la experiencia está a la vista. */
  hasEntered: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  track: typeof hosmanData.featuredTrack;
  /** Entra a la web e intenta arrancar la canción con el gesto del usuario. */
  enter: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => void;
  /** Aparta la canción mientras suene otra cosa (un videoclip a pantalla
   *  completa). Idempotente por `id`. Ver «Suspensión» más abajo. */
  suspend: (id: string) => void;
  /** Devuelve el turno. Cuando lo devuelve el último, la canción se reanuda
   *  SOLO si estaba sonando al apartarla. */
  release: (id: string) => void;
  mute: () => void;
  unmute: () => void;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioApi | null>(null);

/**
 * Estado del audio de la web.
 *
 * El elemento `Audio` se crea una sola vez y vive en este proveedor, por
 * encima de la página, de modo que al navegar entre secciones la canción sigue
 * sonando sin reiniciarse. La interfaz del reproductor llegará en la siguiente
 * fase y consumirá esta misma API.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const [hasEntered, setHasEntered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Se construye en el cliente: `Audio` no existe durante el renderizado en
  // servidor. Sin `autoplay`: nada suena hasta que hay un gesto del usuario.
  useEffect(() => {
    const audio = new Audio(hosmanData.featuredTrack.audio);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0;
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const cancelFade = useCallback(() => {
    if (fadeRef.current) {
      cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  /** Sube el volumen progresivamente hasta el objetivo. */
  const fadeIn = useCallback(
    (audio: HTMLAudioElement) => {
      cancelFade();
      const from = audio.volume;
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / FADE_IN_MS, 1);
        // Curva suave: arranca despacio y se asienta sin salto al final.
        audio.volume = from + (TARGET_VOLUME - from) * (t * (2 - t));
        if (t < 1) fadeRef.current = requestAnimationFrame(step);
        else fadeRef.current = null;
      };
      fadeRef.current = requestAnimationFrame(step);
    },
    [cancelFade]
  );

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      fadeIn(audio);
    } catch {
      // El navegador puede rechazar la reproducción. No es un fallo de la
      // web: queda en pausa y el reproductor podrá activarla más tarde.
      cancelFade();
      audio.volume = TARGET_VOLUME;
      setIsPlaying(false);
    }
  }, [fadeIn, cancelFade]);

  const pause = useCallback(() => {
    cancelFade();
    audioRef.current?.pause();
  }, [cancelFade]);

  const enter = useCallback(async () => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = 0;
    // La entrada nunca depende de que el audio arranque.
    setHasEntered(true);
    await play();
  }, [play]);

  const toggle = useCallback(() => {
    if (audioRef.current?.paused) void play();
    else pause();
  }, [play, pause]);

  /* --- Suspensión ---------------------------------------------------------
     Un videoclip a pantalla completa no puede sonar encima de la canción de
     fondo, pero `pause()` al abrirlo y `play()` al cerrarlo arrancaría la
     música también a quien la había parado a propósito. Por eso se apunta si
     estaba sonando y solo entonces se reanuda.

     Y se lleva por conjunto de `id`, no con un booleano: si dos piezas la
     apartan a la vez, la primera en soltarla no debe devolver el sonido
     mientras la otra sigue abierta.

     Las previews silenciosas de la cuadrícula NO pasan por aquí: un iframe
     muted y este `<audio>` no compiten. Solo el vídeo real suspende. */
  const suspendersRef = useRef<Set<string>>(new Set());
  const wasPlayingRef = useRef(false);

  const suspend = useCallback(
    (id: string) => {
      if (suspendersRef.current.size === 0) {
        wasPlayingRef.current = !!audioRef.current && !audioRef.current.paused;
      }
      suspendersRef.current.add(id);
      pause();
    },
    [pause]
  );

  const release = useCallback(
    (id: string) => {
      if (!suspendersRef.current.delete(id)) return;
      if (suspendersRef.current.size > 0) return;
      if (wasPlayingRef.current) void play();
      wasPlayingRef.current = false;
    },
    [play]
  );

  const applyMuted = useCallback((value: boolean) => {
    const audio = audioRef.current;
    if (audio) audio.muted = value;
    setIsMuted(value);
  }, []);

  const value = useMemo<AudioApi>(
    () => ({
      hasEntered,
      isPlaying,
      isMuted,
      track: hosmanData.featuredTrack,
      enter,
      play,
      pause,
      toggle,
      suspend,
      release,
      mute: () => applyMuted(true),
      unmute: () => applyMuted(false),
      toggleMute: () => applyMuted(!isMuted),
    }),
    [
      hasEntered,
      isPlaying,
      isMuted,
      enter,
      play,
      pause,
      toggle,
      suspend,
      release,
      applyMuted,
    ]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioApi {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio debe usarse dentro de AudioProvider');
  return ctx;
}
