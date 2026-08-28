import { MusicCard } from '@/components/music/MusicCard';
import { releasesByDateDesc, releaseKind } from '@/data/music-releases';
import { SCENE_FULL, SCENE_CONTENT } from './scene';

/* ---------------------------------------------------------------------------
   MÚSICA — la discografía del artista.

   Dos bloques y nada más: el último lanzamiento, solo y grande, y debajo el
   resto en una cuadrícula. Sin filtros, sin pestañas, sin contadores: la
   sección se recorre mirando.

   El destacado NO se elige a mano. Es siempre el primero de la lista ordenada
   por fecha descendente, de modo que publicar una canción nueva la asciende
   sola — cuando los datos vengan de Google Sheets, añadir una fila bastará.

   Esta sección y sus piezas son Server Components: no hay estado, y el
   `prefers-reduced-motion` se resuelve con la variante `motion-reduce:` de
   Tailwind en vez de con JavaScript. No se envía ni un byte de JS por ella.
--------------------------------------------------------------------------- */
export function MusicSection() {
  const releases = releasesByDateDesc();
  const [latest, ...rest] = releases;

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

        {latest && (
          /* ÚLTIMO LANZAMIENTO — solo, centrado y sin nada alrededor. Ni
             rótulo ni ficha: lo que lo señala como el más reciente es que está
             solo y es mucho más grande que el resto. */
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
             escritorio 24px, así que la retícula respira sin apretarse nunca. */
          <div className="mt-block grid grid-cols-2 gap-[clamp(0.75rem,0.5vw+1.1svh,1.5rem)] lg:grid-cols-3">
            {rest.map((release) => (
              <MusicCard key={release.id} release={release} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
