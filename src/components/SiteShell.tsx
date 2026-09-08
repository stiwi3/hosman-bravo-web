'use client';

import { useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import { EntryScreen } from '@/components/audio/EntryScreen';
import { useAudio } from '@/components/audio/AudioProvider';
import { TrackPlayer } from '@/components/audio/TrackPlayer';
import { MobilePlayer } from '@/components/audio/MobilePlayer';
import { MusicPlatforms } from '@/components/MusicPlatforms';
import { LeatherMenuPhoto } from '@/components/LeatherMenuPhoto';
import { HeroScene } from '@/components/HeroScene';
import { hosmanData } from '@/data/hosman-data';
import { NAV_ITEMS, DIRECT_ENTRY_SECTIONS, type SectionId } from '@/data/types';

/* ---------------------------------------------------------------------------
   LA CAPA PERSISTENTE.

   Todo lo que debe SOBREVIVIR a un cambio de ruta vive aquí, no en una ruta: el
   telón, la cabecera (menú, navegación, reproductor, plataformas) y la escena
   INICIO con su hero. Lo único que se reemplaza al navegar es `children`.

   El App Router preserva el layout y su estado entre navegaciones de cliente, y
   ese es exactamente el mecanismo del que depende esta arquitectura:

     · el contexto WebGL y las texturas de densidad del humo sobreviven;
     · la canción no se reinicia (el `AudioProvider` está aún más arriba);
     · el telón no vuelve a aparecer;
     · la cabecera no parpadea.

   ⚠️ Este componente NO debe recibir nunca una `key`: es lo que garantiza que
   React lo reconcilie como el mismo elemento en cada navegación. Ver
   ARCHITECTURE.md §3.
--------------------------------------------------------------------------- */
export function SiteShell({ children }: { children: React.ReactNode }) {
  /* `useSelectedLayoutSegment` y NO `usePathname`: lee el árbol de rutas, no la
     cadena de URL, así que es agnóstico al `basePath`. En GitHub Pages la URL
     real es `/hosman-bravo-web/galeria` y aquí sigue llegando `'galeria'`.
     Devuelve `null` en `/`. */
  const { hasEntered } = useAudio();

  const segment = useSelectedLayoutSegment();

  /* Se contrasta contra la propia tabla de navegación en vez de castear: un
     segmento desconocido (la página 404) cae en INICIO sin romper nada. */
  const current: SectionId = NAV_ITEMS.find((item) => item.id === segment)?.id ?? 'home';
  const isHome = current === 'home';

  /* LO QUE SE VE POR LA ABERTURA DEL TELÓN ES EL DESTINO FINAL.
   *
   * Mientras la portada sigue puesta, el visitante ya entrevé lo que hay
   * detrás: el telón es semitransparente en sus zonas oscuras y el gesto de
   * hover abre una rendija. Si alguien entra por `/musica`, ahí debe estar el
   * hero —que es adonde va a acabar—, no la sección de la que viene.
   *
   * `hasEntered` viene de `AudioProvider` porque el gesto que abre el telón es
   * el mismo que arranca el audio: una sola verdad para «ya se ha entrado».
   *
   * Las escenas de `DIRECT_ENTRY_SECTIONS` (hoy `/contacto`) no se redirigen,
   * así que detrás del telón se muestran ellas mismas: siguen siendo su propio
   * destino. */
  const willBeFunneled =
    !isHome && !DIRECT_ENTRY_SECTIONS.includes(current) && !hasEntered;

  const showHero = isHome || willBeFunneled;

  const headerRef = useRef<HTMLElement>(null);

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
    <>
      <EntryScreen />

      {/* `min-h-svh` y NO `min-h-screen`. `min-h-screen` es `100vh`, que en
          móvil equivale al viewport GRANDE —el que queda con las barras del
          navegador retraídas—, así que el documento medía más que la pantalla
          mientras la barra de direcciones estaba desplegada y aparecía scroll
          aunque la escena estuviera a `100svh`. Ese scroll no se reproduce en
          un navegador de escritorio, donde no hay barra dinámica. */}
      <main className="bg-black text-white font-sans overflow-x-hidden min-h-svh">
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
          <LeatherMenuPhoto items={NAV_ITEMS} current={current} />

          {/* NAVEGACIÓN CENTRAL
              Se alinea con el padding de la cabecera en vez de con un `top-8`
              fijo, de modo que sube junto al resto cuando la cabecera encoge.
              Son `<Link>` y no `<button>` desde que las escenas son rutas
              reales: `next/link` aplica solo el `basePath`. */}
          {/* Solo en la composición abierta. Fuera de ella no se pierde
              navegación —las mismas seis entradas están dentro del menú de
              cuero, que es el control principal— y su sitio lo necesita el
              reproductor para caber en la misma fila que el menú. */}
          <nav className="absolute left-1/2 -translate-x-1/2 top-[calc(var(--hb-header-pad)+0.5rem)] hidden text-nav tracking-widest space-x-5 abierta:block">
            {NAV_ITEMS.map(({ id, label, href }) => (
              <Link
                key={id}
                href={href}
                aria-current={current === id ? 'page' : undefined}
                className={`hover:text-amber-400 transition ${current === id ? 'text-amber-400' : ''}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* MUSICBLOCK — reproductor + plataformas.
              Se leen como una sola pieza, así que se mueven como una: un único
              `gap` (`--hb-music-gap`) los separa, en vez de que cada uno cargue
              su propia curva de escalado y el hueco entre ambos crezca o
              encoja por su cuenta sin relación con el resto del módulo (eso
              producía, según el viewport, o demasiado aire entre los dos o las
              plataformas empujadas hacia abajo). */}
          <div className="flex min-w-0 flex-1 flex-col items-end gap-[var(--hb-music-gap)]">
            {/* El reproductor manda sobre el audio global; debajo quedan los
                accesos a las plataformas.

                LOS DOS REPRODUCTORES ESTÁN EN EL DOM Y SOLO SE VE UNO. No es
                estado duplicado —los dos leen y escriben en `AudioProvider`,
                que es el único que tiene el audio— sino dos presentaciones. El
                que no toca queda en `display:none`, que lo saca también del
                árbol de accesibilidad, así que un lector de pantalla tampoco
                ve dos. Elegir en JS obligaría a leer el tamaño de la ventana
                para decidir el layout, que es justo lo que no se quiere.

                CUÁL SE VE NO ES UNA CONDICIÓN NUEVA: va atado a la
                composición. En la abierta la cabecera flota sobre el vídeo
                y no le cuesta alto al hero, así que ahí cabe el módulo
                completo; en la compacta cada píxel de cabecera se lo quita
                al hero, y por eso manda la presentación de una fila. */}
            <div className="hidden abierta:block">
              <TrackPlayer />
            </div>
            <div className="w-full min-w-0 abierta:hidden">
              <MobilePlayer />
            </div>
            {/* La `key` remonta el bloque al cambiar de sección, de modo que
                siempre aparece recogido al navegar. */}
            <MusicPlatforms
              key={current}
              colapso={isHome ? 'solo-rail' : 'siempre'}
              enRail={isHome}
            />
          </div>
        </header>

        {/* PORTADA
            Se mantiene montada siempre y solo se oculta: así el contexto WebGL y
            las texturas de densidad del humo sobreviven al cambiar de sección. Si
            se desmontara, la simulación arrancaría vacía al volver y tardaría más
            de diez segundos en acumular humo visible. El IntersectionObserver del
            propio componente detiene el bucle mientras está oculto.

            `hidden` es `display:none`, no desmontaje: el ResizeObserver de
            `InteractiveSmoke` recibe entonces 0×0 y `applySize` sale por su
            guarda, que es justo lo que impide recrear las texturas. */}
        <div className={showHero ? 'contents' : 'hidden'}>
          <HeroScene />
        </div>

        {/* La escena de la ruta activa. */}
        {children}

        {/* En la portada el aviso legal va recogido bajo el botón de contratación;
            en el resto de secciones cierra la página. */}
        {!isHome && (
          <footer className="border-t border-white/10 py-8 px-6 text-center">
            <Image
              src={hosmanData.images.logo.logotipoDorado}
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
    </>
  );
}
