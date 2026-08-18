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
      mute: () => applyMuted(true),
      unmute: () => applyMuted(false),
      toggleMute: () => applyMuted(!isMuted),
    }),
    [hasEntered, isPlaying, isMuted, enter, play, pause, toggle, applyMuted]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioApi {
  const ctx = useContext(AudioContext);
  if (!ctx) throw new Error('useAudio debe usarse dentro de AudioProvider');
  return ctx;
}
