import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import { SCENE_FULL, SCENE_CONTENT } from './scene';

/** GALERÍA — mampostería de dos/tres columnas con las fotos de show y sesión. */
export function GallerySection() {
  const data = hosmanData;

  return (
    <section className={SCENE_FULL}>
      <div className={SCENE_CONTENT}>
        <h2 className="text-section mb-3 tracking-wide">
          GALERÍA
        </h2>
        <p className="text-sm text-gray-400 mb-10">
          El show, los caballos y la música de Hosman Bravo.
        </p>
        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {[...data.images.shows, ...data.images.galeria].map((src, i) => (
            <div key={src} className="relative overflow-hidden rounded-lg break-inside-avoid group">
              <Image
                src={src}
                alt={`Hosman Bravo galería ${i + 1}`}
                width={800}
                height={1000}
                className="w-full h-auto object-cover group-hover:scale-105 transition duration-500"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
