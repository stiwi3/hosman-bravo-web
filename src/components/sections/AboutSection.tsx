import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import { SCENE_FULL, SCENE_CONTENT } from './scene';

/** SOBRE MÍ — foto e información como una sola composición a dos columnas. */
export function AboutSection() {
  const data = hosmanData;

  return (
    <section className={SCENE_FULL}>
      <div className={SCENE_CONTENT}>
        {/* ABOUTLAYOUT — foto e info forman una sola composición.
            El `grid` es la única fuente de ancho total, ancho relativo
            entre columnas, separación y escala: cuando el viewport
            encoge, es ESTA rejilla la que se estrecha, y las dos columnas
            la siguen en la misma proporción porque ninguna tiene una
            medida propia que la desconecte de ella.

            La foto NO lleva un alto propio (`h-[min(72svh,...)]`, como
            tuvo en una versión anterior): eso la hacía más angosta que su
            columna en viewports bajos —el alto mandaba, el ancho quedaba
            suelto— y dejaba un hueco horizontal entre foto y texto que
            rompía la composición. Aquí manda el ANCHO de la columna
            (100% de lo que le da el `grid`) y el alto sale solo de
            `aspect-[3/4]`, así que foto y columna miden lo mismo siempre.
            Si en un viewport bajo la foto resulta más alta que la
            ventana, se resuelve con el scroll normal de esta sección
            (SOBRE MÍ nunca fue una escena sin scroll, a diferencia de
            INICIO), no achicando la foto por su cuenta. */}
        <div className="grid lg:grid-cols-2 gap-block items-start">
          {/* Foto */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
            <Image
              src={data.images.about}
              alt="Hosman Bravo con Don Juan"
              fill
              sizes="(min-width: 1024px) 46vw, 90vw"
              className="object-cover"
            />
          </div>

          {/* Info */}
          <div className="relative">
            {/* La marca de agua se mide en `em` respecto a su propio
                tamaño de letra, así que su desplazamiento acompaña al
                cuerpo en vez de quedarse en los -64px/-20px de antes. */}
            <div className="absolute -top-[0.32em] -left-[0.1em] text-[clamp(6rem,4vw+10svh,12.5rem)] font-black leading-none text-white/5 z-0 pointer-events-none select-none">
              H
            </div>
            <div className="relative z-10 space-y-[clamp(1rem,0.6vw+2svh,2rem)]">
              <h2 className="text-section tracking-wide">
                SOBRE <span className="text-amber-400">HOSMAN BRAVO</span>
              </h2>

              <p className="text-sm leading-relaxed text-gray-300">{data.artist.bio}</p>

              <div>
                <h3 className="text-sm font-black tracking-widest mb-3 text-red-600">ORIGEN</h3>
                <p className="text-sm leading-relaxed text-gray-400">
                  Nacido en {data.artist.birthPlace}, Colombia. Radicado actualmente en {data.artist.currentCity}.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-black tracking-widest mb-3 text-red-600">MÚSICA</h3>
                <ul className="text-sm leading-relaxed text-gray-400 space-y-1">
                  {data.songs.map((song) => (
                    <li key={song.title}>
                      <span className="font-bold text-white">{song.title}</span>{' '}
                      <span className="text-gray-600">({song.year})</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-black tracking-widest mb-4 text-red-600">SÍGUEME</h3>
                <div className="flex gap-2">
                  {[
                    { href: data.socialLinks.tiktok, label: 'TK' },
                    { href: data.socialLinks.instagram, label: 'IG' },
                    { href: data.socialLinks.youtube, label: 'YT' },
                    { href: data.socialLinks.spotify, label: 'SP' },
                    { href: data.socialLinks.facebook, label: 'FB' }
                  ].map(({ href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-xs hover:border-amber-400 hover:text-amber-400 transition"
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-black tracking-widest mb-2 text-red-600">CONTACTO</h3>
                <a href={`mailto:${data.contact.email}`} className="text-sm text-gray-400 hover:text-amber-400 transition">
                  {data.contact.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
