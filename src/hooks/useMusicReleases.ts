'use client';

import { useEffect, useState } from 'react';
import { getMusicReleases, peekMusicReleases } from '@/lib/content-api';
import { musicReleasesFallback } from '@/data/music-releases';
import type { MusicRelease } from '@/data/types';

/* ---------------------------------------------------------------------------
   Catálogo de música, leído del snapshot publicado (`/content.json`).

   POR QUÉ EN EL NAVEGADOR Y NO EN EL BUILD
   Porque así una publicación de Hosman se ve sin recompilar la web. Si el
   catálogo se resolviera al compilar, cada cambio en la hoja exigiría un
   despliegue del frontend; leyéndolo en el navegador, basta con que el
   snapshot cambie en el repositorio.

   El precio: el HTML exportado de `/musica` no contiene los lanzamientos, solo
   el estado de carga. Es la contrapartida elegida a propósito.

   LA CACHÉ VIVE EN `content-api`, no aquí. Este hook solo la consulta. Ver
   allí por qué sigue haciendo falta pese a que el contenido ya sea estático.
--------------------------------------------------------------------------- */

export type MusicSource = 'loading' | 'api' | 'fallback';

export interface MusicReleasesState {
  releases: MusicRelease[];
  /** De dónde salen los datos que se están pintando. */
  source: MusicSource;
}

export function useMusicReleases(): MusicReleasesState {
  /* Arranque síncrono desde la caché: al volver a `/musica` dentro del TTL, el
     primer render ya trae los datos y no se ve el esqueleto. En el primer
     montaje —y en el render del servidor durante el export— la caché está
     vacía, así que se empieza en `loading` y el HTML estático coincide con lo
     que el cliente pinta al hidratar. */
  const [state, setState] = useState<MusicReleasesState>(() => {
    const cachedResult = peekMusicReleases();
    return cachedResult
      ? { releases: cachedResult.releases, source: 'api' }
      : { releases: [], source: 'loading' };
  });

  useEffect(() => {
    // Si ya se pintó desde la caché no hay nada que pedir.
    if (peekMusicReleases()) return;

    // No se aborta la petición al desmontar: la promesa está COMPARTIDA con
    // cualquier otro montaje que la esté esperando (ver `getMusicReleases`), y
    // cancelarla dejaría a los demás sin datos. Lo que se hace es ignorar el
    // resultado si este componente ya no está.
    let alive = true;

    getMusicReleases()
      .then((result) => {
        if (!alive) return;
        // Una respuesta correcta pero vacía no debería dejar la sección en
        // blanco por un problema de la hoja, así que se marca como fallback
        // para que la sección lo trate como tal.
        setState(
          result.releases.length > 0
            ? { releases: result.releases, source: 'api' }
            : { releases: [...musicReleasesFallback], source: 'fallback' }
        );
      })
      .catch((error: unknown) => {
        if (!alive) return;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[música] no se pudo leer el snapshot de contenido.', error);
        }
        setState({ releases: [...musicReleasesFallback], source: 'fallback' });
      });

    return () => {
      alive = false;
    };
  }, []);

  return state;
}
