import Link from 'next/link';
import { hosmanData } from '@/data/hosman-data';
import type { MediaItem } from '@/data/types';
import { getPublishedHorseMedia, getPublishedShowMedia } from '@/lib/content-api';
import { videoDimensions } from '@/lib/video-dimensions';
import { MediaTile } from '@/components/media/MediaTile';
import { MediaViewer } from '@/components/media/MediaViewer';
import { HorseMedia } from '@/components/show/HorseMedia';
import { SCENE, SCENE_CONTENT, SCENE_SHOWCASE } from './scene';

/** Texto accesible si la fila no tiene Descripción. */
const RESERVA = { image: 'Foto del show de Hosman Bravo', video: 'Vídeo del show de Hosman Bravo' } as const;

/** Ancho de N columnas base: `--cols` columnas separadas por `--gap`. */
const UNA_COLUMNA = 'w-[calc((100%_-_(var(--cols)_-_1)_*_var(--gap))_/_var(--cols))]';
const DOS_COLUMNAS = 'w-[calc((100%_-_(var(--cols)_-_1)_*_var(--gap))_/_var(--cols)_*_2_+_var(--gap))]';

/**
 * Cómo ocupa la fila una pieza de EL SHOW, según el medio REAL.
 *
 * · Foto: 1 columna, hueco 3:4 (como siempre).
 * · Vídeo: su proporción real, leída del archivo que se ve en la tarjeta
 *   (`previewSrc ?? src`) al generar la página — sin descargas en el navegador
 *   ni saltos al cargar. Horizontal → 2 columnas; vertical → 1. Nunca recortado
 *   ni deformado: la caja tiene la proporción del vídeo.
 * · Si el archivo no se puede leer, el hueco 3:4 de siempre.
 */
function encaje(item: MediaItem): { className: string; style?: React.CSSProperties } {
  if (item.type === 'video') {
    const d = videoDimensions(item.previewSrc ?? item.src);
    if (d) {
      return {
        className: d.width > d.height ? DOS_COLUMNAS : UNA_COLUMNA,
        style: { aspectRatio: `${d.width} / ${d.height}` },
      };
    }
  }
  return { className: `aspect-[3/4] ${UNA_COLUMNA}` };
}

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
        {/* Fotos y vídeos de `06_EL_SHOW` (CMS), en columnas base: 2 (4 desde
            `lg`). Una foto o un vídeo vertical ocupan 1; un vídeo horizontal,
            2, con su encuadre completo (ver `encaje`).

            Flex con salto de línea: lo que no cabe en la fila baja solo, y la
            última, si queda incompleta, sale CENTRADA. Cada pieza mide
            exactamente N columnas (`--cols` columnas separadas por `--gap`).
            `items-center`: piezas de distinta altura se alinean al centro de su
            fila, sin estirarse. Sin reglas por posición ni por nombre.

            Toda EL SHOW es UNA colección del visor. La mano de «ver completo»
            es decisión de ESTA sección: hoy la llevan los vídeos cuya tarjeta
            es una preview (no una regla del modelo ni del visor). */}
        <MediaViewer items={getPublishedShowMedia()} nombre="Fotos y vídeos de El Show">
          <div className="flex flex-wrap items-center justify-center gap-[var(--gap)] [--cols:2] [--gap:0.75rem] lg:[--cols:4]">
            {getPublishedShowMedia().map((item) => {
              const { className, style } = encaje(item);
              return (
                <MediaTile
                  key={item.id}
                  item={item}
                  reserva={RESERVA}
                  relleno
                  mano={item.type === 'video' && item.previewSrc !== undefined}
                  className={`flex-none ${className}`}
                  style={style}
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
              );
            })}
          </div>
        </MediaViewer>
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
