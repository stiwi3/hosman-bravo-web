import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';

/* ---------------------------------------------------------------------------
   RÓTULO «HOSMAN BRAVO» + BAJADA.

   Un solo emplazamiento: el llamante lo coloca dentro de una caja 3:4
   idéntica a la del ENCUADRE DEL VÍDEO, así que todas las medidas se expresan
   en fracción de ese encuadre, sin offsets por viewport. En abierta y
   compacta cuelga al 83% del alto del encuadre (sobre los pies del caballo);
   en `rails` el llamante lo ancla por abajo, al final de la zona del hero, y
   le da su propio ancho (ver `HeroScene`). (Antes, en móvil, había una
   segunda copia en la fila inferior de la escena; su posición la marcaba el
   borde de la escena y no el hero.)

   `container-type: inline-size` hace que la bajada se mida en fracción del
   ANCHO DEL RÓTULO y no en píxeles fijos: con `text-xs` fijo, en un encuadre
   estrecho la línea partía en dos y empujaba el texto fuera. El suelo de 9px
   impide que se vuelva ilegible.

   TOPE DE JERARQUÍA (`--hb-bajada-tope`): la bajada nunca debe competir en
   anchura con «HOSMAN BRAVO». Cuando el rótulo es tan estrecho que el suelo
   de 9px la haría más ancha que el título, el tope proporcional manda sobre
   el suelo y la bajada cede lo justo. Solo toca la tipografía: la caja del
   rótulo (la que mide el coordinador) no cambia.
     · compacta (por defecto): 4.65cqw ≈ 95% de la tinta del título (la
       bajada mide ~20,1 × su cuerpo y la tinta del PNG el 98,3% de su ancho).
       Empieza a actuar con el rótulo por debajo de ~193px, donde 4.65cqw = 9px:
       sin salto.
     · rails: 4cqw, lo declara `HeroScene`.
     · abierta: sin tope (su rótulo nunca baja de ~220px).
--------------------------------------------------------------------------- */
export function Branding({ className }: { className?: string }) {
  return (
    <div className={`[container-type:inline-size] abierta:[--hb-bajada-tope:9999px] ${className ?? ''}`}>
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
        style={{ fontSize: 'min(max(9px, 2.9cqw), var(--hb-bajada-tope, 4.65cqw))' }}
      >
        MÚSICA POPULAR · SHOWS EN VIVO
      </p>
    </div>
  );
}
