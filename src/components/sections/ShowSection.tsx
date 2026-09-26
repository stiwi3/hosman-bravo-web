import Image from 'next/image';
import Link from 'next/link';
import { hosmanData } from '@/data/hosman-data';
import { HorseVideos } from '@/components/show/HorseVideos';
import { SCENE, SCENE_CONTENT, SCENE_SHOWCASE } from './scene';

/**
 * EL SHOW — el espectáculo y, debajo, el elenco ecuestre.
 *
 * Son dos `<section>` seguidas y por eso esta escena NO usa `SCENE_FULL`: con
 * `min-h-screen` la primera empujaría la segunda fuera de la vista.
 */
export function ShowSection() {
  const data = hosmanData;

  return (
    <>
      <section className={`${SCENE} ${SCENE_CONTENT}`}>
        <h2 className="titulo-editorial tracking-wide mb-3 text-center">
          EL <span className="text-red-600">SHOW</span>
        </h2>
        <p className="text-sm text-gray-400 text-center max-w-2xl mx-auto mb-12">
          Música en vivo y caballos de alta escuela en un mismo escenario.
          Un espectáculo único en Colombia que tu público nunca olvidará.
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {data.images.shows.map((src, i) => (
            <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-lg group">
              <Image
                src={src}
                alt={`Show de Hosman Bravo ${i + 1}`}
                fill
                className="object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          {/* Era un `<button>` que cambiaba el estado de página; ahora GALERÍA
              es una ruta. Mismas clases, mismo aspecto. */}
          <Link
            href="/galeria"
            className="inline-block border border-amber-400 text-amber-400 px-8 py-3 text-xs font-black tracking-widest hover:bg-amber-400 hover:text-black transition"
          >
            VER GALERÍA COMPLETA
          </Link>
        </div>
      </section>

      {/* SECCIÓN CABALLOS
          No lleva `pt-scene-top`: no arranca bajo la cabecera fija, sino
          a continuación de la sección anterior. */}
      <section className="py-block px-scene-x bg-gradient-to-b from-black via-red-950/20 to-black">
        <div className={SCENE_SHOWCASE}>
          <h2 className="titulo-editorial tracking-wide mb-block text-center">
            EL <span className="text-amber-400">ELENCO</span> ECUESTRE
          </h2>
          {/* 2 o 4 columnas, nunca 1: los cuatro caballos se ven siempre de dos
              en dos, también en el teléfono. Como en MÚSICA, el umbral mide el
              CONTENEDOR (`@min-*`), no el viewport: 4 columnas mientras cada
              tarjeta conserve ~200px. Entre umbrales las columnas son `1fr` y
              crecen de forma continua.

              `--hb-card-pad` es el padding de la tarjeta y lo lee también
              `HorseVideos` para llevar sus flechas hasta el borde interior. */}
          <div className="grid grid-cols-2 gap-[clamp(0.75rem,1.5cqw,1.75rem)] @min-[56rem]:grid-cols-4">
            {data.horses.map((horse) => (
              <div
                key={horse.id}
                className="flex min-w-0 flex-col border border-white/10 rounded-lg [--hb-card-pad:clamp(0.875rem,1.6cqw,2rem)] p-[var(--hb-card-pad)] text-center hover:border-amber-400/50 transition bg-black/40"
              >
                {/* `flex-1`: el texto absorbe la diferencia de alto entre
                    caballos y los vídeos de una misma fila quedan alineados. */}
                <div className="flex-1 mb-[clamp(1rem,1.4cqw,1.5rem)]">
                  <h3 className="text-[clamp(1.125rem,2.4cqw,1.5rem)] leading-tight font-black text-amber-400 mb-2">{horse.name}</h3>
                  <p className="text-xs tracking-widest text-gray-500 mb-4">{horse.description.toUpperCase()}</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{horse.role}</p>
                </div>
                <HorseVideos nombre={horse.name} videos={horse.videos} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
