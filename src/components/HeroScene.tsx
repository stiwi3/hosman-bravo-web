'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { useGeometriaPeriferica } from '@/components/hero/useGeometriaPeriferica';
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

  const escenaRef = useRef<HTMLElement>(null);
  const geo = useGeometriaPeriferica(escenaRef);
  const minimoBajoRotulo = geo.posicion === 'bajoRotulo';
  const minimoLateral = geo.posicion === 'lateral' && geo.presentacion === 'minima';
  const ticketLateral = geo.posicion === 'lateral' && geo.presentacion !== 'minima';
  const estiloPanel =
    geo.anchoPanel && geo.altoPanel
      ? ({
          '--hb-ticket-w': `${geo.anchoPanel}px`,
          '--hb-shows-panel-max': `${geo.altoPanel}px`,
          '--hb-shows-panel-baja': `${geo.bajaPanel}px`
        } as React.CSSProperties)
      : undefined;

  return (
    /* `min-h-svh` y no `h-`: ver «LA POLÍTICA» arriba. `svh` y no `dvh`: con
       `dvh` cada aparición de la barra del navegador redimensionaría la escena
       y, con ella, el canvas del humo.
       `container-type: inline-size` da a los hijos un `cqw` que es el ancho de
       la escena y no el del viewport — importante en cuanto hay barra de
       desplazamiento, que `100vw` sí incluye y `100cqw` no. */
    /* La fila del hero es `minmax(--hb-hero-suelo, 1fr)`: ver ese token. El
       `1fr` ya es `100svh − cabecera − pie`, así que el hero cede solo lo que
       haga falta para que el pie quepa en la primera pantalla, y la escena
       crece únicamente si ni el suelo cabe. */
    <section
      ref={escenaRef}
      data-hb-capa-rails=""
      // `--hb-escena-min`: lo que piden las COLUMNAS laterales en su mínimo
      // (menú → redes → Shows; reproductor → plataformas → logo), publicado por
      // el coordinador. Solo supera `100svh` cuando ni así caben.
      className="relative grid min-h-[max(100svh,var(--hb-escena-min,0px))] grid-rows-[auto_minmax(var(--hb-hero-suelo),1fr)_auto] [container-type:inline-size]"
    >
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
        data-hb-geo="zona"
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
        <div data-hb-geo="rotulo" className={`pointer-events-none z-[6] ${CENTRADO} rails:hidden`} style={ENCUADRE}>
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
          En `abierta` sale del flujo y sus módulos quedan flotando en las
          esquinas, exactamente donde estaban.

          En la compacta la fila solo reserva alto cuando Shows va BAJO EL
          RÓTULO (título + «ver más fechas» + aviso legal). En lateral, Shows y
          el logo comparten franja con el hero en sus esquinas y la fila se
          queda en el margen inferior: al contraerse, Shows libera de verdad el
          espacio. Todo lo que no es esa reserva es overlay. Quién decide:
          el coordinador (`useGeometriaPeriferica`). */}
      <div
        data-hb-geo="pie"
        className="relative z-20 flex items-end justify-center gap-3 px-[calc(var(--hb-hero-inset)*0.55)] pb-[var(--hb-hero-inset)] abierta:absolute abierta:inset-x-0 abierta:bottom-0"
      >
        {/* Próximos Shows tiene DOS EJES independientes (`useGeometriaPeriferica`):
            · presentación — completa · reducida · mínima (por ancho o por alto);
            · posición — lateral · bajo el rótulo (SOLO por ancho).
            Hay tres cajas, siempre montadas, y se ve la que toca; las otras
            quedan `invisible` (conservan su caja, que es lo que se mide) e
            `inert`. */}

        {/* MÍNIMO BAJO EL RÓTULO — centrado bajo «MÚSICA POPULAR · SHOWS EN
            VIVO». Es además la RESERVA del pie: en flujo siempre, visible o no. */}
        <div
          data-hb-geo="shows-minimo"
          inert={!minimoBajoRotulo}
          aria-hidden={!minimoBajoRotulo}
          // Ancho de las entradas y tope de alto del panel, locales al bloque
          // activo: el panel se ajusta al hueco real entre cabecera y bloque.
          style={minimoBajoRotulo ? estiloPanel : undefined}
          // En lateral sale del flujo: Shows y el logo comparten franja con el
          // hero y el pie deja de reservar alto. Sigue montado para medirse.
          className={`flex flex-col items-center gap-1.5 rails:hidden ${
            minimoBajoRotulo ? '' : 'invisible absolute bottom-[var(--hb-hero-inset)] left-1/2 -translate-x-1/2'
          }`}
        >
          <UpcomingShows variante="minima" onContact={goToContact} />
          <p className="whitespace-nowrap text-center text-[7px] leading-tight tracking-wider text-gray-600">
            © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN, COLOMBIA
          </p>
        </div>

        {/* TICKET LATERAL — completo o reducido, anclado a la esquina inferior
            izquierda y fuera de flujo. Su ancho (`--hb-ticket-w` local) lo
            reduce el coordinador; el ticket escala entero con él. */}
        <div
          data-hb-geo="shows-lateral"
          inert={!ticketLateral}
          aria-hidden={!ticketLateral}
          style={geo.anchoLateral ? ({ '--hb-ticket-w': `${geo.anchoLateral}px` } as React.CSSProperties) : undefined}
          className={`absolute bottom-[var(--hb-hero-inset)] left-[calc(var(--hb-hero-inset)*0.55)] flex flex-col items-center gap-2 rails:hidden ${ticketLateral ? '' : 'invisible'}`}
        >
          <UpcomingShows onContact={goToContact} />
          <p className="max-w-[12rem] text-center text-[7px] leading-tight tracking-wider text-gray-600">
            © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN,
            COLOMBIA
          </p>
        </div>

        {/* MÍNIMO LATERAL — cuando lo que falta es ALTO pero el ancho junto al
            rótulo sigue sobrando: título + «ver más fechas» en la misma
            esquina, bajo las redes, sin cambiar de sitio. */}
        <div
          data-hb-geo="shows-lateral-minimo"
          inert={!minimoLateral}
          aria-hidden={!minimoLateral}
          style={minimoLateral ? estiloPanel : undefined}
          className={`absolute bottom-[var(--hb-hero-inset)] left-[calc(var(--hb-hero-inset)*0.55)] flex flex-col items-center gap-1.5 rails:hidden ${minimoLateral ? '' : 'invisible'}`}
        >
          <UpcomingShows variante="minima" panelAlLado={geo.panelAlLado} onContact={goToContact} />
          <p className="max-w-[12rem] text-center text-[7px] leading-tight tracking-wider text-gray-600">
            © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN,
            COLOMBIA
          </p>
        </div>

        {/* BRANDING + TIRADOR DE EVENTOS — cuando el pie ya no puede sostener
            los dos módulos de esquina. El rótulo sigue leyéndose como parte del
            hero (mismo fondo, el humo lo cruza) y debajo queda la invitación a
            deslizar. */}
        <div data-hb-geo="pie-rails" className="hidden min-w-0 flex-1 flex-col items-center gap-1 rails:flex">
          <Branding className="w-[62%] max-w-[16rem]" />
          {/* El tope descuenta el isotipo a ambos lados (el tirador va centrado):
              sin él, a 360px de ancho su área táctil llegaba 5px por debajo del
              isotipo. El texto visible no cambia —mide ~214px y sigue en una
              línea—; solo se acorta la caja pulsable. */}
          <ShowsSheet
            onContact={goToContact}
            className="w-full max-w-[min(18rem,calc(100%-2*(var(--hb-isotipo-real,var(--hb-isotipo))+0.5rem)))]"
          />
        </div>

        {/* ISOTIPO — firma discreta abajo a la derecha, donde antes estaban las
            redes. Va FUERA DE FLUJO a propósito: si ocupara sitio en la fila del
            pie, desplazaría el branding centrado de la composición con rails.
            Decorativo (`alt=""`): el nombre del artista ya está en la escena. */}
        <Image
          src={data.images.logo.isotipoDorado}
          alt=""
          aria-hidden="true"
          width={613}
          height={647}
          sizes="3.25rem"
          className="pointer-events-none absolute bottom-[var(--hb-hero-inset)] right-[calc(var(--hb-hero-inset)*0.55)] h-auto w-[var(--hb-isotipo-real,var(--hb-isotipo))] opacity-90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]"
        />
      </div>

      {/* RAIL IZQUIERDO — REDES SOCIALES, vertical en todas las composiciones.
          El CTA de contrataciones cuelga del icono de WhatsApp —el PRIMERO del
          grupo— como un bocadillo discreto.

          Dos capas, igual que el rail de plataformas:
          · la BANDA, fija, transparente y sin eventos, ocupa la franja libre de
            este lateral —bajo el menú, sobre el bloque de shows— y centra el
            rail con `justify-content: safe center` (el `safe` evita que, si no
            cupiera, se suba bajo el menú);
          · el GRUPO, con eventos, es el que se pulsa.
          Va superpuesto al hero: no reserva columna, así que no le quita ancho
          al caballo.

          `z-[15]` y no `z-40`: POR ENCIMA del vídeo, el humo (5) y el rótulo
          (6), pero POR DEBAJO del pie (20). Al desplegar Próximos Shows el panel
          crece hacia arriba por este mismo lateral y a 1180×900 llegaba 11px
          bajo el rail; con el rail encima, los iconos tapaban la entrada. Un
          panel abierto es transitorio y debe quedar delante, igual que el menú
          de cuero cuando se despliega. Con el panel cerrado no se tocan. */}
      {/* BANDA: en `abierta`, los tokens de siempre. En compacta y móvil, los
          límites reales del coordinador —bajo el menú de cuero, sobre lo que
          ocupe Próximos Shows—. Es contenedor de tamaño: el GRUPO lee su alto
          (`cqh`) y reparte cuatro botones, tres huecos y el hueco del
          bocadillo; si no caben a su tamaño normal, encogen juntos hasta
          `--hb-control-min`. Sin desplegable y sin scroll: las cuatro redes
          están siempre. El ancho es el del bocadillo, que cuelga del grupo. */}
      <div className="pointer-events-none absolute left-[var(--hb-rail-inset)] top-[var(--hb-lim-sup-izq,var(--hb-rail-izq-arriba))] h-[max(0px,calc(var(--hb-lim-inf-izq,100svh)-var(--hb-lim-sup-izq,var(--hb-rail-izq-arriba))))] z-[15] flex w-[4.5rem] flex-col items-start [container-type:size] [justify-content:safe_center] abierta:top-[var(--hb-rail-izq-arriba)] abierta:bottom-[var(--hb-rail-izq-abajo)] abierta:h-auto">
        <div className="pointer-events-auto relative [--hb-social-hueco:min(var(--hb-social-gap),2cqh)] [--hb-social-btn:max(var(--hb-control-min),min(var(--hb-control-social),calc((100cqh-var(--hb-social-cta)-3*var(--hb-social-hueco))/4)))]">
          <SocialLinks />
          <button
            onClick={goToContact}
            // `rounded-lg` y no `rounded-full`: con la píldora completamente
            // redondeada el borde se curva justo donde hace falta apoyar la
            // colita, y esta queda desconectada del contorno.
            className="group absolute left-0 top-[calc(var(--hb-social-btn)+0.35rem)] flex max-w-[4.5rem] items-center gap-1 whitespace-normal rounded-lg border border-amber-400/25 bg-black/55 px-1.5 py-1 text-center text-[7px] font-semibold leading-tight tracking-widest text-amber-200/80 backdrop-blur-sm transition-colors duration-300 hover:border-amber-400/60 hover:text-amber-300"
          >
            CONTRATA TU SHOW
            {/* Colita apuntando al icono de WhatsApp, que queda justo encima. */}
            <span
              aria-hidden="true"
              className="absolute -top-[4px] left-3 h-[8px] w-[8px] rotate-45 border-l border-t border-amber-400/25 bg-black/55 transition-colors duration-300 group-hover:border-amber-400/60"
            />
          </button>
        </div>
      </div>

      {/* REGLAS del coordinador: cajas invisibles con la medida exacta de un
          token, para leer en píxeles lo que CSS ya sabe calcular (ancho natural
          del ticket, alto natural del rail de redes, borde de seguridad y
          separación con el rótulo). Pequeñas y dentro de la escena. */}
      <div aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0">
        <div data-hb-geo="regla-ticket" className="h-px w-[var(--hb-ticket-w)]" />
        <div data-hb-geo="regla-redes" className="h-[calc(4*var(--hb-control-social)+3*var(--hb-social-gap)+var(--hb-social-cta))] w-px" />
        <div data-hb-geo="regla-borde" className="h-[var(--hb-rail-borde)] w-px" />
        <div data-hb-geo="regla-separacion" className="h-px w-[var(--hb-shows-separacion)]" />
        <div data-hb-geo="regla-control-min" className="h-[var(--hb-control-min)] w-px" />
        <div data-hb-geo="regla-social-cta" className="h-[var(--hb-social-cta)] w-px" />
        <div data-hb-geo="regla-logo" className="h-[var(--hb-isotipo)] w-px" />
        <div data-hb-geo="regla-logo-min" className="h-[var(--hb-isotipo-min)] w-px" />
        <div data-hb-geo="regla-hero-suelo" className="h-[var(--hb-hero-suelo)] w-px" />
      </div>

      {/* El rótulo "HOSMAN BRAVO" ya viene en el propio vídeo, así que aquí
          solo queda el subtítulo. */}
      <h1 className="sr-only">Hosman Bravo — {data.artist.tagline}</h1>
    </section>
  );
}
