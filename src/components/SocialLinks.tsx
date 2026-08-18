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
  return (
    <div className="flex gap-1 sm:gap-2">
      {NETWORKS.map(({ name, url, Icon }) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={name}
          aria-label={`Hosman Bravo en ${name}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/25 bg-black/50 text-amber-100/70 backdrop-blur-sm transition-all duration-300 ease-out hover:scale-105 hover:border-amber-400/70 hover:bg-black/70 hover:text-amber-300 hover:shadow-[0_0_14px_-2px_rgba(200,150,60,0.45)] focus-visible:scale-105 focus-visible:border-amber-400/70 focus-visible:text-amber-300 focus-visible:outline-none sm:h-10 sm:w-10 md:h-11 md:w-11"
        >
          <Icon className="h-4 w-4 transition-colors duration-300 sm:h-[17px] sm:w-[17px] md:h-[18px] md:w-[18px]" />
        </a>
      ))}
    </div>
  );
}
