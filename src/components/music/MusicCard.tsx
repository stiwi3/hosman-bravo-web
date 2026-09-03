import {
  SpotifyIcon,
  AppleMusicIcon,
  YouTubeMusicIcon,
  AmazonMusicIcon,
  DeezerIcon,
  TidalIcon,
  SoundCloudIcon,
  AudiomackIcon
} from '@/components/icons/PlatformIcons';
import { ReleaseVisual } from './ReleaseVisual';
import { releasePresentation } from '@/data/music-releases';
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

   ABRIR EL VIDEOCLIP
   Si la pieza tiene vídeo, `MusicSection` le pasa `onPlay` y aparece una
   superficie de disparo que cubre la tarjeta. NO es un `<button>` envolvente
   a propósito: los iconos de plataforma son `<a>` y quedarían anidados dentro
   de un control, que es HTML inválido y un estorbo para el lector de
   pantalla. En su lugar la superficie es un hermano de la capa de
   información, va por DEBAJO de ella en orden de pintado, y esa capa deja
   pasar el puntero salvo en los propios enlaces. Así el vídeo y las
   plataformas son acciones hermanas, no una dentro de otra.
--------------------------------------------------------------------------- */

/**
 * PLATAFORMAS TITULARES, de más a menos relevante. Son las que se muestran
 * siempre que la canción las tenga.
 */
const PRIMARY_PLATFORMS = [
  { key: 'spotify', name: 'Spotify', field: 'spotifyUrl', Icon: SpotifyIcon },
  { key: 'ytmusic', name: 'YouTube Music', field: 'youtubeMusicUrl', Icon: YouTubeMusicIcon },
  { key: 'apple', name: 'Apple Music', field: 'appleMusicUrl', Icon: AppleMusicIcon },
  { key: 'amazon', name: 'Amazon Music', field: 'amazonMusicUrl', Icon: AmazonMusicIcon }
] as const;

/**
 * SUPLENTES. Solo entran a ocupar el hueco que deje una titular ausente, en
 * este orden.
 */
const RESERVE_PLATFORMS = [
  { key: 'deezer', name: 'Deezer', field: 'deezerUrl', Icon: DeezerIcon },
  { key: 'tidal', name: 'Tidal', field: 'tidalUrl', Icon: TidalIcon },
  { key: 'soundcloud', name: 'SoundCloud', field: 'soundcloudUrl', Icon: SoundCloudIcon },
  { key: 'audiomack', name: 'Audiomack', field: 'audiomackUrl', Icon: AudiomackIcon }
] as const;

/**
 * Cuántos iconos caben sin que la fila se parta sobre la carátula.
 *
 * Con las ocho plataformas rellenas, en una tarjeta de la cuadrícula a 320px la
 * fila se rompía en varias líneas y tapaba la imagen. Cuatro es el máximo que
 * se lee de un vistazo y no compite con el título.
 */
const MAX_VISIBLE_PLATFORMS = 4;

/**
 * Las plataformas que se pintan, ya resueltas.
 *
 * Primero las titulares que tengan enlace, en su orden; después las suplentes,
 * solo hasta completar el cupo. Así una canción que no esté en Spotify no
 * desperdicia el hueco: lo ocupa la siguiente que sí tenga.
 *
 * El icono aparece si —y solo si— esa plataforma trae un enlace que ha pasado
 * la validación de dominio del CMS. Anunciar un destino que no existe, o que
 * lleva a la tienda equivocada, es peor que no anunciarlo.
 */
function platformsOf(release: MusicRelease) {
  const withUrl = (entry: (typeof PRIMARY_PLATFORMS | typeof RESERVE_PLATFORMS)[number]) => {
    const url = release[entry.field];
    return url ? { key: entry.key, name: entry.name, Icon: entry.Icon, url } : null;
  };

  const resolved = [...PRIMARY_PLATFORMS, ...RESERVE_PLATFORMS]
    .map(withUrl)
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return resolved.slice(0, MAX_VISIBLE_PLATFORMS);
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
  featured = false,
  onPlay
}: {
  release: MusicRelease;
  featured?: boolean;
  /** Abre el videoclip. Solo llega si la pieza tiene uno. */
  onPlay?: () => void;
}) {
  const presentation = releasePresentation(release);
  const platforms = platformsOf(release);

  return (
    <article
      className={`group relative isolate overflow-hidden rounded-[3px] bg-[#0a0708] ring-1 ring-white/[0.06] transition-shadow duration-500 hover:ring-[#D4AF37]/25 focus-within:ring-[#D4AF37]/25 ${
        featured ? BOX_FEATURED : BOX_GRID
      }`}
    >
      {/* La imagen, la funda o el fallback. Es lo único que se ve en reposo. */}
      <ReleaseVisual release={release} presentation={presentation} />

      {/* SUPERFICIE DE DISPARO — solo si hay videoclip.
          `role="button"` + `tabIndex` en vez de un `<button>` real por lo que
          explica la cabecera. Espacio lleva `preventDefault` porque su acción
          por defecto es desplazar la página, y un teclado que abre el vídeo no
          debe además mover la sección bajo él.
          El anillo de foco va `inset`: el `<article>` es `overflow-hidden` y
          uno exterior se recortaría justo por donde se ve. */}
      {onPlay && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Reproducir el videoclip de ${release.title}`}
          /* El foco se pone a mano antes de abrir: no todos los navegadores
             enfocan un `div` con `tabIndex` al pulsarlo, y de ese foco depende
             que al cerrar el modal se pueda devolver aquí. Con ratón no se ve
             anillo, porque es `focus-visible` y no `focus`. */
          onClick={(event) => {
            event.currentTarget.focus();
            onPlay();
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onPlay();
          }}
          /* `peer`: el indicador de play es un hermano POSTERIOR y se ilumina
             con `peer-focus-visible` cuando esta superficie recibe el foco por
             teclado. No vale `group-focus-within` en el `<article>`: eso se
             dispararía también al tabular hasta un icono de plataforma. */
          className="peer absolute inset-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D4AF37]"
        />
      )}

      {/* VELO — de negro por abajo a nada por arriba. Muy contenido: tiene que
          dejar leer el título sin apagar la imagen, no oscurecer la pieza. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-100 transition-opacity duration-500 ease-out [@media(hover:hover)]:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none"
      />

      {/* PLAY — la señal de que la pieza se puede reproducir.
          Va SIEMPRE visible, también en táctil: si solo apareciera al pasar el
          ratón, el usuario no tendría forma de saber que la tarjeta abre un
          vídeo. En reposo queda a media opacidad para no disputarle la imagen
          a la portada; al pasar el ratón o al enfocar el disparador con el
          teclado se vuelve sólido y crece un punto. Nada más: ni latido, ni
          rebote, ni resplandor — la sombra es de contacto, para que se lea
          sobre una portada clara.
          Va DESPUÉS del velo para que este no lo apague, y `pointer-events-none`
          para que el clic lo atraviese hasta la superficie de disparo. */}
      {onPlay && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-60 transition-[opacity,transform] duration-300 ease-out group-hover:scale-105 group-hover:opacity-100 peer-focus-visible:scale-105 peer-focus-visible:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:peer-focus-visible:scale-100"
        >
          <span
            className="flex items-center justify-center rounded-full border border-[#D4AF37]/40 bg-black/45 text-[#D4AF37] shadow-[0_6px_18px_-6px_rgba(0,0,0,0.9)] backdrop-blur-sm"
            style={{
              width: featured
                ? 'clamp(3rem, 0.9vw + 3.4svh, 4.2rem)'
                : 'clamp(2.1rem, 0.5vw + 2.3svh, 2.9rem)',
              height: featured
                ? 'clamp(3rem, 0.9vw + 3.4svh, 4.2rem)'
                : 'clamp(2.1rem, 0.5vw + 2.3svh, 2.9rem)'
            }}
          >
            {/* Desplazado un pelo a la derecha: un triángulo centrado por su
                caja se ve descentrado por su propia forma. */}
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              className="ml-[6%] h-[38%] w-[38%]"
            >
              <path d="M8 5.14v13.72a.5.5 0 0 0 .76.43l11.14-6.86a.5.5 0 0 0 0-.86L8.76 4.71A.5.5 0 0 0 8 5.14Z" />
            </svg>
          </span>
        </div>
      )}

      {/* INFORMACIÓN — título y plataformas. Sube tres píxeles al aparecer:
          lo justo para que se lea como que emerge, sin desplazamiento.

          `pointer-events-none` en el bloque y `pointer-events-auto` en cada
          enlace: el título deja pasar el clic a la superficie de disparo de
          arriba —pulsar sobre el nombre abre el vídeo, que es lo esperable—
          mientras que los iconos siguen siendo destinos propios. */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 opacity-100 transition-[opacity,transform] duration-500 ease-out [@media(hover:hover)]:translate-y-[3px] [@media(hover:hover)]:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 motion-reduce:transition-none motion-reduce:translate-y-0 ${
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
                className="pointer-events-auto flex items-center justify-center rounded-full border border-amber-200/25 bg-black/55 text-amber-100/75 backdrop-blur-sm transition-colors duration-300 hover:border-amber-400/70 hover:text-amber-300 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none"
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
