import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import type { MusicRelease, ReleaseKind } from '@/data/types';

/* ---------------------------------------------------------------------------
   La superficie visual de un lanzamiento.

   Resuelve los tres casos que puede traer el dato, y solo eso — el overlay, el
   título y las plataformas son cosa de `MusicCard`:

     · videoclip            → la miniatura llena la pieza a sangre
     · single con portada   → funda cuadrada + vinilo asomando por detrás
     · sin portada          → fallback de marca (brasa burdeos + isotipo)

   ⚠️ NADA de esto usa un asset nuevo. El vinilo es CSS puro y el fallback
   reutiliza el isotipo dorado que ya existe, de modo que sustituirlo por el
   arte definitivo el día de mañana no deja restos que limpiar.

   PUNTO DE ENGANCHE (fase siguiente): la miniatura del caso `video` es lo que
   se sustituye por la preview silenciosa de YouTube. Todo lo demás se queda
   como está.
--------------------------------------------------------------------------- */

/**
 * Disco de vinilo, dibujado con degradados.
 *
 * Tres capas: el surco (una trama radial repetida muy tenue), el brillo
 * direccional que le da volumen, y la etiqueta central en burdeos con filo
 * dorado. Deliberadamente apagado: es un apoyo del single, no el protagonista.
 */
function VinylDisc({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute rounded-full ${className ?? ''}`}
      style={{
        backgroundImage: [
          // Surco. Muy poco contraste: a tamaño de tarjeta un surco marcado se
          // lee como trama de moiré, no como material.
          'repeating-radial-gradient(circle at 50% 50%, rgba(255,255,255,0.035) 0 1px, rgba(0,0,0,0) 1px 3px)',
          // Reflejo direccional, arriba a la izquierda.
          'radial-gradient(circle at 32% 26%, rgba(226,214,196,0.13), rgba(0,0,0,0) 46%)',
          // Cuerpo del disco.
          'radial-gradient(circle at 50% 50%, #241c1f 0%, #0d0a0b 72%, #050304 100%)'
        ].join(', '),
        boxShadow: '0 10px 26px -10px rgba(0,0,0,0.95)'
      }}
    >
      {/* Etiqueta central. */}
      <div
        className="absolute left-1/2 top-1/2 h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          backgroundImage:
            'radial-gradient(circle at 38% 32%, #7e1a20 0%, #4a0d10 70%, #360a0c 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.32)'
        }}
      />
      {/* Agujero central. */}
      <div className="absolute left-1/2 top-1/2 h-[5%] w-[5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#050304]" />
    </div>
  );
}

/** Fallback cuando el lanzamiento no trae portada. */
function BrandFallback() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 80% at 50% 42%, rgba(122,32,38,0.42), rgba(0,0,0,0) 70%), linear-gradient(160deg, #161012 0%, #090607 60%, #050304 100%)'
      }}
    >
      <Image
        src={hosmanData.images.logo.isotipoDorado}
        alt=""
        aria-hidden="true"
        width={200}
        height={200}
        className="h-[46%] w-auto opacity-[0.45]"
      />
    </div>
  );
}

export function ReleaseVisual({
  release,
  kind,
  sizes
}: {
  release: MusicRelease;
  kind: ReleaseKind;
  /** Se pasa desde `MusicCard`, que es quien sabe a qué tamaño se pinta. */
  sizes: string;
}) {
  /* CASO VIDEOCLIP — la miniatura manda y llena la pieza a sangre.
     El leve acercamiento al pasar el ratón es el único movimiento; se anula
     con `prefers-reduced-motion`. */
  if (kind === 'video') {
    return release.coverUrl ? (
      <Image
        src={release.coverUrl}
        alt=""
        aria-hidden="true"
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.035] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    ) : (
      <BrandFallback />
    );
  }

  /* CASO SINGLE — un OBJETO sobre una superficie, no un fotograma a sangre.
     Esa es la diferencia deliberada con el caso de arriba: un videoclip es una
     ventana y llena la pieza; un single es una cosa física —funda de cartón y
     disco— apoyada sobre un fondo. La distinción la marca el contenido, no un
     adorno.

     La funda es un cuadrado que no llega a los bordes de la caja, y el disco
     asoma por detrás de su canto derecho. El fondo lleva una brasa burdeos muy
     baja para que el negro del vinilo tenga contra qué recortarse: sobre negro
     puro el disco se leía como un agujero.

     Al interactuar, el disco sale un poco más y gira 18°. Lento y corto a
     propósito: un vinilo que gira rápido se lee como icono animado, y lo que se
     busca es que parezca que alguien lo está sacando de la funda. */
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 65% 70% at 62% 50%, rgba(122,32,38,0.30), rgba(0,0,0,0) 72%), linear-gradient(150deg, #15100f 0%, #0a0708 55%, #060405 100%)'
      }}
    >
      {/* El objeto, centrado y con aire alrededor. */}
      <div className="absolute inset-y-[11%] left-[9%] right-[9%]">
        <div className="relative h-full">
          {/* Disco: detrás de la funda, asomando por su canto derecho. */}
          <VinylDisc className="left-[34%] top-1/2 aspect-square h-[92%] -translate-y-1/2 transition-transform duration-[1100ms] ease-out group-hover:translate-x-[7%] group-hover:rotate-[18deg] motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-hover:rotate-0" />

          {/* Funda: cuadrada, por delante y con sombra de contacto propia. */}
          <div
            className="relative h-full aspect-square overflow-hidden"
            style={{ boxShadow: '0 12px 30px -12px rgba(0,0,0,0.95)' }}
          >
            {release.coverUrl ? (
              <Image
                src={release.coverUrl}
                alt=""
                aria-hidden="true"
                fill
                sizes={sizes}
                className="object-cover"
              />
            ) : (
              <BrandFallback />
            )}
            {/* Canto de la funda: filo de luz por donde sale el disco. Da el
                grosor del cartón sin dibujar una sombra falsa. */}
            <div
              aria-hidden="true"
              className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#D4AF37]/30 to-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
