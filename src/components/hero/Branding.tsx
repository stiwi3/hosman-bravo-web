import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';

/* ---------------------------------------------------------------------------
   RÓTULO «HOSMAN BRAVO» + BAJADA.

   Un solo emplazamiento en todas las composiciones: cuelga del ENCUADRE DEL
   VÍDEO (al 83% de su alto), que es donde queda sobre los pies del caballo —
   por eso el llamante lo coloca dentro de una caja 3:4 idéntica a la del
   vídeo y todas las medidas se expresan en fracción de ese encuadre, sin
   offsets por viewport. (Antes, en móvil, había una segunda copia en la fila
   inferior de la escena; su posición la marcaba el borde de la escena y no
   el hero.)

   `container-type: inline-size` hace que la bajada se mida en fracción del
   ANCHO DEL RÓTULO y no en píxeles fijos: con `text-xs` fijo, en un encuadre
   estrecho la línea partía en dos y empujaba el texto fuera. El suelo de 9px
   impide que se vuelva ilegible.
--------------------------------------------------------------------------- */
export function Branding({ className }: { className?: string }) {
  return (
    <div className={`[container-type:inline-size] ${className ?? ''}`}>
      <Image
        src={hosmanData.images.heroLetters}
        alt=""
        aria-hidden="true"
        width={2172}
        height={724}
        priority
        sizes="(min-width: 768px) 47vh, 62vw"
        className="h-auto w-full"
      />
      {/* Margen negativo para descontar el borde transparente que el propio
          PNG lleva bajo el artwork (22,4% de su alto). */}
      <p
        className="-mt-[4%] whitespace-nowrap text-center tracking-widest text-gray-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
        style={{ fontSize: 'max(9px, 2.9cqw)' }}
      >
        MÚSICA POPULAR · SHOWS EN VIVO
      </p>
    </div>
  );
}
