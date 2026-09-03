import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { SiteShell } from "@/components/SiteShell";
import { hosmanData } from "@/data/hosman-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE = "Hosman Bravo | El Rey de los Caballos";
const DESCRIPTION =
  "Sitio oficial de Hosman Bravo, cantautor colombiano de música popular y domador de caballos de alta escuela. Shows en vivo únicos en Colombia. Contrataciones.";

/**
 * Metadatos del sitio.
 *
 * Open Graph no es decoración: el enlace de `/contacto` se manda por WhatsApp
 * a los promotores, y sin esto llega como una URL desnuda, sin título ni
 * imagen. La ficha la compone el servidor de Meta, así que las URL han de ser
 * ABSOLUTAS — de ahí `hosmanData.seo`, que ya incluye el subdirectorio de
 * despliegue. `metadataBase` cubre además las relativas que puedan añadirse.
 */
export const metadata: Metadata = {
  metadataBase: new URL(hosmanData.seo.siteUrl),
  title: {
    default: TITLE,
    // Las secciones ponen solo su nombre y heredan la firma del artista.
    template: "%s | Hosman Bravo",
  },
  description: DESCRIPTION,
  applicationName: "Hosman Bravo",
  authors: [{ name: "Hosman Bravo" }],
  keywords: [
    "Hosman Bravo",
    "música popular colombiana",
    "caballos de alta escuela",
    "doma racional",
    "show ecuestre",
    "contrataciones",
    "Medellín",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Hosman Bravo",
    url: hosmanData.seo.siteUrl,
    title: TITLE,
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
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [hosmanData.seo.ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* El proveedor envuelve a la página entera: así la canción sigue
            sonando aunque después naveguemos entre secciones.
            `SiteShell` es la capa persistente que hay debajo (telón, cabecera,
            hero); solo `children` cambia al navegar. Ver ARCHITECTURE.md §3. */}
        <AudioProvider>
          <SiteShell>{children}</SiteShell>
        </AudioProvider>
      </body>
    </html>
  );
}
