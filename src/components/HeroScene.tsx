'use client';

import { useRouter } from 'next/navigation';
import { InteractiveSmoke } from '@/components/hero/InteractiveSmoke';
import { Branding } from '@/components/hero/Branding';
import { ShowsSheet } from '@/components/hero/ShowsSheet';
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

   ===========================================================================
   LA GEOMETRÍA DE LA ESCENA
   ===========================================================================

   LA ESCENA OCUPA LA PANTALLA; EL VÍDEO SE ADAPTA A LA ESCENA. Antes era al
   revés: el marco del vídeo era `aspect-[3/4] w-full md:h-full md:w-auto`, o
   sea que a partir de `md` mandaba la ALTURA y el ancho salía de la
   proporción. En una ventana ancha eso da el encuadre aprobado, pero al
   estrecharla el vídeo seguía midiendo el 75% del alto: a 960×1080 ocupaba el
   84% del ancho y el bloque de Próximos Shows se le montaba encima 323px.

   Ahora hay UNA rejilla de tres filas —reserva de cabecera · zona hero · pie—
   y el vídeo se mide contra la zona hero, que declara `container-type: size`.
   De ahí sale la ley, una sola línea y la misma en todas las composiciones:

       width: min(100cqw, 75cqh)   ·   aspect-ratio: 3 / 4

   `100cqw` es el límite por ancho disponible, `75cqh` el límite por alto
   disponible (75% porque la proporción es 3:4) y `min()` es literalmente «lo
   que quepa». Lo que cambia entre composiciones NO es la fórmula: es el
   TAMAÑO DE LA ZONA contra la que se mide.

     · `escenario` (ventana apaisada y con alto suficiente) — las bandas de
       arriba y abajo salen del flujo y flotan sobre el vídeo, que recupera
       todo el alto de la escena y solo cede por los FLANCOS que reclaman los
       módulos de esquina. Es la composición aprobada: medido, devuelve los
       mismos píxeles que antes en 2560×1440, 1920×1080, 1536×864 y 1280×800.
     · resto — las bandas reservan su espacio de verdad y el vídeo se limita
       por lo que sobra. Deja de haber solapes.

   El canvas del humo NO entra en la rejilla: sigue siendo una capa
   `absolute inset-0` sobre toda la sección, con exactamente el mismo tamaño
   que antes. Cambiarlo redimensionaría la simulación y `simulation.resize()`
   destruye las texturas de densidad — que SON la forma del humo.
--------------------------------------------------------------------------- */

/** El marco del vídeo y la caja de alineación del rótulo comparten encuadre:
 *  las medidas en porcentaje del rótulo se refieren al vídeo, no al viewport,
 *  y por eso la alineación se mantiene sola sin offsets por breakpoint. */
const ENCUADRE: React.CSSProperties = {
  /* `max()` es el SUELO: si la zona se queda sin alto —una ventana de
     escritorio muy baja, donde cabecera y pie reservan casi todo—, el vídeo
     no sigue encogiendo hasta desaparecer. Se detiene en 13rem y prefiere
     asomar un poco por arriba y por abajo (sus bordes están difuminados, así
     que se lee como encuadre y no como recorte) antes que dejar la escena sin
     protagonista. El `min(100cqw, …)` interior mantiene el suelo por debajo
     del ancho disponible, de modo que nunca provoca desbordamiento lateral. */
  width: 'max(min(100cqw, 13rem), min(100cqw, 75cqh))',
  aspectRatio: '3 / 4'
};

/** La máscara desvanece los cuatro bordes del vídeo: como los extremos de la
 *  toma ya son negro profundo, el rectángulo deja de percibirse. */
const MASCARA: React.CSSProperties = {
  maskImage:
    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 9%, #000 26%, #000 74%, rgba(0,0,0,0.55) 91%, transparent 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 5%, #000 16%, #000 86%, rgba(0,0,0,0.5) 96%, transparent 100%)',
  WebkitMaskImage:
    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.55) 9%, #000 26%, #000 74%, rgba(0,0,0,0.55) 91%, transparent 100%), linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 5%, #000 16%, #000 86%, rgba(0,0,0,0.5) 96%, transparent 100%)',
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in'
};

/** Centrado absoluto dentro de la zona hero, para el marco y para el rótulo. */
const CENTRADO = 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2';

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
    /* `100svh` y no `dvh` ni `vh`: ver la nota de `globals.css`. En móvil
       apaisado —y SOLO ahí— la escena deja de estar encerrada en la pantalla y
       puede crecer, porque comprimirla dejaría a Hosman diminuto. */
    <section className="relative grid h-[100svh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden apaisado:h-auto apaisado:min-h-[100svh]">
      {/* CAPA 1 — fondo de la escena: negro con brasa roja muy apagada.
          Es la continuación de los laterales del vídeo hacia los bordes. */}
      <div aria-hidden="true" className="absolute inset-0 bg-[#050304]" />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_46%_58%_at_50%_46%,rgba(104,27,32,0.42),transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_78%_46%_at_50%_100%,rgba(82,20,25,0.34),transparent_70%)]"
      />

      {/* FILA 1 — RESERVA DE LA CABECERA.
          La cabecera de verdad vive en `SiteShell`: es `fixed` y la comparten
          todas las rutas, así que no puede entrar en esta rejilla. Lo que entra
          es su ALTO, medido por el `ResizeObserver` que ya publicaba
          `--hb-header-real-h`. En `escenario` esta banda sale del flujo y deja
          de reservar: ahí la cabecera flota sobre el vídeo a propósito. */}
      <div
        aria-hidden="true"
        className="h-[var(--hb-header-real-h,var(--hb-header-h))] escenario:absolute escenario:inset-x-0 escenario:top-0"
      />

      {/* FILA 2 — LA ZONA HERO. Es la fuente de geometría del vídeo.
          `min-h-0`/`min-w-0` impiden que el contenido imponga un mínimo a la
          celda de la rejilla, que es lo que dejaría de darle un alto definido
          y rompería `container-type: size`. */}
      <div className="relative min-h-0 min-w-0 [container-type:size] escenario:absolute escenario:inset-y-0 escenario:left-[var(--hb-flanco)] escenario:right-[var(--hb-flanco)] apaisado:h-[var(--hb-hero-apaisado-h)]">
        {/* CAPA 2 — el vídeo, centrado y con su proporción intacta. */}
        <div className={CENTRADO} style={{ ...ENCUADRE, ...MASCARA }}>
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

        {/* CAPA 4 — rótulo, por delante del humo para que no se vele.
            Va dentro de una caja idéntica a la del vídeo, de modo que las
            medidas en porcentaje se refieren siempre al encuadre.
            El PNG es una tira 3:1 cuyo contenido ocupa el 98,3% de su ancho y
            está centrado en el 44,4% de su alto; de ahí salen la anchura y el
            desplazamiento vertical.
            En móvil el vídeo no llega tan abajo y el rótulo se muda al pie:
            esta copia desaparece con `display:none`, que también la saca del
            árbol de accesibilidad. */}
        <div
          className={`pointer-events-none z-[6] ${CENTRADO} movil:hidden`}
          style={ENCUADRE}
        >
          <Branding className="absolute left-1/2 top-[83%] w-[54%] -translate-x-1/2" />
        </div>
      </div>

      {/* Velo que iguala el brillo del vídeo con el del fondo, para que
          el corte entre ambos no se lea por diferencia de luminosidad. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,3,4,0.92)_0%,rgba(5,3,4,0.28)_26%,transparent_52%,transparent_74%,rgba(5,3,4,0.55)_100%)]"
      />

      {/* CAPA 3 — humo, a lo ancho de toda la escena: cruza el límite entre el
          vídeo y el fondo, que es lo que termina de unirlos.
          ⚠️ NO meter esto en una celda de la rejilla: cambiaría el tamaño del
          canvas y con él la resolución de la simulación. */}
      <div className="pointer-events-none absolute inset-0 z-[5]">
        <InteractiveSmoke reducedMotion={reducedMotion} />
      </div>

      {/* FILA 3 — EL PIE.
          En `escenario` sale del flujo y sus dos módulos quedan flotando en las
          esquinas, exactamente donde estaban. En el resto reserva su alto de
          verdad, y por eso el vídeo deja de quedar por debajo de ellos. */}
      <div className="relative z-20 flex items-end justify-between gap-3 px-[calc(var(--hb-hero-inset)*0.55)] pb-[var(--hb-hero-inset)] escenario:absolute escenario:inset-x-0 escenario:bottom-0">
        {/* PRÓXIMOS SHOWS — el bloque completo, con el aviso legal recogido
            justo debajo. En móvil lo sustituye la hoja inferior. */}
        <div className="flex flex-col items-center gap-2 movil:hidden">
          <UpcomingShows onContact={goToContact} />
          <p className="max-w-[12rem] text-center text-[7px] leading-tight tracking-wider text-gray-600">
            © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN,
            COLOMBIA
          </p>
        </div>

        {/* BRANDING + TIRADOR DE EVENTOS — solo en móvil. Ocupan el centro del
            pie: el rótulo sigue leyéndose como parte del hero (mismo fondo, el
            humo lo cruza) y debajo queda la invitación a deslizar. */}
        <div className="hidden min-w-0 flex-1 flex-col items-center gap-1 movil:flex">
          <Branding className="w-[62%] max-w-[16rem]" />
          <ShowsSheet onContact={goToContact} className="w-full max-w-[18rem]" />
        </div>

        {/* REDES SOCIALES. El CTA de contrataciones cuelga del icono de
            WhatsApp —el PRIMERO del grupo— como un bocadillo discreto en vez de
            competir por espacio como bloque propio.
            En móvil el grupo se convierte en el RAIL IZQUIERDO: `fixed` y no
            `absolute` para que se ancle al viewport igual que el rail de
            plataformas, y los dos queden a la misma altura. Va superpuesto al
            hero a propósito — si fuera una columna de layout le restaría ancho
            al caballo, que es justo lo que no se quiere. */}
        <div className="relative movil:fixed movil:left-[var(--hb-rail-inset)] movil:top-1/2 movil:z-40 movil:-translate-y-1/2">
          <SocialLinks />
          <button
            onClick={goToContact}
            // `rounded-lg` y no `rounded-full`: con la píldora completamente
            // redondeada el borde se curva justo donde hace falta apoyar la
            // colita, y esta queda desconectada del contorno.
            className="group absolute -top-8 left-0 flex items-center gap-1 rounded-lg border border-amber-400/25 bg-black/55 px-2.5 py-1.5 text-[8px] font-semibold tracking-widest text-amber-200/80 backdrop-blur-sm transition-colors duration-300 hover:border-amber-400/60 hover:text-amber-300 sm:-top-9 movil:top-[calc(var(--hb-control-social)+0.35rem)] movil:left-0 movil:max-w-[4.5rem] movil:whitespace-normal movil:px-1.5 movil:py-1 movil:text-center movil:text-[7px] movil:leading-tight"
          >
            CONTRATA TU SHOW
            {/* Colita apuntando al icono de WhatsApp. Se ancla por la IZQUIERDA
                porque WhatsApp es el primero del grupo. En el rail el bocadillo
                queda DEBAJO del icono, así que la colita se da la vuelta. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-[4px] left-4 h-[8px] w-[8px] rotate-45 border-b border-r border-amber-400/25 bg-black/55 transition-colors duration-300 group-hover:border-amber-400/60 movil:bottom-auto movil:-top-[4px] movil:left-3 movil:border-b-0 movil:border-r-0 movil:border-l movil:border-t movil:border-l-amber-400/25 movil:border-t-amber-400/25"
            />
          </button>
        </div>
      </div>

      {/* El rótulo "HOSMAN BRAVO" ya viene en el propio vídeo, así que aquí
          solo queda el subtítulo. */}
      <h1 className="sr-only">Hosman Bravo — {data.artist.tagline}</h1>
    </section>
  );
}
