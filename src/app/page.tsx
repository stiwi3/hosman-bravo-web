'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { InteractiveSmoke } from '@/components/hero/InteractiveSmoke';
import { MusicPlatforms } from '@/components/MusicPlatforms';
import { SocialLinks } from '@/components/SocialLinks';
import { TrackPlayer } from '@/components/audio/TrackPlayer';
import { LeatherMenu } from '@/components/LeatherMenu';
import { LeatherMenuPhoto } from '@/components/LeatherMenuPhoto';
import { UpcomingShows } from '@/components/UpcomingShows';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { hosmanData } from '@/data/hosman-data';

// Prueba visual: menú de cuero construido sobre fotografías del objeto ya
// terminado (`LeatherMenuPhoto`) en vez del anterior, hecho enteramente en
// CSS/SVG (`LeatherMenu`). Para volver a la versión anterior basta con poner
// esto en `false` — el componente CSS sigue intacto y montado en el árbol de
// componentes, sin usarse.
const USE_PHOTO_MENU = true;

/* ---------------------------------------------------------------------------
   Envoltorio común de las escenas con scroll.

   Antes cada sección declaraba por su cuenta `pt-32 pb-16 px-6` y su propio
   `max-w-*`, así que las cinco tomaban la misma decisión cinco veces y ninguna
   reaccionaba al alto disponible: los 128px de `pt-32` se comían el 22% de la
   pantalla en 1280×591 y, en 2048×1023, se quedaban un píxel por debajo de la
   cabecera real (129px) — de ahí el roce del menú con el contenido.

   Ahora el espacio superior se DERIVA de la altura real de la cabecera
   (`--spacing-scene-top`, ver `globals.css`), de modo que cabecera y contenido
   no pueden descuadrarse: si cambia el menú, el hueco se ajusta solo.

   Las secciones que faltan (PLAYLIST, EL SHOW, GALERÍA, CONTACTO) deben
   construirse sobre estas dos constantes en vez de volver a elegir medidas.
--------------------------------------------------------------------------- */
/** Espaciado de escena: salva la cabecera fija y da el aire lateral e
 *  inferior. Es lo que necesita CUALQUIER sección con scroll. */
const SCENE = 'relative pt-scene-top pb-scene-bottom px-scene-x';

/** Igual, pero ocupando al menos la pantalla completa. Lo usan las secciones
 *  que son la única de su página; EL SHOW no, porque lleva otra debajo y con
 *  `min-h-screen` empujaría la segunda fuera de la vista. */
const SCENE_FULL = `${SCENE} min-h-screen`;

/** Caja de contenido centrada, con el tope de ancho compartido. */
const SCENE_CONTENT = 'mx-auto w-full max-w-content';

type PageType = 'home' | 'show' | 'playlist' | 'galeria' | 'about' | 'contact';

const navItems: { id: PageType; label: string }[] = [
  { id: 'home', label: 'INICIO' },
  { id: 'show', label: 'EL SHOW' },
  { id: 'playlist', label: 'PLAYLIST' },
  { id: 'galeria', label: 'GALERÍA' },
  { id: 'about', label: 'SOBRE MÍ' },
  { id: 'contact', label: 'CONTACTO' }
];

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');
  const reducedMotion = useReducedMotion();
  const headerRef = useRef<HTMLElement>(null);

  const data = hosmanData;

  /* La cabecera no es simétrica: a la izquierda va el menú (bajo), a la
     derecha el módulo reproductor+plataformas (más alto, y de altura
     distinta según la página — en INICIO `MusicPlatforms` va sin recoger).
     `--spacing-scene-top` (el hueco que las secciones con scroll reservan
     para no arrancar debajo de la cabecera) necesitaba conocer cuál de los
     dos lados manda, y calcularlo a mano solo a partir del menú (como hacía
     `--hb-header-h`) se quedaba corto: el contenido de SOBRE MÍ, que ocupa
     todo el ancho de su columna, podía empezar bajo el reproductor.

     En vez de modelar en CSS la suma de fuentes/paddings/gaps del módulo
     derecho (frágil: cualquier cambio ahí desincroniza el cálculo), se mide
     la cabecera de verdad con `ResizeObserver` y el resultado se publica
     como variable CSS. Es la única forma de que la reserva conozca la
     geometría REAL sin adivinarla ni repetirla — y de paso se ajusta sola
     por página, porque en las demás secciones `MusicPlatforms` sí se recoge
     y la cabecera es más baja. */
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty('--hb-header-real-h', `${header.getBoundingClientRect().height}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return (
    <main className="bg-black text-white font-sans overflow-x-hidden min-h-screen">
      {/* HEADER FIJO
          Su padding sale del sistema fluido: es el mismo valor del que se
          deriva `--hb-header-h`, que a su vez marca dónde puede empezar el
          contenido de cualquier sección con scroll. Una sola fuente de verdad
          en lugar de un `p-4 md:p-6` aquí y un `pt-32` a mano en cada sección.
          `ref`: es el elemento que mide el `ResizeObserver` de arriba. */}
      <header
        ref={headerRef}
        className="fixed top-0 left-0 right-0 flex justify-between items-start p-[var(--hb-header-pad)] z-50 bg-gradient-to-b from-black/80 to-transparent"
      >
        {USE_PHOTO_MENU ? (
          <LeatherMenuPhoto items={navItems} current={currentPage} onNavigate={setCurrentPage} />
        ) : (
          <LeatherMenu items={navItems} current={currentPage} onNavigate={setCurrentPage} />
        )}

        {/* NAVEGACIÓN CENTRAL
            Se alinea con el padding de la cabecera en vez de con un `top-8`
            fijo, de modo que sube junto al resto cuando la cabecera encoge. */}
        <nav className="absolute left-1/2 -translate-x-1/2 top-[calc(var(--hb-header-pad)+0.5rem)] text-nav tracking-widest space-x-3 md:space-x-5">
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`hover:text-amber-400 transition ${currentPage === id ? 'text-amber-400' : ''}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* MUSICBLOCK — reproductor + plataformas.
            Se leen como una sola pieza, así que se mueven como una: un único
            `gap` (`--hb-music-gap`) los separa, en vez de que cada uno cargue
            su propia curva de escalado y el hueco entre ambos crezca o
            encoja por su cuenta sin relación con el resto del módulo (eso
            producía, según el viewport, o demasiado aire entre los dos o las
            plataformas empujadas hacia abajo). En pantallas estrechas se
            despega de la cabecera y baja a una rejilla de 4×2, para no
            cruzarse con la navegación central — sigue siendo el mismo bloque,
            solo cambia su posición de anclaje. */}
        <div className="absolute right-4 top-[74px] flex flex-col items-end gap-[var(--hb-music-gap)] md:static md:right-auto md:top-auto">
          {/* El reproductor manda sobre el audio global; debajo quedan los
              accesos a las plataformas. */}
          <div className="hidden sm:block">
            <TrackPlayer />
          </div>
          {/* La `key` remonta el bloque al cambiar de sección, de modo que
              siempre aparece recogido al navegar. */}
          <MusicPlatforms key={currentPage} collapsible={currentPage !== 'home'} />
        </div>
      </header>

      {/* PORTADA
          Se mantiene montada siempre y solo se oculta: así el contexto WebGL y
          las texturas de densidad del humo sobreviven al cambiar de sección. Si
          se desmontara, la simulación arrancaría vacía al volver y tardaría más
          de diez segundos en acumular humo visible. El IntersectionObserver del
          propio componente detiene el bucle mientras está oculto. */}
      <div className={currentPage === 'home' ? 'contents' : 'hidden'}>
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
                  onClick={() => setCurrentPage('contact')}
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
                de lo contrario seguiría aplicándose a partir de `sm:`. */}
            <div className="absolute bottom-[104px] right-1/2 z-20 flex translate-x-1/2 flex-col items-center gap-2 sm:bottom-[var(--hb-hero-inset)] sm:right-auto sm:left-[var(--hb-hero-inset)] sm:translate-x-0">
              <UpcomingShows onContact={() => setCurrentPage('contact')} />
              <p className="max-w-[12rem] text-center text-[7px] leading-tight tracking-wider text-gray-600">
                © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN,
                COLOMBIA
              </p>
            </div>
          </section>
        </>
      </div>

      {/* PLAYLIST — estructura preparada; la biblioteca llegará después. */}
      {currentPage === 'playlist' && (
        <section className={SCENE_FULL}>
          <div className={`${SCENE_CONTENT} max-w-4xl text-center`}>
            <h2 className="text-section tracking-wide mb-3">
              LA <span className="text-amber-400">PLAYLIST</span>
            </h2>
            <p className="mx-auto max-w-xl text-sm text-gray-400">
              La música de Hosman Bravo, reunida en un solo sitio.
            </p>

            <div className="mt-14 rounded-lg border border-dashed border-amber-400/25 bg-black/40 px-6 py-16">
              <p className="text-[11px] font-semibold tracking-[0.24em] text-amber-400/80">
                PRÓXIMAMENTE
              </p>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-500">
                Aquí estarán todas las canciones, con enlace a cada plataforma.
                Mientras tanto puedes escucharlas desde los accesos de la cabecera.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* EL SHOW */}
      {currentPage === 'show' && (
        <>
          <section className={`${SCENE} ${SCENE_CONTENT}`}>
            <h2 className="text-section tracking-wide mb-3 text-center">
              EL <span className="text-red-600">SHOW</span>
            </h2>
            <p className="text-sm text-gray-400 text-center max-w-2xl mx-auto mb-12">
              Música en vivo y caballos de alta escuela en un mismo escenario.
              Un espectáculo único en Colombia que tu público nunca olvidará.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {data.images.shows.map((src, i) => (
                <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-lg group">
                  <Image
                    src={src}
                    alt={`Show de Hosman Bravo ${i + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <button
                onClick={() => setCurrentPage('galeria')}
                className="border border-amber-400 text-amber-400 px-8 py-3 text-xs font-black tracking-widest hover:bg-amber-400 hover:text-black transition"
              >
                VER GALERÍA COMPLETA
              </button>
            </div>
          </section>

          {/* SECCIÓN CABALLOS
              No lleva `pt-scene-top`: no arranca bajo la cabecera fija, sino
              a continuación de la sección anterior. */}
          <section className="py-block px-scene-x bg-gradient-to-b from-black via-red-950/20 to-black">
            <div className={SCENE_CONTENT}>
              <h2 className="text-section tracking-wide mb-block text-center">
                EL <span className="text-amber-400">ELENCO</span> ECUESTRE
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {data.horses.map((horse) => (
                  <div
                    key={horse.name}
                    className="border border-white/10 rounded-lg p-8 text-center hover:border-amber-400/50 transition bg-black/40"
                  >
                    <h3 className="text-2xl font-black text-amber-400 mb-2">{horse.name}</h3>
                    <p className="text-xs tracking-widest text-gray-500 mb-4">{horse.description.toUpperCase()}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{horse.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* GALERÍA PAGE */}
      {currentPage === 'galeria' && (
        <section className={SCENE_FULL}>
          <div className={SCENE_CONTENT}>
            <h2 className="text-section mb-3 tracking-wide">
              GALERÍA
            </h2>
            <p className="text-sm text-gray-400 mb-10">
              El show, los caballos y la música de Hosman Bravo.
            </p>
            <div className="columns-2 md:columns-3 gap-3 space-y-3">
              {[...data.images.shows, ...data.images.galeria].map((src, i) => (
                <div key={src} className="relative overflow-hidden rounded-lg break-inside-avoid group">
                  <Image
                    src={src}
                    alt={`Hosman Bravo galería ${i + 1}`}
                    width={800}
                    height={1000}
                    className="w-full h-auto object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ABOUT PAGE */}
      {currentPage === 'about' && (
        <section className={SCENE_FULL}>
          <div className={SCENE_CONTENT}>
            {/* ABOUTLAYOUT — foto e info forman una sola composición.
                El `grid` es la única fuente de ancho total, ancho relativo
                entre columnas, separación y escala: cuando el viewport
                encoge, es ESTA rejilla la que se estrecha, y las dos columnas
                la siguen en la misma proporción porque ninguna tiene una
                medida propia que la desconecte de ella.

                La foto NO lleva un alto propio (`h-[min(72svh,...)]`, como
                tuvo en una versión anterior): eso la hacía más angosta que su
                columna en viewports bajos —el alto mandaba, el ancho quedaba
                suelto— y dejaba un hueco horizontal entre foto y texto que
                rompía la composición. Aquí manda el ANCHO de la columna
                (100% de lo que le da el `grid`) y el alto sale solo de
                `aspect-[3/4]`, así que foto y columna miden lo mismo siempre.
                Si en un viewport bajo la foto resulta más alta que la
                ventana, se resuelve con el scroll normal de esta sección
                (SOBRE MÍ nunca fue una escena sin scroll, a diferencia de
                INICIO), no achicando la foto por su cuenta. */}
            <div className="grid lg:grid-cols-2 gap-block items-start">
              {/* Foto */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg">
                <Image
                  src={data.images.about}
                  alt="Hosman Bravo con Don Juan"
                  fill
                  sizes="(min-width: 1024px) 46vw, 90vw"
                  className="object-cover"
                />
              </div>

              {/* Info */}
              <div className="relative">
                {/* La marca de agua se mide en `em` respecto a su propio
                    tamaño de letra, así que su desplazamiento acompaña al
                    cuerpo en vez de quedarse en los -64px/-20px de antes. */}
                <div className="absolute -top-[0.32em] -left-[0.1em] text-[clamp(6rem,4vw+10svh,12.5rem)] font-black leading-none text-white/5 z-0 pointer-events-none select-none">
                  H
                </div>
                <div className="relative z-10 space-y-[clamp(1rem,0.6vw+2svh,2rem)]">
                  <h2 className="text-section tracking-wide">
                    SOBRE <span className="text-amber-400">HOSMAN BRAVO</span>
                  </h2>

                  <p className="text-sm leading-relaxed text-gray-300">{data.artist.bio}</p>

                  <div>
                    <h3 className="text-sm font-black tracking-widest mb-3 text-red-600">ORIGEN</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                      Nacido en {data.artist.birthPlace}, Colombia. Radicado actualmente en {data.artist.currentCity}.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-black tracking-widest mb-3 text-red-600">MÚSICA</h3>
                    <ul className="text-sm leading-relaxed text-gray-400 space-y-1">
                      {data.songs.map((song) => (
                        <li key={song.title}>
                          <span className="font-bold text-white">{song.title}</span>{' '}
                          <span className="text-gray-600">({song.year})</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-black tracking-widest mb-4 text-red-600">SÍGUEME</h3>
                    <div className="flex gap-2">
                      {[
                        { href: data.socialLinks.tiktok, label: 'TK' },
                        { href: data.socialLinks.instagram, label: 'IG' },
                        { href: data.socialLinks.youtube, label: 'YT' },
                        { href: data.socialLinks.spotify, label: 'SP' },
                        { href: data.socialLinks.facebook, label: 'FB' }
                      ].map(({ href, label }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-xs hover:border-amber-400 hover:text-amber-400 transition"
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <h3 className="text-sm font-black tracking-widest mb-2 text-red-600">CONTACTO</h3>
                    <a href={`mailto:${data.contact.email}`} className="text-sm text-gray-400 hover:text-amber-400 transition">
                      {data.contact.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CONTACT PAGE */}
      {currentPage === 'contact' && (
        <section className={SCENE_FULL}>
          <div className={`${SCENE_CONTENT} max-w-narrow`}>
            <div className="flex justify-center mb-8">
              <Image
                src={data.images.logo.imagotipoDorado}
                alt="Hosman Bravo"
                width={140}
                height={150}
                className="w-32 h-auto object-contain"
              />
            </div>
            <h2 className="text-section mb-block tracking-wide text-center">CONTRATACIONES</h2>

            <form className="space-y-6">
              {[
                { num: '01', label: 'NOMBRE COMPLETO', type: 'text', placeholder: 'Tu nombre' },
                { num: '02', label: 'EMAIL', type: 'email', placeholder: 'tu@email.com' },
                { num: '03', label: 'TIPO DE EVENTO', type: 'text', placeholder: 'Feria, discoteca, evento privado...' },
                { num: '04', label: 'MENSAJE', type: 'textarea', placeholder: 'Ciudad, fecha y detalles del evento...' }
              ].map(({ num, label, type, placeholder }) => (
                <div key={num} className="flex gap-6 items-baseline border-b border-white/25 pb-3">
                  <span className="text-xs opacity-60 w-6">{num}.</span>
                  <label className="text-sm font-black tracking-wide w-36">{label}</label>
                  {type === 'textarea' ? (
                    <textarea
                      placeholder={placeholder}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-sans resize-none"
                      rows={3}
                    ></textarea>
                  ) : (
                    <input
                      type={type}
                      placeholder={placeholder}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-sans"
                    />
                  )}
                </div>
              ))}

              <button
                type="button"
                className="w-full bg-amber-400 text-black py-4 font-black tracking-widest text-sm mt-8 hover:bg-red-600 hover:text-white transition relative"
              >
                <span className="absolute left-3 top-1/2 -translate-y-1/2">•</span>
                ENVIAR
                <span className="absolute right-3 top-1/2 -translate-y-1/2">•</span>
              </button>
            </form>

            <div className="mt-12 p-6 bg-amber-400/5 border border-amber-400/30 rounded-lg text-center">
              <p className="text-xs text-gray-400 mb-2">O contacta directamente:</p>
              <p className="text-sm font-bold text-amber-400">{data.contact.email}</p>
            </div>
          </div>
        </section>
      )}

      {/* En la portada el aviso legal va recogido bajo el botón de contratación;
          en el resto de secciones cierra la página. */}
      {currentPage !== 'home' && (
        <footer className="border-t border-white/10 py-8 px-6 text-center">
          <Image
            src={data.images.logo.logotipoDorado}
            alt="Hosman Bravo"
            width={160}
            height={40}
            className="mx-auto mb-4 w-40 h-auto object-contain"
          />
          <p className="text-xs text-gray-600 tracking-widest">
            © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN, COLOMBIA
          </p>
        </footer>
      )}
    </main>
  );
}
