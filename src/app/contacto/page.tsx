import type { Metadata } from 'next';
import { ContactSection } from '@/components/sections/ContactSection';
import { hosmanData } from '@/data/hosman-data';

const TITLE = 'Contrataciones';
const DESCRIPTION =
  'Contrata el show de Hosman Bravo: música popular en vivo y caballos de alta escuela. Cuéntanos ciudad, fecha y tipo de evento.';

/**
 * Esta es la ruta que se comparte con los promotores, así que es la única
 * que necesita ficha propia. `openGraph` se declara entero a propósito: Next
 * no lo fusiona con el del layout, y omitir `images` dejaría el enlace sin
 * imagen justo donde más importa.
 */
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/contacto' },
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'Hosman Bravo',
    url: `${hosmanData.seo.siteUrl}/contacto`,
    title: `${TITLE} | Hosman Bravo`,
    description: DESCRIPTION,
    images: [
      {
        url: hosmanData.seo.ogImage,
        width: 1200,
        height: 630,
        alt: hosmanData.seo.ogImageAlt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | Hosman Bravo`,
    description: DESCRIPTION,
    images: [hosmanData.seo.ogImage],
  },
};

export default function ContactoPage() {
  return <ContactSection />;
}
