import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AudioProvider } from "@/components/audio/AudioProvider";
import { EntryScreen } from "@/components/audio/EntryScreen";
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
            sonando aunque después naveguemos entre secciones. */}
        <AudioProvider>
          <EntryScreen />
          {children}
        </AudioProvider>
      </body>
    </html>
  );
}
