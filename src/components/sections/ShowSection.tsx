import Link from 'next/link';
import { hosmanData } from '@/data/hosman-data';
import { getPublishedHorseMedia, getPublishedShowMedia } from '@/lib/content-api';
import { MediaTile } from '@/components/media/MediaTile';
import { HorseMedia } from '@/components/show/HorseMedia';
import { SCENE, SCENE_CONTENT, SCENE_SHOWCASE } from './scene';

/** Texto accesible si la fila no tiene Descripción. */
const RESERVA = { image: 'Foto del show de Hosman Bravo', video: 'Vídeo del show de Hosman Bravo' } as const;

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
        {/* Fotos y vídeos de `06_EL_SHOW` (CMS). Un vídeo ocupa el mismo hueco
            3:4 que una foto.

            Filas de 2 (4 desde `lg`) y la última, si queda incompleta, CENTRADA:
            flex con salto de línea y cada pieza del ancho exacto de una columna
            (`--cols` columnas separadas por `--gap`). Funciona con cualquier
            número de medios; no hay reglas por posición. */}
        <div className="flex flex-wrap justify-center gap-[var(--gap)] [--cols:2] [--gap:0.75rem] lg:[--cols:4]">
          {getPublishedShowMedia().map((item) => (
            <MediaTile
              key={item.id}
              item={item}
              reserva={RESERVA}
              relleno
              className="aspect-[3/4] flex-none w-[calc((100%_-_(var(--cols)_-_1)_*_var(--gap))_/_var(--cols))]"
              sizes="(min-width: 1024px) 25vw, 50vw"
            />
          ))}
        </div>
        <div className="text-center mt-10">
          {/* `inline-flex` y NO la clase `inline-` + `block`: por el token
              `--spacing-block`, Tailwind 4.2 le añade un ancho fijo y el botón
              se estrecha a ~65px (ARCHITECTURE §7). No escribir aquí esa clase
              entera: Tailwind lee también los comentarios y la generaría. */}
          <Link
            href="/galeria"
            className="inline-flex border border-amber-400 text-amber-400 px-8 py-3 text-xs font-black tracking-widest hover:bg-amber-400 hover:text-black transition"
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
              `HorseMedia` para llevar sus flechas hasta el borde interior. */}
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
                <HorseMedia nombre={horse.name} media={getPublishedHorseMedia(horse.id)} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
