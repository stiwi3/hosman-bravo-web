import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';

/* ---------------------------------------------------------------------------
   RÓTULO «HOSMAN BRAVO» + BAJADA.

   Una sola implementación con DOS emplazamientos, porque su ancla cambia con
   la composición:

     · en escritorio cuelga del ENCUADRE DEL VÍDEO (al 83% de su alto), que es
       donde queda justo bajo la figura de Hosman — por eso el llamante lo
       coloca dentro de una caja 3:4 idéntica a la del vídeo y todas las
       medidas se expresan en fracción de ese encuadre, sin offsets por
       viewport;
     · en móvil el vídeo no llega tan abajo y el rótulo pasa a la FILA INFERIOR
       de la escena, sobre el tirador de eventos, como en la referencia.

   Los dos emplazamientos se renderizan y el que no toca queda en
   `display:none`, que sí lo saca del árbol de accesibilidad — así que no hay
   contenido duplicado para un lector de pantalla. La bajada es la única parte
   con texto real y va marcada `aria-hidden` en la copia móvil desde el
   llamante si hiciera falta; hoy no hace falta porque solo una está visible.

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
