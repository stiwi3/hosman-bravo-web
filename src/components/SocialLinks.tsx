'use client';

import { hosmanData } from '@/data/hosman-data';
import {
  FacebookIcon,
  InstagramIcon,
  TikTokIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from './icons/SocialIcons';

const NETWORKS = [
  { name: 'Instagram', url: hosmanData.socialLinks.instagram, Icon: InstagramIcon },
  { name: 'YouTube', url: hosmanData.socialLinks.youtube, Icon: YouTubeIcon },
  { name: 'TikTok', url: hosmanData.socialLinks.tiktok, Icon: TikTokIcon },
  { name: 'Facebook', url: hosmanData.socialLinks.facebook, Icon: FacebookIcon },
  { name: 'WhatsApp', url: hosmanData.socialLinks.whatsapp, Icon: WhatsAppIcon },
] as const;

/**
 * Redes sociales del artista, en la esquina inferior izquierda del hero.
 *
 * Comparte el mismo lenguaje visual que los enlaces a plataformas de la
 * cabecera, un punto más compacto para no competir con la composición.
 */
export function SocialLinks() {
  /* Mismo lenguaje que las plataformas de la cabecera, un punto por debajo:
     el tamaño se deriva de la misma escala base (`--hb-control`) mediante
     `--hb-control-social`, pero con su propio suelo de 32px — cuando la
     cabecera ya ha tocado su mínimo, a las redes aún les queda recorrido
     antes de dejar de ser pulsables. */
  return (
    <div className="flex gap-[clamp(0.25rem,0.8svh,0.5rem)]">
      {NETWORKS.map(({ name, url, Icon }) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={name}
          aria-label={`Hosman Bravo en ${name}`}
          className="flex h-[var(--hb-control-social)] w-[var(--hb-control-social)] items-center justify-center rounded-full border border-amber-200/25 bg-black/50 text-amber-100/70 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105 hover:border-amber-400/70 hover:bg-black/70 hover:text-amber-300 hover:shadow-[0_0_14px_-2px_rgba(200,150,60,0.45)] focus-visible:scale-105 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none"
        >
          {/* 18px sobre 44 = 41% */}
          <Icon className="h-[max(14px,calc(var(--hb-control-social)*0.41))] w-[max(14px,calc(var(--hb-control-social)*0.41))] transition-colors duration-300" />
        </a>
      ))}
    </div>
  );
}
