'use client';

import { hosmanData } from '@/data/hosman-data';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
} from './icons/SocialIcons';

/**
 * WhatsApp va PRIMERO —arriba del rail— a propósito: de él cuelga el bocadillo
 * «CONTRATA TU SHOW», y es el canal por el que de verdad se contrata. El resto
 * queda por orden de prioridad comercial. Cambiar este orden obliga a mover
 * también el anclaje del bocadillo en `HeroScene.tsx`, que apunta al primer
 * icono del grupo.
 *
 * YouTube no está en el rail: la referencia dibuja cuatro redes, y en columna
 * cada icono cuesta alto de pantalla. Conviene ser exacto sobre lo que eso
 * implica: YouTube Music (rail de enfrente) es otra plataforma, y el «VER
 * VIDEOCLIP» del reproductor lleva a UN vídeo concreto, no al canal. El canal de
 * YouTube, por tanto, no tiene acceso directo desde INICIO.
 */
const NETWORKS = [
  { name: 'WhatsApp', url: hosmanData.socialLinks.whatsapp, Icon: WhatsAppIcon },
  { name: 'Instagram', url: hosmanData.socialLinks.instagram, Icon: InstagramIcon },
  { name: 'TikTok', url: hosmanData.socialLinks.tiktok, Icon: TikTokIcon },
  { name: 'Facebook', url: hosmanData.socialLinks.facebook, Icon: FacebookIcon },
] as const;

/**
 * Redes sociales del artista: el RAIL IZQUIERDO de la escena, vertical en
 * todas las composiciones.
 *
 * Solo pinta la columna; dónde se ancla (fijo, superpuesto, centrado en su
 * banda) lo decide `HeroScene`, que es quien sabe qué hay arriba y abajo de ese
 * lateral.
 *
 * El hueco extra bajo WhatsApp no es decorativo: es el sitio donde cae el
 * bocadillo «CONTRATA TU SHOW», que cuelga por debajo del icono.
 */
export function SocialLinks() {
  /* Mismo lenguaje que las plataformas, un punto por debajo: el tamaño normal se
     deriva de la misma escala base (`--hb-control`) mediante
     `--hb-control-social`.

     `--hb-social-btn` y `--hb-social-hueco` los define el rail que contiene
     este grupo (`HeroScene`) a partir del alto de SU banda: ahí encogen de
     forma fluida cuando falta sitio. Sin rail, valen el tamaño normal. */
  return (
    <div className="flex flex-col gap-[var(--hb-social-hueco,var(--hb-social-gap))]">
      {NETWORKS.map(({ name, url, Icon }) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={name}
          aria-label={`Hosman Bravo en ${name}`}
          className={`flex h-[var(--hb-social-btn,var(--hb-control-social))] w-[var(--hb-social-btn,var(--hb-control-social))] items-center justify-center rounded-full border border-amber-200/25 bg-black/50 text-amber-100/70 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105 hover:border-amber-400/70 hover:bg-black/70 hover:text-amber-300 hover:shadow-[0_0_14px_-2px_rgba(200,150,60,0.45)] focus-visible:scale-105 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none ${
            name === 'WhatsApp' ? 'mb-[var(--hb-social-cta)]' : ''
          }`}
        >
          {/* El glifo mide el 49% del botón y encoge con él. */}
          <Icon className="h-[calc(var(--hb-social-btn,var(--hb-control-social))*0.49)] w-[calc(var(--hb-social-btn,var(--hb-control-social))*0.49)] transition-colors duration-300" />
        </a>
      ))}
    </div>
  );
}
