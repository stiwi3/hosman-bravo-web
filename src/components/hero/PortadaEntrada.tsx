'use client';

import { useEffect, useState } from 'react';
import { useSelectedLayoutSegment } from 'next/navigation';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useDisenoEntrada } from '@/components/audio/disenoEntrada';
import { useSalidaTelon } from './salidaTelon';
import { FUNDIDO_PRE_HERO_MS } from './PreHero';
import { hosmanData } from '@/data/hosman-data';

/* ---------------------------------------------------------------------------
   PORTADA DE ENTRADA — NUEVA ENTRADA (01-10-2026, implementación activa).

   Fondo oscuro que ocupa el marco del Hero mientras la entrada está puesta, y
   que se abre al destello inicial del Pre-Hero. Solo existe en INICIO porque
   depende de ese marco: vive DENTRO de él (misma caja, misma máscara, mismo
   responsive que Pre-Hero y Hero, por construcción) y por encima del Pre-Hero.

   No conoce a `EntryScreen`: escucha la misma señal que el Pre-Hero
   (`useSalidaTelon`). La tarjeta con el CTA es de `EntryScreen`.

   CUÁNDO SE RETIRA — por eventos, no a ciegas con un reloj:
   · Con Pre-Hero: cuando el Pre-Hero ya cubre el marco con un fotograma real
     (`preHeroCubre`, su `onCubre` de siempre). Así nunca asoma el Hero entre la
     portada y el vídeo.
   · Si el Pre-Hero no llega a cubrir (error, arranque rechazado): red de
     seguridad con la misma espera que su vigilante (`ESPERA_MAX_MS`). Pasado
     ese plazo el Pre-Hero ya se ha dado por terminado, y lo que hay debajo es
     el Hero, que es lo correcto.
   · Sin Pre-Hero (carga en otra ruta, movimiento reducido): directa al Hero.

   Una vez retirada no vuelve. Solo CSS: gradientes y un pulso de opacidad.
--------------------------------------------------------------------------- */

/** Igual que el vigilante del Pre-Hero: pasado este plazo ya no va a cubrir. */
const ESPERA_MAX_MS = 2500;

/** Fundido de la portada. `onCubre` del Pre-Hero llega al EMPEZAR su propio
 *  fundido de entrada, así que la portada espera a que termine: nunca son
 *  transparentes a la vez y el Hero no asoma ni un fotograma. Acaba cuando el
 *  destello del Pre-Hero está en su pico (~0,67 s de vídeo). */
const FUNDIDO_MS = 520;
const RETRASO_MS = FUNDIDO_PRE_HERO_MS;
const FUNDIDO_REDUCIDO_MS = 150;

type Fase = 'puesta' | 'saliendo' | 'retirada';

/** Estado de la portada. Lo lleva `HeroScene` para saber si cubre el rótulo. */
export function usePortadaEntrada(preHeroCubre: boolean) {
  const diseno = useDisenoEntrada();
  const salida = useSalidaTelon();
  const segment = useSelectedLayoutSegment();
  const reducedMotion = useReducedMotion();

  /* Misma regla que el Pre-Hero: solo una carga en `/` lo tiene. */
  const [cargaEnInicio] = useState(() => segment === null);
  const conPreHero = cargaEnInicio && !reducedMotion;

  const [fase, setFase] = useState<Fase>('puesta');
  const [plazoVencido, setPlazoVencido] = useState(false);

  if (fase === 'puesta' && salida !== null && (!conPreHero || preHeroCubre || plazoVencido)) {
    setFase('saliendo');
  }

  useEffect(() => {
    if (fase !== 'puesta' || salida === null || !conPreHero) return;
    const timer = window.setTimeout(() => setPlazoVencido(true), ESPERA_MAX_MS);
    return () => window.clearTimeout(timer);
  }, [fase, salida, conPreHero]);

  /* Desmontaje al acabar el fundido. Con reloj y no con `transitionend`: si la
     salida ocurre con INICIO oculto (otra ruta), no hay transición que acabe. */
  useEffect(() => {
    if (fase !== 'saliendo') return;
    const ms = reducedMotion ? FUNDIDO_REDUCIDO_MS : RETRASO_MS + FUNDIDO_MS;
    const timer = window.setTimeout(() => setFase('retirada'), ms + 50);
    return () => window.clearTimeout(timer);
  }, [fase, reducedMotion]);

  const activa = diseno === 'portada' && fase !== 'retirada';
  return {
    activa,
    /** Mientras la portada esté montada (también durante su fundido), el rótulo
     *  del Hero no se ve: si no, reaparecería por encima de una portada aún opaca. */
    cubre: activa,
    saliendo: fase === 'saliendo',
    reducedMotion
  };
}

const FONDO = [
  // Viñeta: cierra el encuadre hacia los bordes (la máscara del marco los funde).
  'radial-gradient(ellipse 85% 70% at 50% 48%, transparent 38%, rgba(0,0,0,0.6) 100%)',
  // Burdeos muy contenido, algo por debajo del centro.
  'radial-gradient(ellipse 70% 50% at 58% 60%, rgba(96,22,29,0.42), transparent 70%)',
  // Base carbón cálido.
  'linear-gradient(180deg, #0c0708 0%, #080506 55%, #050304 100%)'
].join(', ');

/** Ascua ámbar en el flanco izquierdo: por ahí entra el destello del Pre-Hero. */
const ASCUA =
  'radial-gradient(ellipse 72% 50% at 0% 46%, rgba(222,146,60,0.46), rgba(160,86,32,0.17) 48%, transparent 76%)';

const KEYFRAMES = `@keyframes hb-portada-ascua { from { opacity: 0.7; } to { opacity: 1; } }`;

/**
 * ISOTIPO DE FONDO — el oficial (`isotipo-dorado.png`), sin filtros, sombras ni
 * opacidad añadidos (BRAND §5): se integra por composición. Va por encima del
 * centro del marco para que la tarjeta de `EntryScreen`, centrada en la
 * pantalla, tape su parte baja y deje ver la cabeza y la corona — isotipo
 * encima y logotipo (en la tarjeta) debajo, como el imagotipo del manual.
 *
 * Tope de 306 px: el PNG mide 613 px y BRAND §8 exige cubrir ancho CSS × DPR
 * hasta DPR 2. Para ir más grande hace falta el vector del manual.
 */
const ISOTIPO_STYLE: React.CSSProperties = {
  width: 'min(56%, 306px)',
  /* Fuera (casi) de la franja superior que difumina la máscara del marco, para
     que la corona no pierda opacidad por la máscara. */
  top: '12%'
};

export function PortadaEntrada({
  saliendo,
  reducedMotion
}: {
  saliendo: boolean;
  reducedMotion: boolean;
}) {
  const transition = reducedMotion
    ? `opacity ${FUNDIDO_REDUCIDO_MS}ms linear`
    : `opacity ${FUNDIDO_MS}ms cubic-bezier(0.45, 0, 0.55, 1) ${RETRASO_MS}ms`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ background: FONDO, opacity: saliendo ? 0 : 1, transition }}
    >
      {!reducedMotion && <style>{KEYFRAMES}</style>}
      <div
        className="absolute inset-0"
        style={{
          background: ASCUA,
          animation: reducedMotion ? undefined : 'hb-portada-ascua 6s ease-in-out infinite alternate'
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hosmanData.images.logo.isotipoDorado}
        alt=""
        width={613}
        height={647}
        draggable={false}
        className="absolute left-1/2 h-auto -translate-x-1/2 select-none"
        style={ISOTIPO_STYLE}
      />
    </div>
  );
}
