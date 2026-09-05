'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MusicCard } from '@/components/music/MusicCard';
import { YouTubeModal } from '@/components/music/YouTubeModal';
import { releasesByDateDesc, releasePresentation, releaseKind } from '@/data/music-releases';
import { useMusicReleases } from '@/hooks/useMusicReleases';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { MusicRelease } from '@/data/types';
import { SCENE_FULL, SCENE_SHOWCASE } from './scene';

/* ---------------------------------------------------------------------------
   MÚSICA — la discografía del artista.

   Dos bloques y nada más: el último lanzamiento, solo y grande, y debajo el
   resto en una cuadrícula. Sin filtros, sin pestañas, sin contadores: la
   sección se recorre mirando.

   El destacado NO se elige a mano. Es siempre el primero de la lista ordenada
   por fecha descendente, de modo que publicar una canción nueva la asciende
   sola: basta con añadir su fila a la hoja de cálculo.

   DE DÓNDE SALEN LOS DATOS
   Del snapshot publicado (`/content.json`), leído en el navegador (ver
   `useMusicReleases`). Esta sección es un componente de cliente por eso y solo
   por eso — la composición, las medidas y `MusicCard` son exactamente los
   aprobados, no se ha tocado una clase. Si el snapshot no se puede leer, la
   sección lo dice y sigue funcionando.
--------------------------------------------------------------------------- */

/** Alto de cada hueco mientras se carga: el mismo que tendrá la pieza real. */
const PLACEHOLDER_BOX =
  'rounded-[3px] bg-white/[0.03] ring-1 ring-white/[0.05] motion-safe:animate-pulse';

/* ---------------------------------------------------------------------------
   LA REJILLA: columnas por espacio real, no por viewport.

   Antes era `grid-cols-2 lg:grid-cols-3`. `lg` es un umbral de VIEWPORT
   (1024px), pero la rejilla no vive en el viewport: vive dentro del contenedor
   de la sección. Medido, eso producía una discontinuidad absurda: a 1024px de
   ventana la tarjeta medía 312px y a 960px pasaba a 447px — quitar 64px de
   ventana la hacía un 43% MÁS GRANDE.

   `29cqw` es la clave: el ancho de columna se mide contra el CONTENEDOR. Como
   numerador y denominador escalan juntos, el número de columnas se mantiene
   estable en todo el tramo fluido (100/29 ≈ 3,4 → tres columnas) y la tarjeta
   crece y decrece de forma continua. La estructura solo cambia cuando el
   `clamp()` toca un extremo.

   ⚠️ EL SEGUNDO TÉRMINO DEL `minmax` TIENE QUE SER `1fr`, Y NO UN TOPE.
   Se probó primero con un tope elástico —`minmax(base, base*1.2)`— para que el
   sobrante fuese margen en vez de inflar la tarjeta. **No funciona**, y no por
   gusto: cuando el máximo de un `minmax` es una longitud DEFINIDA, la
   especificación de Grid cuenta las columnas usando ese máximo, no el mínimo.
   Medido: en 1920 daba 2 columnas de 576px en vez de 3. Con `1fr` el máximo es
   indefinido, el recuento vuelve a usar el mínimo y las columnas reparten el
   ancho completo.

   Queda un salto residual de ×1,5 en la transición 3→2, que es inevitable si
   se quiere que la rejilla ocupe todo el ancho. Pero ya no cae donde molestaba:
   con el mínimo relativo al contenedor, las tres columnas aguantan desde ~534px
   de contenedor hasta el tope, así que la transición se ha ido al rango
   teléfono-tablet, donde pasar a dos columnas es lo deseable.
--------------------------------------------------------------------------- */

/** Ancho mínimo de columna, medido contra el CONTENEDOR de la sección. */
const COLUMNA = 'clamp(155px, 29cqw, 30rem)';

const REJILLA: React.CSSProperties = {
  gridTemplateColumns: `repeat(auto-fill, minmax(${COLUMNA}, 1fr))`,
  gap: 'clamp(0.75rem, 1.5cqw, 1.75rem)'
};

/* La destacada conserva su proporción respecto al contenedor —los 54rem sobre
   72rem de antes son un 75%—, pero deja de ser un tope fijo: así crece con la
   sección en vez de quedarse en 864px en una pantalla de 2560. La variante
   cuadrada mantiene igualmente su relación anterior (34/72 ≈ 47%). */
const DESTACADA_ANCHA: React.CSSProperties = { width: 'min(100%, 75cqw)' };
const DESTACADA_CUADRADA: React.CSSProperties = { width: 'min(100%, 47cqw)' };

export function MusicSection() {
  const { releases, source } = useMusicReleases();

  const ordered = releasesByDateDesc(releases);
  const [latest, ...rest] = ordered;

  /* EL VÍDEO ABIERTO, si lo hay. Vive aquí y no en `MusicCard` por dos
     razones: el `<article>` de la tarjeta declara `isolate`, así que un modal
     dentro quedaría atrapado en SU contexto de apilamiento por mucho `z-index`
     que llevase; y habría un modal por pieza en lugar de uno solo. */
  const [playing, setPlaying] = useState<MusicRelease | null>(null);

  /* Quién abrió el vídeo, para devolverle el foco al cerrar. Se guarda el
     elemento y no un índice: la lista puede reordenarse si llega un snapshot
     nuevo mientras el modal está abierto. */
  const triggerRef = useRef<HTMLElement | null>(null);

  const openVideo = useCallback((release: MusicRelease) => {
    const active = document.activeElement;
    triggerRef.current = active instanceof HTMLElement ? active : null;
    setPlaying(release);
  }, []);

  const closeVideo = useCallback(() => setPlaying(null), []);

  /* El foco vuelve DESPUÉS de que el modal salga del DOM — por eso va en un
     efecto y no dentro de `closeVideo`: al desmontarse el diálogo el foco cae
     en `<body>`, y devolverlo antes lo perdería igualmente. */
  useEffect(() => {
    if (playing) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    triggerRef.current = null;
    trigger.focus();
  }, [playing]);

  /* Solo abre modal la pieza que tiene videoclip. `releaseKind` lo deriva del
     `youtubeId`, que es el dato que de verdad permite reproducir algo. */
  const playHandler = (release: MusicRelease) =>
    releaseKind(release) === 'video' ? () => openVideo(release) : undefined;

  /* --- PREVIEWS --------------------------------------------------------
     Quién manda sobre las previews vive aquí, no en la tarjeta: solo desde
     arriba se puede garantizar que haya UNA secundaria activa a la vez. */

  const movimientoReducido = useReducedMotion();

  /* El hover solo cuenta con puntero fino. En táctil el «hover» del navegador
     es un fantasma del toque y encendería previews que nadie pidió, así que
     allí no se escucha siquiera. Se mide tras montar, no en el render: en el
     build del export estático no hay `matchMedia`. */
  const [punteroFino, setPunteroFino] = useState(false);
  useEffect(() => {
    const consulta = window.matchMedia('(hover: hover) and (pointer: fine)');
    const sincroniza = () => setPunteroFino(consulta.matches);
    sincroniza();
    consulta.addEventListener('change', sincroniza);
    return () => consulta.removeEventListener('change', sincroniza);
  }, []);

  /** Id de la secundaria que está reproduciendo. Una, o ninguna. */
  const [secundariaActiva, setSecundariaActiva] = useState<string | null>(null);

  /* La precarga de los reproductores de YouTube NO arranca con el montaje:
     espera a que la sección esté pintada. Dos `requestAnimationFrame`
     encadenados son la forma fiable de decir «después del primer pintado», y
     así crear seis iframes no compite con la entrada en la escena. */
  const [precargar, setPrecargar] = useState(false);
  useEffect(() => {
    if (movimientoReducido || source === 'loading') return;
    let segundo = 0;
    const primero = requestAnimationFrame(() => {
      segundo = requestAnimationFrame(() => setPrecargar(true));
    });
    return () => {
      cancelAnimationFrame(primero);
      cancelAnimationFrame(segundo);
    };
  }, [movimientoReducido, source]);

  /* Con movimiento reducido no hay previews de ninguna clase: un vídeo que
     arranca solo es movimiento, y silenciarlo no lo cambia. */
  const previewsActivas = !movimientoReducido;

  const alHover = (id: string) => (dentro: boolean) =>
    setSecundariaActiva((previa) => (dentro ? id : previa === id ? null : previa));

  /* Un single destacado se acota más que un videoclip: a 54rem de ancho una
     funda cuadrada sería una caja desproporcionada. Ambas son clases
     literales — el JIT de Tailwind no compila clases construidas en tiempo de
     ejecución. */
  const anchoDestacada =
    latest && releasePresentation(latest) === 'window' ? DESTACADA_ANCHA : DESTACADA_CUADRADA;

  return (
    <section className={SCENE_FULL}>
      <div className={SCENE_SHOWCASE}>
        <h2 className="text-section tracking-wide mb-3 text-center">
          LA <span className="text-amber-400">MÚSICA</span>
        </h2>
        <p className="mx-auto max-w-xl text-center text-sm text-gray-400">
          La música de Hosman Bravo, reunida en un solo sitio.
        </p>

        {source === 'loading' ? (
          /* CARGA — no es un diseño nuevo: es la MISMA composición con las
             piezas en hueco, para que al llegar los datos nada salte de sitio.
             Un destacado y cinco huecos de cuadrícula, con las proporciones
             reales (16:9 y 4:3). */
          <div aria-busy="true" aria-live="polite">
            <span className="sr-only">Cargando la discografía…</span>
            <div className="mt-block flex justify-center">
              <div
                style={DESTACADA_ANCHA}
                className={`${PLACEHOLDER_BOX} aspect-video`}
              />
            </div>
            <div className="mt-block grid justify-center" style={REJILLA}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={`${PLACEHOLDER_BOX} aspect-[4/3]`} />
              ))}
            </div>
          </div>
        ) : ordered.length === 0 ? (
          /* SIN CATÁLOGO — el snapshot no se pudo leer y el respaldo está vacío a
             propósito (ver `music-releases.ts`: antes había canciones
             inventadas y un fallo publicaba una discografía falsa).

             No es un diseño nuevo: es la misma tipografía de la bajada de la
             sección. Prefiere decir la verdad en una línea antes que dejar una
             cuadrícula muda que parezca rota. */
          <p className="mx-auto mt-block max-w-xl text-center text-sm text-gray-500">
            No hemos podido cargar la discografía en este momento. Puedes escuchar a
            Hosman Bravo desde los accesos a plataformas de la cabecera.
          </p>
        ) : (
          <>
            {latest && (
              /* ÚLTIMO LANZAMIENTO — solo, centrado y sin nada alrededor. Ni
                 rótulo ni ficha: lo que lo señala como el más reciente es que
                 está solo y es mucho más grande que el resto. */
              <div className="mt-block flex justify-center">
                <div style={anchoDestacada}>
                  {/* La destacada arranca sola y NO se para cuando una
                      secundaria entra en hover: son piezas independientes.
                      Quién es la destacada sale del orden por fecha, así que
                      publicar una canción nueva cambia también su preview sin
                      tocar código. */}
                  <MusicCard
                    release={latest}
                    featured
                    onPlay={playHandler(latest)}
                    previewActiva={previewsActivas}
                  />
                </div>
              </div>
            )}

            {rest.length > 0 && (
              /* EL RESTO — dos columnas en móvil, tres a partir de `lg`. La
                 separación se interpola con el viewport igual que el resto del
                 sistema, en vez de saltar por breakpoint: a 320px son 12px y en
                 escritorio 24px, así que la retícula respira sin apretarse. */
              <div className="mt-block grid justify-center" style={REJILLA}>
                {rest.map((release) => (
                  <MusicCard
                    key={release.id}
                    release={release}
                    onPlay={playHandler(release)}
                    previewActiva={previewsActivas && secundariaActiva === release.id}
                    /* La precarga va atada al puntero fino: en un móvil las
                       secundarias no se pueden activar nunca, así que crear
                       sus reproductores sería gastar seis iframes para nada. */
                    precargarPreview={previewsActivas && punteroFino && precargar}
                    /* Sin puntero fino no se pasa manejador: la tarjeta ni
                       siquiera escucha el hover en un móvil. */
                    onHoverChange={
                      previewsActivas && punteroFino ? alHover(release.id) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* El modal solo existe mientras hay vídeo abierto: su montaje y su
          desmontaje SON el ciclo de vida completo (scroll, audio y
          reproductor). La comprobación de `youtubeId` además lo estrecha a
          `string`, que es lo que el modal necesita. */}
      {playing?.youtubeId && (
        <YouTubeModal
          videoId={playing.youtubeId}
          title={playing.title}
          onClose={closeVideo}
        />
      )}
    </section>
  );
}
