import Image from 'next/image';
import Link from 'next/link';
import { hosmanData } from '@/data/hosman-data';
import { SCENE, SCENE_CONTENT } from './scene';

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
        <h2 className="text-section tracking-wide mb-3 text-center">
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
        <div className={SCENE_CONTENT}>
          <h2 className="text-section tracking-wide mb-block text-center">
            EL <span className="text-amber-400">ELENCO</span> ECUESTRE
          </h2>
          {/* 1 / 2 / 4 columnas. Con `md:grid-cols-3` y cuatro caballos el
              último quedaba solo en una segunda fila, descolgado; en
              múltiplos de 2 la rejilla queda siempre completa. */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.horses.map((horse) => (
              <div
                key={horse.name}
                className="border border-white/10 rounded-lg p-8 text-center hover:border-amber-400/50 transition bg-black/40"
              >
                <h3 className="text-2xl font-black text-amber-400 mb-2">{horse.name}</h3>
                <p className="text-xs tracking-widest text-gray-500 mb-4">{horse.description.toUpperCase()}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{horse.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
