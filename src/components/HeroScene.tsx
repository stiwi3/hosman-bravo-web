'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { InteractiveSmoke } from '@/components/hero/InteractiveSmoke';
import { SocialLinks } from '@/components/SocialLinks';
import { UpcomingShows } from '@/components/UpcomingShows';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hosmanData } from '@/data/hosman-data';

/* ---------------------------------------------------------------------------
   INICIO.

   ⚠️ Esta escena NO vive en la ruta `/`: la monta `SiteShell`, que es
   persistente, y se OCULTA con CSS cuando la ruta es otra. Si viviera en
   `src/app/page.tsx`, navegar a cualquier otra ruta la desmontaría y destruiría
   el contexto WebGL: la forma del humo ES el estado de sus texturas de
   densidad, así que al volver arrancaría vacía y tardaría 10-15 s en acumular
   humo visible. Ver ARCHITECTURE.md §3 y §6.
--------------------------------------------------------------------------- */
export function HeroScene() {
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const data = hosmanData;

  /* Los dos accesos a contratación de esta escena (el bocadillo del hero y la
     entrada promocional) siguen siendo `<button>` para no alterar su marcado ni
     el de los tickets; lo único que cambia es que ahora navegan a una ruta real
     en vez de mover un estado. */
  const goToContact = () => router.push('/contacto');

  return (
    <>
      {/* La portada ocupa exactamente la pantalla: para ver el resto hay
          que ir a otra sección, no desplazarse. */}
      <section className="relative h-[100svh] overflow-hidden flex items-center justify-center">
        {/* CAPA 1 — fondo de la escena: negro con brasa roja muy apagada.
            Es la continuación de los laterales del vídeo hacia los bordes. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#050304]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_46%_58%_at_50%_46%,rgba(104,27,32,0.42),transparent_72%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_78%_46%_at_50%_100%,rgba(82,20,25,0.34),transparent_70%)]"
        />

        {/* CAPA 2 — el vídeo, centrado y con su proporción intacta.
            El contenedor tiene exactamente el aspecto 3:4 del original, de
            modo que la altura manda en escritorio y la anchura en móvil, y
            el vídeo nunca se deforma ni se recorta.
            La máscara desvanece sus cuatro bordes: como los extremos de la
            toma ya son negro profundo, el rectángulo deja de percibirse. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative aspect-[3/4] w-full md:h-full md:w-auto"
            style={{
              maskImage:
                'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 9%, #000 26%, #000 74%, rgba(0,0,0,0.55) 91%, transparent 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 5%, #000 16%, #000 86%, rgba(0,0,0,0.5) 96%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 9%, #000 26%, #000 74%, rgba(0,0,0,0.55) 91%, transparent 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 5%, #000 16%, #000 86%, rgba(0,0,0,0.5) 96%, transparent 100%)',
              maskComposite: 'intersect',
              WebkitMaskComposite: 'source-in',
            }}
          >
            <video
              src={`${data.basePath}/videos/Hero.mp4`}
              poster={data.images.hero}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Hosman Bravo montado a caballo durante su espectáculo"
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* Velo que iguala el brillo del vídeo con el del fondo, para que
            el corte entre ambos no se lea por diferencia de luminosidad. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,3,4,0.92)_0%,rgba(5,3,4,0.28)_26%,transparent_52%,transparent_74%,rgba(5,3,4,0.55)_100%)]"
        />

        {/* CAPA 3 — humo, a lo ancho de todo el hero: cruza el límite entre
            el vídeo y el fondo, que es lo que termina de unirlos. */}
        <div className="pointer-events-none absolute inset-0 z-[5]">
          <InteractiveSmoke reducedMotion={reducedMotion} />
        </div>

        {/* CAPA 4 — rótulo, por delante del humo para que no se vele.
            Va dentro de una caja 3:4 idéntica a la del vídeo, de modo que
            las medidas en porcentaje se refieren siempre al encuadre y no
            al viewport: la alineación se mantiene sola en todos los
            tamaños, sin offsets por breakpoint.
            El PNG es una tira 3:1 cuyo contenido ocupa el 98,3% de su
            ancho y está centrado en el 44,4% de su alto; de ahí salen la
            anchura y el desplazamiento vertical de abajo. */}
        <div className="pointer-events-none absolute inset-0 z-[6] flex items-center justify-center">
          <div className="relative aspect-[3/4] w-full md:h-full md:w-auto">
            {/* El rótulo y su bajada van juntos en la misma caja, de modo
                que se desplazan solidariamente si hay que reajustar. */}
            {/* `container-type: inline-size` hace que la bajada se mida en
                fracción del ANCHO DEL RÓTULO, no en píxeles fijos. Con
                `text-xs` fijo, en 1280×591 el encuadre estrecha hasta
                239px y la línea partía en dos, lo que empujaba el texto 1px
                por debajo del hero. Escalando con el rótulo cabe siempre en
                una línea, y el suelo de 9px impide que se vuelva ilegible.
                A 2048×1023 devuelve los mismos 12px de antes. */}
            <div className="absolute left-1/2 top-[83%] w-[54%] -translate-x-1/2 [container-type:inline-size]">
              <Image
                src={data.images.heroLetters}
                alt=""
                aria-hidden="true"
                width={2172}
                height={724}
                priority
                sizes="(min-width: 768px) 47vh, 62vw"
                className="h-auto w-full"
              />
              {/* Margen negativo para descontar el borde transparente que
                  el propio PNG lleva bajo el artwork (22,4% de su alto). */}
              <p
                className="-mt-[4%] whitespace-nowrap text-center tracking-widest text-gray-300 drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]"
                style={{ fontSize: 'max(9px, 2.9cqw)' }}
              >
                MÚSICA POPULAR · SHOWS EN VIVO
              </p>
            </div>
          </div>
        </div>

        {/* El rótulo "HOSMAN BRAVO" ya viene en el propio vídeo, así que
            aquí solo queda el subtítulo. */}
        <h1 className="sr-only">Hosman Bravo — {data.artist.tagline}</h1>

        {/* REDES SOCIALES — esquina inferior derecha. El CTA de
            contrataciones cuelga del icono de WhatsApp (el PRIMERO de la
            fila, a la izquierda del grupo — ver el orden en
            `SocialLinks.tsx`) como un bocadillo discreto en vez de
            competir por espacio como bloque propio; sigue llevando a la
            misma sección de contacto que antes.
            Mismo token de margen seguro (`--hb-hero-inset`) que antes,
            solo cambiado de flanco. */}
        <div className="absolute bottom-[var(--hb-hero-inset)] right-[var(--hb-hero-inset)] z-20">
          <div className="relative">
            <SocialLinks />
            <button
              onClick={goToContact}
              // `rounded-lg` y no `rounded-full`: con la píldora
              // completamente redondeada el borde se curva justo donde
              // hace falta apoyar la colita, y esta queda desconectada
              // del contorno en vez de fundirse con él.
              className="group absolute -top-8 left-0 flex items-center gap-1 rounded-lg border border-amber-400/25 bg-black/55 px-2.5 py-1.5 text-[8px] font-semibold tracking-widest text-amber-200/80 backdrop-blur-sm transition-colors duration-300 hover:border-amber-400/60 hover:text-amber-300 sm:-top-9"
            >
              CONTRATA TU SHOW
              {/* Colita apuntando al icono de WhatsApp, justo debajo. Se
                  ancla por la IZQUIERDA porque WhatsApp pasó a ser el
                  primer icono de la fila; antes iba `right-4`, con
                  WhatsApp de último. */}
              <span
                aria-hidden="true"
                className="absolute -bottom-[4px] left-4 h-[8px] w-[8px] rotate-45 border-b border-r border-amber-400/25 bg-black/55 transition-colors duration-300 group-hover:border-amber-400/60"
              />
            </button>
          </div>
        </div>

        {/* BLOQUE PRÓXIMOS SHOWS, con el aviso legal recogido justo
            debajo. En móvil el bloque ocupa 92vw, así que ya no cabe al
            lado de las redes sociales: sube por encima de esa fila en vez
            de encogerse, que es lo que lo haría ilegible.
            Va anclado por abajo para que, al desplegarse, crezca hacia
            arriba y no empuje el aviso legal fuera de la pantalla.

            Esquina inferior IZQUIERDA a partir de ahora (intercambiado
            con las redes sociales). Mismo token de margen seguro que
            antes, solo cambiado de flanco: `sm:right-auto` es necesario
            para anular el `right-1/2` con el que se centra en móvil, que
            de lo contrario seguiría aplicándose a partir de `sm:`.

            Va a media sangría (`* 0.55`) y no al margen completo como las
            redes: el bloque centra la entrada dentro de un ancho que marca
            su título —más ancho que la propia entrada—, así que con el
            inset íntegro la pieza se veía despegada del borde comparada
            con el resto de la composición. Sigue derivándose del token, no
            es un valor suelto. */}
        <div className="absolute bottom-[104px] right-1/2 z-20 flex translate-x-1/2 flex-col items-center gap-2 sm:bottom-[var(--hb-hero-inset)] sm:right-auto sm:left-[calc(var(--hb-hero-inset)*0.55)] sm:translate-x-0">
          <UpcomingShows onContact={goToContact} />
          <p className="max-w-[12rem] text-center text-[7px] leading-tight tracking-wider text-gray-600">
            © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN,
            COLOMBIA
          </p>
        </div>
      </section>
    </>
  );
}
