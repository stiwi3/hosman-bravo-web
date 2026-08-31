'use client';

import { MusicCard } from '@/components/music/MusicCard';
import { releasesByDateDesc, releaseKind } from '@/data/music-releases';
import { useMusicReleases } from '@/hooks/useMusicReleases';
import { SCENE_FULL, SCENE_CONTENT } from './scene';

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

export function MusicSection() {
  const { releases, source } = useMusicReleases();

  const ordered = releasesByDateDesc(releases);
  const [latest, ...rest] = ordered;

  /* Un single destacado se acota más que un videoclip: a 54rem de ancho una
     funda cuadrada sería una caja desproporcionada. Ambas son clases
     literales — el JIT de Tailwind no compila clases construidas en tiempo de
     ejecución. */
  const featuredWidth =
    latest && releaseKind(latest) === 'video' ? 'max-w-release' : 'max-w-release-square';

  return (
    <section className={SCENE_FULL}>
      <div className={SCENE_CONTENT}>
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
              <div className={`w-full max-w-release ${PLACEHOLDER_BOX} aspect-video`} />
            </div>
            <div className="mt-block grid grid-cols-2 gap-[clamp(0.75rem,0.5vw+1.1svh,1.5rem)] lg:grid-cols-3">
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
                <div className={`w-full ${featuredWidth}`}>
                  <MusicCard release={latest} featured />
                </div>
              </div>
            )}

            {rest.length > 0 && (
              /* EL RESTO — dos columnas en móvil, tres a partir de `lg`. La
                 separación se interpola con el viewport igual que el resto del
                 sistema, en vez de saltar por breakpoint: a 320px son 12px y en
                 escritorio 24px, así que la retícula respira sin apretarse. */
              <div className="mt-block grid grid-cols-2 gap-[clamp(0.75rem,0.5vw+1.1svh,1.5rem)] lg:grid-cols-3">
                {rest.map((release) => (
                  <MusicCard key={release.id} release={release} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
