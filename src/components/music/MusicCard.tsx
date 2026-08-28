import { SpotifyIcon, AppleMusicIcon, YouTubeMusicIcon } from '@/components/icons/PlatformIcons';
import { ReleaseVisual } from './ReleaseVisual';
import { releaseKind } from '@/data/music-releases';
import type { MusicRelease } from '@/data/types';

/* ---------------------------------------------------------------------------
   Una pieza de la sección MÚSICA.

   UN SOLO COMPONENTE para las dos escalas y para los dos tipos de contenido.
   `featured` no cambia la estructura, solo la magnitud y la proporción: la
   diferencia entre el último lanzamiento y el resto es de tamaño, no de otra
   pieza distinta que haya que mantener en paralelo.

   EN REPOSO SOLO SE VE LA IMAGEN. Ni título, ni fecha, ni artista, ni botones.
   El nombre y las plataformas aparecen al interactuar, porque el catálogo se
   recorre mirando, no leyendo.

   DESKTOP / MÓVIL SIN DUPLICAR
   El hover va con `group-hover`, que en Tailwind v4 ya se emite dentro de
   `@media (hover: hover)` — así que en un móvil NO se dispara nunca, ni
   siquiera por el hover fantasma del tap. Para que la información siga siendo
   alcanzable sin ratón, el overlay arranca visible y solo se esconde en
   dispositivos que sí tienen puntero. De ahí la pareja de clases:

       opacity-100                       ← táctil: siempre a la vista
       [@media(hover:hover)]:opacity-0   ← con ratón: oculto hasta el hover

   ⚠️ Esa visibilidad permanente en táctil es PROVISIONAL y a propósito: es una
   clase, no una arquitectura. Cuando se decida el comportamiento táctil
   definitivo (primer tap revela / siempre visible / otra cosa) se cambia aquí
   y en ningún sitio más.

   `focus-within` acompaña al hover para que el teclado llegue a lo mismo que
   el ratón: al tabular hasta un icono, el overlay aparece.

   PUNTO DE ENGANCHE (fase siguiente): la superficie principal de una pieza con
   videoclip debe abrir el reproductor de YouTube. Hoy es un `<div>` a
   propósito y NO un `<button>` inerte — un control que no hace nada es peor
   que ninguno. Cuando se implemente, el gesto será: abrir vídeo → pausar el
   audio global con `pause()` de `useAudio()` → montar el reproductor. Los
   iconos de plataforma ya son `<a>` independientes, así que seguirán
   funcionando por encima de esa superficie sin más cambios.
--------------------------------------------------------------------------- */

/** Solo se pintan las plataformas que de verdad tienen URL. */
function platformsOf(release: MusicRelease) {
  return [
    { key: 'spotify', name: 'Spotify', url: release.spotifyUrl, Icon: SpotifyIcon },
    { key: 'apple', name: 'Apple Music', url: release.appleMusicUrl, Icon: AppleMusicIcon },
    { key: 'ytmusic', name: 'YouTube Music', url: release.youtubeMusicUrl, Icon: YouTubeMusicIcon }
  ].filter((p): p is typeof p & { url: string } => Boolean(p.url));
}

/* Los dos tamaños de la pieza. Van como literales estáticos y no como
   plantilla: el JIT de Tailwind necesita leer la clase como texto en el
   código fuente, y una clase construida en tiempo de ejecución no se compila.

   La caja del destacado es 16:9 y la de la cuadrícula 4:3. Que todas las
   piezas pequeñas compartan proporción es lo que mantiene la retícula
   tranquila; la variedad la pone el contenido (funda + vinilo frente a
   fotograma), no una caja distinta por elemento. */
const BOX_FEATURED = 'aspect-video';
const BOX_GRID = 'aspect-[4/3]';

export function MusicCard({
  release,
  featured = false
}: {
  release: MusicRelease;
  featured?: boolean;
}) {
  const kind = releaseKind(release);
  const platforms = platformsOf(release);

  const sizes = featured
    ? '(min-width: 1024px) 54rem, 92vw'
    : '(min-width: 1024px) 22rem, 46vw';

  return (
    <article
      className={`group relative isolate overflow-hidden rounded-[3px] bg-[#0a0708] ring-1 ring-white/[0.06] transition-shadow duration-500 hover:ring-[#D4AF37]/25 focus-within:ring-[#D4AF37]/25 ${
        featured ? BOX_FEATURED : BOX_GRID
      }`}
    >
      {/* La imagen, la funda o el fallback. Es lo único que se ve en reposo. */}
      <ReleaseVisual release={release} kind={kind} sizes={sizes} />

      {/* VELO — de negro por abajo a nada por arriba. Muy contenido: tiene que
          dejar leer el título sin apagar la imagen, no oscurecer la pieza. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-100 transition-opacity duration-500 ease-out [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
      />

      {/* INFORMACIÓN — título y plataformas. Sube tres píxeles al aparecer:
          lo justo para que se lea como que emerge, sin desplazamiento. */}
      <div
        className={`absolute inset-x-0 bottom-0 flex flex-col gap-2 opacity-100 transition-[opacity,transform] duration-500 ease-out [@media(hover:hover)]:translate-y-[3px] [@media(hover:hover)]:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none motion-reduce:translate-y-0 ${
          featured
            ? 'p-[clamp(0.9rem,0.6vw+1.4svh,1.6rem)]'
            : 'p-[clamp(0.6rem,0.4vw+0.9svh,1rem)]'
        }`}
      >
        <h3
          className="font-black uppercase leading-tight tracking-wide text-[#F2EEE8] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]"
          style={{
            fontSize: featured
              ? 'clamp(1rem, 0.5vw + 1.5svh, 1.6rem)'
              : 'clamp(0.68rem, 0.2vw + 0.8svh, 0.95rem)'
          }}
        >
          {release.title}
        </h3>

        {/* Sin plataformas no se pinta la fila: nada de huecos ni de iconos
            apagados anunciando algo que no existe. */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap items-center gap-[clamp(0.3rem,0.6svh,0.55rem)]">
            {platforms.map(({ key, name, url, Icon }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Escuchar ${release.title} en ${name}`}
                aria-label={`Escuchar ${release.title} en ${name}`}
                className="flex items-center justify-center rounded-full border border-amber-200/25 bg-black/55 text-amber-100/75 backdrop-blur-sm transition-colors duration-300 hover:border-amber-400/70 hover:text-amber-300 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none"
                style={{
                  width: featured
                    ? 'clamp(1.9rem, 0.5vw + 2.2svh, 2.4rem)'
                    : 'clamp(1.55rem, 0.3vw + 1.8svh, 1.9rem)',
                  height: featured
                    ? 'clamp(1.9rem, 0.5vw + 2.2svh, 2.4rem)'
                    : 'clamp(1.55rem, 0.3vw + 1.8svh, 1.9rem)'
                }}
              >
                <Icon
                  className="h-[42%] w-[42%]"
                  style={{ width: '42%', height: '42%' }}
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
