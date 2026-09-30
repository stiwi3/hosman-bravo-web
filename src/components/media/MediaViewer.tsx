'use client';

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { MediaItem } from '@/data/types';
import { useAudio } from '@/components/audio/AudioProvider';
import { useScrollLock } from '@/hooks/useScrollLock';
import { Chevron } from './Chevron';
import { MEDIA_CONTROL } from './PauseButton';
import { marcarVisor } from './visorAbierto';

/* ---------------------------------------------------------------------------
   VISOR MULTIMEDIA — fotos y vídeos de GALERÍA, EL SHOW y CABALLOS en grande.

   Envuelve UNA colección (`items`) y a sus tarjetas: las tarjetas piden abrir
   un medio con `useAbrirMedio()`; el visor recorre SOLO esa colección con
   anterior/siguiente. Quien lo usa decide qué es una colección (GALERÍA
   entera, EL SHOW entero, cada caballo); el visor no sabe de secciones ni de
   cómo era la tarjeta (1 o 2 columnas, preview o no).

   · Siempre el medio COMPLETO (`src`); `previewSrc` es solo de la tarjeta.
     Un vídeo empieza desde 0:00.
   · `<dialog>.showModal()`: fondo inerte, trampa de foco y Escape del
     navegador. El foco vuelve a la tarjeta que lo abrió. Scroll bloqueado con
     el contador compartido (`useScrollLock`).
   · Tamaño: `max-w/max-h: 100%` con tamaño natural → cabe en el viewport
     (contain), sin recortar ni deformar, y nunca por encima de su resolución
     intrínseca (un 1920×1080 no se estira en un monitor mayor).
   · Vídeos de detrás: mientras está abierto, `marcarVisor` pausa TODOS los
     inline; al cerrar, cada uno vuelve a su propia lógica.
   · Audio: vídeo con `hasAudio` → `suspend` ANTES de `play()` (en iOS el
     vídeo audible pausa la canción antes de que `suspend` mire si sonaba);
     foto o vídeo mudo → `release`. Entre dos vídeos con audio la suspensión
     no se suelta nunca: el siguiente medio decide el audio antes del relevo.
   · Gesto del usuario: abrir, navegar y cerrar ocurren DENTRO del clic o de
     la tecla (el `<video>` está siempre montado, sin `src` hasta abrir), así
     `play()` conserva la activación. Si aun así se rechaza, se ofrece un botón
     de reproducir; nunca una pantalla negra muda.
   · Carga: el `<video>` no tiene `src` hasta abrir, y al cerrar o pasar a una
     foto se le quita: el vídeo completo nunca se descarga «por si acaso».
--------------------------------------------------------------------------- */

type AbrirMedio = (id: string, origen?: HTMLElement | null) => void;

const AbrirContexto = createContext<AbrirMedio | null>(null);

/** Abre el medio `id` de la colección que envuelve a quien lo llama. */
export function useAbrirMedio(): AbrirMedio | null {
  return useContext(AbrirContexto);
}

type Estado = 'cargando' | 'listo' | 'bloqueado' | 'error';

export function MediaViewer({
  items,
  nombre,
  children,
}: {
  items: readonly MediaItem[];
  /** Nombre accesible de la colección: «Fotos y vídeos de Bandido». */
  nombre: string;
  children: ReactNode;
}) {
  const { suspend, release } = useAudio();
  const idAudio = `visor-${useId()}`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const origenRef = useRef<HTMLElement | null>(null);
  /** Índice abierto, para los manejadores síncronos (el estado llega después). */
  const indiceRef = useRef<number | null>(null);
  /** Sube en cada cambio de medio y al cerrar: una promesa de `play()` de un
   *  medio anterior (o de un reintento) no puede tocar el estado del actual. */
  const generacionRef = useRef(0);
  const [indice, setIndice] = useState<number | null>(null);
  const [estado, setEstado] = useState<Estado>('cargando');

  useScrollLock(indice !== null);

  /** Pasa al medio `i`: audio primero, después el vídeo. Síncrono. */
  const mostrar = useCallback(
    (i: number) => {
      const item = items[i];
      const video = videoRef.current;
      if (!item || !video) return;
      indiceRef.current = i;
      const generacion = ++generacionRef.current;
      video.pause();

      // El siguiente medio decide el audio ANTES de tocar el vídeo: audio →
      // audio vuelve a llamar a `suspend` (idempotente) y la canción no asoma.
      if (item.type === 'video' && item.hasAudio) suspend(idAudio);
      else release(idAudio);

      setEstado('cargando');
      setIndice(i);

      if (item.type === 'video') {
        video.muted = !item.hasAudio;
        video.src = item.src;
        video.play().catch(() => {
          if (generacionRef.current === generacion) setEstado('bloqueado');
        });
      } else if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
    },
    [items, suspend, release, idAudio]
  );

  const abrir = useCallback<AbrirMedio>(
    (id, origen) => {
      const i = items.findIndex((item) => item.id === id);
      const dialog = dialogRef.current;
      if (i === -1 || !dialog || indiceRef.current !== null) return;
      origenRef.current = origen ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      marcarVisor(true);
      dialog.showModal();
      cerrarRef.current?.focus();
      mostrar(i);
    },
    [items, mostrar]
  );

  const cerrar = useCallback(() => {
    if (indiceRef.current === null) return;
    indiceRef.current = null;
    generacionRef.current += 1;
    const video = videoRef.current;
    if (video) {
      video.pause();
      if (video.hasAttribute('src')) {
        video.removeAttribute('src');
        video.load();
      }
    }
    // Dentro del gesto (X o Escape): si la canción sonaba antes, vuelve.
    release(idAudio);
    marcarVisor(false);
    if (dialogRef.current?.open) dialogRef.current.close();
    setIndice(null);
    const origen = origenRef.current;
    origenRef.current = null;
    origen?.focus({ preventScroll: true });
  }, [release, idAudio]);

  // Si el visor desaparece abierto (navegación), no deja la canción apartada
  // ni los vídeos de detrás parados.
  useEffect(
    () => () => {
      if (indiceRef.current === null) return;
      indiceRef.current = null;
      release(idAudio);
      marcarVisor(false);
    },
    [release, idAudio]
  );

  const total = items.length;
  const ir = (paso: number) => {
    const actual = indiceRef.current;
    if (actual === null || total < 2) return;
    mostrar((actual + paso + total) % total);
  };

  const alTeclado = (e: KeyboardEvent<HTMLDialogElement>) => {
    // Con el foco en el vídeo, las flechas son del reproductor (avanzar).
    if (e.target instanceof HTMLVideoElement) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ir(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      ir(1);
    }
  };

  const reproducir = () => {
    const video = videoRef.current;
    if (!video) return;
    const generacion = generacionRef.current;
    video.play().then(
      () => generacionRef.current === generacion && setEstado('listo'),
      () => generacionRef.current === generacion && setEstado('bloqueado')
    );
  };

  const item = indice !== null ? items[indice] : null;
  const esVideo = item?.type === 'video';
  const texto = item?.alt ?? nombre;
  // Un `play()` rechazado manda: el botón de reproducir no se tapa al cargar.
  const listo = () => setEstado((actual) => (actual === 'bloqueado' ? actual : 'listo'));

  return (
    <AbrirContexto.Provider value={abrir}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label={nombre}
        onCancel={(e) => {
          e.preventDefault();
          cerrar();
        }}
        // `close` llega DESPUÉS (en otra tarea): si entretanto se reabrió, es de
        // la sesión anterior y no debe cerrar la nueva. Cierres externos, sí.
        onClose={() => {
          if (!dialogRef.current?.open) cerrar();
        }}
        onKeyDown={alTeclado}
        className="m-0 h-dvh max-h-none w-dvw max-w-none overflow-hidden bg-black/95 p-0 text-amber-50 backdrop:bg-black/80 open:flex open:flex-col"
      >
        {/* La barra FLOTA sobre el medio (no le resta alto): en un móvil en
            horizontal el vídeo aprovecha casi toda la pantalla. */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-4 px-3 pt-3 sm:px-6 sm:pt-4">
          <p aria-live="polite" className="text-xs tracking-[0.25em] text-amber-100/70">
            {item && total > 1 ? `${(indice ?? 0) + 1} / ${total}` : ''}
          </p>
          <button
            ref={cerrarRef}
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className={`${MEDIA_CONTROL} h-11 w-11`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Margen vertical proporcional al alto (tope 4rem): deja ver la barra
            en pantallas altas y casi desaparece en las bajas. */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 py-[clamp(0.5rem,8svh,4rem)] sm:px-20">
          {item?.type === 'image' && (
            // eslint-disable-next-line @next/next/no-img-element -- tamaño natural: nunca por encima de su resolución
            <img
              key={item.id}
              src={item.src}
              alt={texto}
              onLoad={listo}
              onError={() => setEstado('error')}
              className={`block max-h-full max-w-full object-contain ${estado === 'cargando' ? 'invisible' : ''}`}
            />
          )}

          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            aria-label={esVideo ? texto : undefined}
            onLoadedData={listo}
            onPlaying={() => setEstado('listo')}
            onError={() => {
              if (videoRef.current?.hasAttribute('src')) setEstado('error');
            }}
            className={`max-h-full max-w-full ${esVideo ? 'block' : 'hidden'} ${
              estado === 'cargando' ? 'invisible' : ''
            }`}
          />

          {estado === 'cargando' && (
            <div role="status" className="absolute inset-0 flex items-center justify-center">
              <span className="sr-only">Cargando…</span>
              <span
                aria-hidden="true"
                className="h-9 w-9 animate-spin rounded-full border-2 border-amber-200/25 border-t-amber-300 motion-reduce:animate-none"
              />
            </div>
          )}

          {estado === 'bloqueado' && (
            <button
              type="button"
              onClick={reproducir}
              aria-label={`Reproducir ${texto}`}
              className={`${MEDIA_CONTROL} absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2`}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-7 w-7">
                <path d="M8 5.5v13l10.5-6.5z" />
              </svg>
            </button>
          )}

          {estado === 'error' && (
            <p role="alert" className="absolute text-sm text-amber-100/80">
              No se ha podido cargar. Prueba con el siguiente.
            </p>
          )}

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={() => ir(-1)}
                aria-label="Anterior"
                className={`${MEDIA_CONTROL} absolute left-2 top-1/2 h-11 w-11 -translate-y-1/2 sm:left-5`}
              >
                <Chevron direccion="izquierda" />
              </button>
              <button
                type="button"
                onClick={() => ir(1)}
                aria-label="Siguiente"
                className={`${MEDIA_CONTROL} absolute right-2 top-1/2 h-11 w-11 -translate-y-1/2 sm:right-5`}
              >
                <Chevron direccion="derecha" />
              </button>
            </>
          )}
        </div>
      </dialog>
    </AbrirContexto.Provider>
  );
}
