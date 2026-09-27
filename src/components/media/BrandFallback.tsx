import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';

/**
 * Fondo de marca de un vídeo sin portada (el mismo lenguaje que MÚSICA: brasa
 * burdeos + isotipo). Va DETRÁS del vídeo: un `<video>` sin portada ni
 * fotogramas no pinta nada, así que se ve hasta el primer fotograma y después
 * queda tapado sin estado que gestionar.
 */
export function BrandFallback() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 flex items-center justify-center"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 60% at 50% 45%, rgba(122,32,38,0.42), rgba(0,0,0,0) 70%), linear-gradient(160deg, #161012 0%, #090607 60%, #050304 100%)',
      }}
    >
      <Image
        src={hosmanData.images.logo.isotipoDorado}
        alt=""
        width={200}
        height={200}
        className="h-auto w-[38%] opacity-[0.35]"
      />
    </div>
  );
}