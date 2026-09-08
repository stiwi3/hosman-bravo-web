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

   DOS COMPOSICIONES Y UNA POLÍTICA.

   La base es la COMPACTA: una rejilla de tres filas —reserva de cabecera, zona
   hero, pie— donde las bandas reservan su espacio de verdad. `abierta` es la
   excepción: la composición aprobada de escritorio, en la que las bandas salen
   del flujo y flotan sobre un vídeo que sangra a todo el alto. Ahí la cabecera
   no le cuesta nada al hero, y por eso es la única que puede permitirse el
   módulo completo de reproductor.

   LA LEY DEL VÍDEO, una sola línea y la misma en las dos:

       width: min(100cqw, 75cqh)   ·   aspect-ratio: 3 / 4

   `100cqw` es el límite por ancho disponible, `75cqh` el límite por alto
   disponible (75% porque la proporción es 3:4) y `min()` es «lo que quepa». Lo
   que cambia entre composiciones NO es la fórmula: es el TAMAÑO DE LA ZONA
   contra la que se mide.

   LA POLÍTICA — `fit` mientras quepa, crecer cuando no.

   La escena es `min-height: 100svh`, no `height`. Su fila central tiene un
   SUELO (`--hb-hero-min-h`). Si cabecera + suelo + pie entran en la pantalla,
   el `1fr` absorbe el sobrante y la escena mide exactamente una pantalla, sin
   scroll. Si no entran, la rejilla crece y el documento se desplaza — dentro
   de INICIO, porque debajo no hay nada. No hay ninguna condición que escribir:
   lo resuelve el algoritmo de rejilla.

   En `abierta` la zona hero está FUERA del flujo, así que el suelo de la fila
   no le llega. Ahí el suelo actúa por el otro eje: quien cede es el flanco.

   ⚠️ El canvas del humo NO sigue a la escena: va anclado a la primera pantalla
   (`height: 100svh`). Su tamaño depende solo del ancho de la ventana y de
   `svh`, así que ni el crecimiento de la escena ni abrir los eventos lo tocan.
   Cualquier cambio de tamaño del canvas llama a `simulation.resize()`, que
   destruye las texturas de densidad — o sea, la forma del humo.
--------------------------------------------------------------------------- */

/** El flanco real: el ideal, acotado por el suelo del hero.
 *  `cqw` se refiere a la escena, que es contenedor de tamaño en línea. */
const FLANCO =
  'min(var(--hb-flanco-ideal), max(0px, (100cqw - var(--hb-hero-min-w)) / 2))';

/** El marco del vídeo y la caja de alineación del rótulo comparten encuadre:
 *  las medidas en porcentaje del rótulo se refieren al vídeo, no al viewport,
 *  y por eso la alineación se mantiene sola sin offsets por breakpoint. */
const ENCUADRE: React.CSSProperties = {
  width: 'min(100cqw, 75cqh)',
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
    /* `min-h-svh` y no `h-`: ver «LA POLÍTICA» arriba. `svh` y no `dvh`: con
       `dvh` cada aparición de la barra del navegador redimensionaría la escena
       y, con ella, el canvas del humo.
       `container-type: inline-size` da a los hijos un `cqw` que es el ancho de
       la escena y no el del viewport — importante en cuanto hay barra de
       desplazamiento, que `100vw` sí incluye y `100cqw` no. */
    <section className="relative grid min-h-svh grid-rows-[auto_minmax(var(--hb-hero-min-h),1fr)_auto] [container-type:inline-size]">
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
          `--hb-header-real-h`. En `abierta` esta banda sale del flujo y deja de
          reservar: ahí la cabecera flota sobre el vídeo a propósito. */}
      <div
        aria-hidden="true"
        className="h-[var(--hb-header-real-h,var(--hb-header-h))] abierta:absolute abierta:inset-x-0 abierta:top-0"
      />

      {/* FILA 2 — LA ZONA HERO. Es la fuente de geometría del vídeo.
          `min-h-0`/`min-w-0` impiden que el contenido imponga un mínimo a la
          celda, que es lo que dejaría de darle un alto definido y rompería
          `container-type: size`. */}
      {/* En `abierta` los flancos son lo único que estrecha al hero, y ceden
          antes de dejarlo por debajo de su presencia mínima. En la compacta la
          zona ocupa el ancho entero y quien manda es el alto de la fila.
          El valor se calcula en una variable propia (`style`) y la variante
          solo decide si se aplica: así el `min()/max()` se lee de una vez en
          `FLANCO` en lugar de repartido en dos valores arbitrarios. */}
      <div
        className="relative min-h-0 min-w-0 [container-type:size] abierta:absolute abierta:inset-y-0 abierta:left-[var(--hb-flanco)] abierta:right-[var(--hb-flanco)]"
        style={{ '--hb-flanco': FLANCO } as React.CSSProperties}
      >
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
            Con los rails el vídeo no llega tan abajo y el rótulo se muda al
            pie: esta copia desaparece con `display:none`, que también la saca
            del árbol de accesibilidad. */}
        <div className={`pointer-events-none z-[6] ${CENTRADO} rails:hidden`} style={ENCUADRE}>
          <Branding className="absolute left-1/2 top-[83%] w-[54%] -translate-x-1/2" />
        </div>
      </div>

      {/* Velo que iguala el brillo del vídeo con el del fondo, para que
          el corte entre ambos no se lea por diferencia de luminosidad. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[100svh] bg-[linear-gradient(to_top,rgba(5,3,4,0.92)_0%,rgba(5,3,4,0.28)_26%,transparent_52%,transparent_74%,rgba(5,3,4,0.55)_100%)]"
      />

      {/* CAPA 3 — humo.
          ⚠️ ANCLADO A LA PRIMERA PANTALLA, no a la escena. Si siguiera a la
          escena, crecer la composición —o abrir los eventos, cuando el panel
          estaba en el flujo— redimensionaría el canvas, y cada redimensión
          reconstruye los búferes de densidad de la simulación. Con `100svh` su
          tamaño depende solo del ancho y de `svh`: cambia en un
          redimensionado o una rotación reales, y en nada más. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[100svh]">
        <InteractiveSmoke reducedMotion={reducedMotion} />
      </div>

      {/* FILA 3 — EL PIE.
          En `abierta` sale del flujo y sus dos módulos quedan flotando en las
          esquinas, exactamente donde estaban. En la compacta reserva su alto de
          verdad, y por eso el vídeo deja de quedar por debajo de ellos. */}
      <div className="relative z-20 flex items-end justify-between gap-3 px-[calc(var(--hb-hero-inset)*0.55)] pb-[var(--hb-hero-inset)] abierta:absolute abierta:inset-x-0 abierta:bottom-0">
        {/* PRÓXIMOS SHOWS — el bloque completo, con el aviso legal recogido
            justo debajo. Su panel desplegable va fuera de flujo (ver
            `UpcomingShows`), así que abrirlo no le quita alto al hero. */}
        <div className="flex flex-col items-center gap-2 rails:hidden">
          <UpcomingShows onContact={goToContact} />
          <p className="max-w-[12rem] text-center text-[7px] leading-tight tracking-wider text-gray-600">
            © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN,
            COLOMBIA
          </p>
        </div>

        {/* BRANDING + TIRADOR DE EVENTOS — cuando el pie ya no puede sostener
            los dos módulos de esquina. El rótulo sigue leyéndose como parte del
            hero (mismo fondo, el humo lo cruza) y debajo queda la invitación a
            deslizar. */}
        <div className="hidden min-w-0 flex-1 flex-col items-center gap-1 rails:flex">
          <Branding className="w-[62%] max-w-[16rem]" />
          <ShowsSheet onContact={goToContact} className="w-full max-w-[18rem]" />
        </div>

        {/* REDES SOCIALES. El CTA de contrataciones cuelga del icono de
            WhatsApp —el PRIMERO del grupo— como un bocadillo discreto en vez de
            competir por espacio como bloque propio.
            Con los rails el grupo se convierte en el RAIL IZQUIERDO, `fixed`
            para quedar a la misma altura que el de plataformas, que vive en la
            cabecera y no puede anclarse a esta zona sin duplicar su instancia.
            Va superpuesto al hero a propósito: si fuera una columna de layout
            le restaría ancho al caballo, que es justo lo que no se quiere. */}
        <div className="relative rails:fixed rails:left-[var(--hb-rail-inset)] rails:top-1/2 rails:z-40 rails:-translate-y-1/2">
          <SocialLinks />
          <button
            onClick={goToContact}
            // `rounded-lg` y no `rounded-full`: con la píldora completamente
            // redondeada el borde se curva justo donde hace falta apoyar la
            // colita, y esta queda desconectada del contorno.
            className="group absolute -top-9 left-0 flex items-center gap-1 rounded-lg border border-amber-400/25 bg-black/55 px-2.5 py-1.5 text-[8px] font-semibold tracking-widest text-amber-200/80 backdrop-blur-sm transition-colors duration-300 hover:border-amber-400/60 hover:text-amber-300 rails:left-0 rails:top-[calc(var(--hb-control-social)+0.35rem)] rails:max-w-[4.5rem] rails:whitespace-normal rails:px-1.5 rails:py-1 rails:text-center rails:text-[7px] rails:leading-tight"
          >
            CONTRATA TU SHOW
            {/* Colita apuntando al icono de WhatsApp. Se ancla por la IZQUIERDA
                porque WhatsApp es el primero del grupo. En el rail el bocadillo
                queda DEBAJO del icono, así que la colita se da la vuelta. */}
            <span
              aria-hidden="true"
              className="absolute -bottom-[4px] left-4 h-[8px] w-[8px] rotate-45 border-b border-r border-amber-400/25 bg-black/55 transition-colors duration-300 group-hover:border-amber-400/60 rails:-top-[4px] rails:bottom-auto rails:left-3 rails:border-t rails:border-l rails:border-b-0 rails:border-r-0 rails:border-t-amber-400/25 rails:border-l-amber-400/25"
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
