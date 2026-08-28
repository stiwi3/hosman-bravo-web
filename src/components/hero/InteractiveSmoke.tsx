'use client';

import { useEffect, useRef } from 'react';
import { FluidSimulation, type PointerSample, type SimulationConfig } from './fluidSimulation';
import { SmokeRenderer } from './smokeRenderer';
import { createGLContext, createQuad } from './webglUtils';

interface InteractiveSmokeProps {
  /** Movimiento reducido: sin interacción y dinámica muy atenuada. */
  reducedMotion?: boolean;
  className?: string;
}

/** Rebaja la simulación en equipos modestos y en táctiles. */
function pickProfile() {
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia('(pointer: coarse)').matches;

  if (coarse || cores <= 4) {
    return {
      maxDpr: 1,
      config: {
        velocityResolution: 128,
        densityResolution: 192,
        pressureIterations: 6,
      } satisfies Partial<SimulationConfig>,
    };
  }
  if (cores <= 8) {
    return {
      maxDpr: 1.25,
      config: {
        velocityResolution: 160,
        densityResolution: 256,
        pressureIterations: 10,
      } satisfies Partial<SimulationConfig>,
    };
  }
  return { maxDpr: 1.5, config: {} as Partial<SimulationConfig> };
}

/**
 * Capa de humo simulado sobre el hero.
 *
 * El componente solo se ocupa del ciclo de vida —contexto, tamaño,
 * visibilidad, puntero y limpieza—; la física vive en `FluidSimulation` y el
 * aspecto en `SmokeRenderer`.
 */
export function InteractiveSmoke({ reducedMotion = false, className }: InteractiveSmokeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionRef = useRef(reducedMotion);
  const applyMotionRef = useRef<((reduced: boolean) => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const ctx = createGLContext(canvas);
    if (!ctx) {
      // Sin coma flotante en GPU no hay simulación posible; el hero se queda
      // con su vídeo y su degradado, que ya funcionan por sí solos.
      canvas.style.display = 'none';
      return;
    }

    const profile = pickProfile();
    const quad = createQuad(ctx);
    let simulation: FluidSimulation;
    let renderer: SmokeRenderer;
    try {
      simulation = new FluidSimulation(ctx, quad.draw, profile.config);
      renderer = new SmokeRenderer(ctx, quad.draw);
    } catch {
      canvas.style.display = 'none';
      quad.dispose();
      return;
    }

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;
    let lastTime = 0;
    let elapsed = 0;

    // Geometría cacheada: el manejador del puntero no debe leer layout.
    let bounds = host.getBoundingClientRect();
    const refreshBounds = () => {
      bounds = host.getBoundingClientRect();
    };

    const applySize = (cssWidth: number, cssHeight: number) => {
      if (cssWidth <= 0 || cssHeight <= 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr);
      const w = Math.max(1, Math.round(cssWidth * dpr));
      const h = Math.max(1, Math.round(cssHeight * dpr));
      refreshBounds();
      if (w === canvas.width && h === canvas.height) return;
      canvas.width = w;
      canvas.height = h;
      width = cssWidth;
      height = cssHeight;
      simulation.resize(w, h);
      renderer.setAspect(cssWidth / Math.max(cssHeight, 1));
    };

    // --- puntero -----------------------------------------------------------
    // Se acumula el trayecto entre fotogramas; la fuerza se aplica sobre ese
    // segmento, no sobre un punto, para que el cursor atraviese el humo.
    let pointer: PointerSample | null = null;
    let pendingX = 0;
    let pendingY = 0;
    let lastX = -1;
    let lastY = -1;
    let hasPointer = false;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || motionRef.current) return;
      const x = (event.clientX - bounds.left) / bounds.width;
      // El origen de la simulación está abajo, como en GL.
      const y = 1 - (event.clientY - bounds.top) / bounds.height;
      // Fuera del hero se suelta el puntero: el humo sigue solo su curso.
      if (x < -0.1 || x > 1.1 || y < -0.1 || y > 1.1) {
        hasPointer = false;
        return;
      }
      if (!hasPointer) {
        lastX = x;
        lastY = y;
        hasPointer = true;
      }
      pendingX = x;
      pendingY = y;
    };

    const tick = (now: number) => {
      if (!running) return;
      if (!lastTime) lastTime = now;
      // Se acota el paso: tras una pausa larga no debe darse un salto brusco.
      const dt = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;
      elapsed += dt;

      if (hasPointer) {
        const dx = pendingX - lastX;
        const dy = pendingY - lastY;
        pointer =
          dx !== 0 || dy !== 0
            ? { prevX: lastX, prevY: lastY, x: pendingX, y: pendingY, dx, dy }
            : null;
        lastX = pendingX;
        lastY = pendingY;
      } else {
        pointer = null;
      }

      simulation.step(dt, pointer);
      renderer.render(simulation.densityTexture, elapsed);
      frame = requestAnimationFrame(tick);
    };

    // Los listeners solo viven mientras el hero se está simulando: fuera de
    // vista no se escucha nada. Van en window porque la capa del humo es
    // `pointer-events: none` y no recibiría los eventos por sí misma.
    const start = () => {
      if (running) return;
      running = true;
      lastTime = 0;
      refreshBounds();
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('scroll', refreshBounds, { passive: true });
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', refreshBounds);
      hasPointer = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const rect = host.getBoundingClientRect();
    applySize(rect.width, rect.height);

    // ResizeObserver entrega medidas ya calculadas: no fuerza reflow.
    const resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) applySize(box.width, box.height);
    });
    resizeObserver.observe(host);

    // Solo se simula mientras el hero está a la vista.
    // Se recuerda el último estado de intersección porque el manejador de
    // pestaña lo necesita: el observer solo vuelve a disparar cuando la
    // intersección CAMBIA, así que no puede corregir a posteriori.
    let intersecting = false;
    const visibility = new IntersectionObserver(
      ([entry]) => {
        intersecting = entry.isIntersecting;
        if (intersecting && !document.hidden) start();
        else stop();
      },
      { threshold: 0.01 }
    );
    visibility.observe(host);

    // Al volver a la pestaña solo se reanuda si el hero SIGUE a la vista. Sin
    // la condición, el ciclo «INICIO → otra ruta → cambiar de pestaña →
    // volver» rearrancaba el bucle y los listeners sobre un hero oculto, y
    // seguían consumiendo GPU hasta la siguiente navegación a INICIO.
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (intersecting) start();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // La preferencia de movimiento se aplica sin recrear el contexto WebGL.
    const applyMotion = (reduced: boolean) => {
      simulation.setMotionScale(reduced ? 0.18 : 1);
      renderer.setOpacity(reduced ? 0.6 : 0.9);
      if (reduced) {
        hasPointer = false;
        pointer = null;
      }
    };
    applyMotionRef.current = applyMotion;
    applyMotion(motionRef.current);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      applyMotionRef.current = null;
      renderer.dispose();
      simulation.dispose();
      quad.dispose();
      // No se fuerza `loseContext()`: el contexto pertenece al canvas y en un
      // remontaje (React lo hace en desarrollo) volvería perdido e inservible.
      // Liberar programas, texturas y buffers ya evita la fuga.
      void width;
      void height;
    };
  }, []);

  // La preferencia se propaga tras el render: el manejador del puntero la
  // consulta por referencia y la simulación ajusta su escala de movimiento.
  useEffect(() => {
    motionRef.current = reducedMotion;
    applyMotionRef.current?.(reducedMotion);
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  );
}
