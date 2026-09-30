import { getPublishedGallery } from '@/lib/content-api';
import { MediaTile } from '@/components/media/MediaTile';
import { MediaViewer } from '@/components/media/MediaViewer';
import { SCENE_FULL, SCENE_CONTENT } from './scene';

/** Texto accesible si la fila no tiene Descripción. */
const RESERVA = { image: 'Foto de la galería de Hosman Bravo', video: 'Vídeo de la galería de Hosman Bravo' } as const;

/**
 * GALERÍA — mampostería de dos/tres columnas. Las fotos y vídeos salen de
 * `04_GALERIA` (CMS), ya ordenados; un vídeo ocupa su hueco con su propia
 * proporción, igual que una foto. Toda la galería es UNA colección del visor.
 */
export function GallerySection() {
  const items = getPublishedGallery();

  return (
    <section className={SCENE_FULL}>
      <div className={SCENE_CONTENT}>
        <h2 className="titulo-editorial mb-3 tracking-wide">
          GALERÍA
        </h2>
        <p className="text-sm text-gray-400 mb-10">
          El show, los caballos y la música de Hosman Bravo.
        </p>
        <MediaViewer items={items} nombre="Galería de Hosman Bravo">
          <div className="columns-2 md:columns-3 gap-3 space-y-3">
            {items.map((item) => (
              <MediaTile
                key={item.id}
                item={item}
                reserva={RESERVA}
                className="break-inside-avoid"
                sizes="(min-width: 768px) 33vw, 50vw"
              />
            ))}
          </div>
        </MediaViewer>
      </div>
    </section>
  );
}
