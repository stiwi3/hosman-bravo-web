'use client';

import { useMusicReleases } from '@/hooks/useMusicReleases';
import { releasesByDateDesc } from '@/data/music-releases';

/* ---------------------------------------------------------------------------
   MÚSICA de SOBRE MÍ — la discografía sale del mismo snapshot publicado que
   la sección MÚSICA, así que cada PUBLICAR de Hosman la actualiza sin tocar
   código. Antes era una lista escrita a mano en `hosman-data` que se quedaba
   atrás con cada lanzamiento.

   QUÉ CUENTA COMO CANCIÓN: lo que tiene enlace de Spotify. El catálogo no
   tiene un campo de tipo, y ahí también viven piezas que no son canciones
   (p. ej. «Hosman de niño · Recuerdo 2005», un vídeo de recuerdo sin Spotify).

   Mientras carga, o si el snapshot falla, el bloque no se pinta: vale más no
   decir nada que enseñar una discografía incompleta o inventada (mismo
   criterio que el respaldo vacío de `music-releases`).
--------------------------------------------------------------------------- */
export function AboutSongs() {
  const { releases, source } = useMusicReleases();
  const songs = source === 'api' ? releasesByDateDesc(releases).filter((r) => r.spotifyUrl) : [];

  if (songs.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-black tracking-widest mb-3 text-red-600">MÚSICA</h3>
      <ul className="text-sm leading-relaxed text-gray-400 space-y-1">
        {songs.map((song) => (
          <li key={song.id}>
            <span className="font-bold text-white">{song.title}</span>{' '}
            <span className="text-gray-600">({song.releaseDate.slice(0, 4)})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
