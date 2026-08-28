import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { SiteShell } from "@/components/SiteShell";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hosman Bravo | El Rey de los Caballos",
  description:
    "Sitio oficial de Hosman Bravo, cantautor colombiano de música popular y domador de caballos de alta escuela. Shows en vivo únicos en Colombia. Contrataciones.",
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
