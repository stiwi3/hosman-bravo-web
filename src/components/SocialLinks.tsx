'use client';

import { hosmanData } from '@/data/hosman-data';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from './icons/SocialIcons';

/**
 * WhatsApp va PRIMERO (extremo izquierdo de la fila, arriba del rail) a
 * propósito: de él cuelga el bocadillo «CONTRATA TU SHOW», y es el canal por el
 * que de verdad se contrata. El resto queda por orden de prioridad comercial.
 * Cambiar este orden obliga a mover también el anclaje del bocadillo en
 * `HeroScene.tsx`, que apunta al primer icono del grupo.
 *
 * `soloEscritorio` marca a YouTube: sale del rail por decisión de
 * composición —la referencia dibuja cuatro redes, y en columna cada icono cuesta
 * alto de pantalla—, no porque esté repetido. Conviene ser exacto: YouTube Music
 * (rail de enfrente) es otra plataforma, y el «VER VIDEOCLIP» del reproductor
 * lleva a UN vídeo concreto, no al canal. En móvil, por tanto, el canal de
 * YouTube deja de tener acceso directo desde INICIO.
 */
const NETWORKS = [
  { name: 'WhatsApp', url: hosmanData.socialLinks.whatsapp, Icon: WhatsAppIcon },
  { name: 'Instagram', url: hosmanData.socialLinks.instagram, Icon: InstagramIcon },
  { name: 'YouTube', url: hosmanData.socialLinks.youtube, Icon: YouTubeIcon, soloEscritorio: true },
  { name: 'TikTok', url: hosmanData.socialLinks.tiktok, Icon: TikTokIcon },
  { name: 'Facebook', url: hosmanData.socialLinks.facebook, Icon: FacebookIcon },
] as const;

/**
 * Redes sociales del artista.
 *
 * Una fila en la esquina inferior del hero mientras el pie puede sostenerla;
 * cuando ya no, el rail vertical izquierdo. Es el MISMO nodo con otra
 * dirección de flujo, no dos componentes: lo único que cambia es `flex-col` y
 * qué iconos se muestran.
 *
 * El hueco extra bajo WhatsApp en el rail no es decorativo: es el sitio donde
 * cae el bocadillo «CONTRATA TU SHOW», que en columna pasa a colgar por debajo
 * del icono en vez de por encima.
 */
export function SocialLinks() {
  /* Mismo lenguaje que las plataformas de la cabecera, un punto por debajo:
     el tamaño se deriva de la misma escala base (`--hb-control`) mediante
     `--hb-control-social`, pero con su propio suelo — cuando la cabecera ya ha
     tocado su mínimo, a las redes aún les queda recorrido antes de dejar de ser
     pulsables. */
  return (
    <div className="flex gap-[clamp(0.25rem,0.8svh,0.5rem)] rails:flex-col">
      {NETWORKS.map(({ name, url, Icon, ...resto }) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={name}
          aria-label={`Hosman Bravo en ${name}`}
          className={`flex h-[var(--hb-control-social)] w-[var(--hb-control-social)] items-center justify-center rounded-full border border-amber-200/25 bg-black/50 text-amber-100/70 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105 hover:border-amber-400/70 hover:bg-black/70 hover:text-amber-300 hover:shadow-[0_0_14px_-2px_rgba(200,150,60,0.45)] focus-visible:scale-105 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none ${
            'soloEscritorio' in resto ? 'rails:hidden' : ''
          } ${name === 'WhatsApp' ? 'rails:mb-[2.1rem]' : ''}`}
        >
          {/* 18px sobre 44 = 41% */}
          <Icon className="h-[max(14px,calc(var(--hb-control-social)*0.41))] w-[max(14px,calc(var(--hb-control-social)*0.41))] transition-colors duration-300" />
        </a>
      ))}
    </div>
  );
}
