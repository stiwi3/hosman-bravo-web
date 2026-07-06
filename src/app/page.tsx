'use client';

import { useState } from 'react';
import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';

type PageType = 'home' | 'galeria' | 'about' | 'contact';

const navItems: { id: PageType; label: string }[] = [
  { id: 'home', label: 'INICIO' },
  { id: 'galeria', label: 'GALERÍA' },
  { id: 'about', label: 'SOBRE MÍ' },
  { id: 'contact', label: 'CONTACTO' }
];

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>('home');

  const data = hosmanData;

  return (
    <main className="bg-black text-white font-sans overflow-x-hidden min-h-screen">
      {/* HEADER FIJO */}
      <header className="fixed top-0 left-0 right-0 flex justify-between items-start p-4 md:p-6 z-50 bg-gradient-to-b from-black/80 to-transparent">
        <button
          onClick={() => setCurrentPage('home')}
          className="flex items-center gap-3 cursor-pointer"
        >
          <Image
            src={data.images.logo.isotipoDorado}
            alt="Hosman Bravo logo"
            width={52}
            height={52}
            className="w-12 h-12 md:w-14 md:h-14 object-contain"
          />
          <div className="text-left text-sm leading-tight tracking-wide hidden sm:block">
            <div className="font-black text-base">HOSMAN</div>
            <div className="font-black text-base text-amber-400">BRAVO</div>
          </div>
        </button>

        {/* NAVEGACIÓN CENTRAL */}
        <nav className="absolute left-1/2 -translate-x-1/2 top-8 text-xs tracking-widest space-x-3 md:space-x-5">
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setCurrentPage(id)}
              className={`hover:text-amber-400 transition ${currentPage === id ? 'text-amber-400' : ''}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* TOP RIGHT INFO */}
        <div className="text-right text-xs tracking-tight hidden md:block">
          <div className="mb-1 text-gray-400">MÚSICA POPULAR · ALTA ESCUELA</div>
          <a
            href={data.socialLinks.spotify}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-bold text-amber-400 hover:text-amber-300 transition text-xs block"
          >
            ESCÚCHAME EN SPOTIFY
          </a>
          <div className="flex gap-2 justify-end mt-3">
            {[
              { href: data.socialLinks.instagram, label: 'IG' },
              { href: data.socialLinks.tiktok, label: 'TK' },
              { href: data.socialLinks.youtube, label: 'YT' }
            ].map(({ href, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-xs hover:border-amber-400 hover:text-amber-400 transition"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* HOME PAGE */}
      {currentPage === 'home' && (
        <>
          <section className="relative min-h-screen flex items-center justify-center">
            {/* Foto de fondo del show */}
            <Image
              src={data.images.hero}
              alt="Hosman Bravo en show en vivo"
              fill
              priority
              className="object-cover object-[50%_22%] opacity-50"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/60"></div>

            {/* HEADLINE */}
            <div className="relative z-10 text-center px-4 pt-16">
              <h1 className="text-6xl sm:text-8xl lg:text-9xl font-black leading-none tracking-wide text-red-600 mix-blend-screen drop-shadow-lg">
                HOSMAN<br />BRAVO
              </h1>
              <p className="text-sm md:text-base tracking-[0.4em] mt-6 text-amber-400 font-bold">
                {data.artist.tagline.toUpperCase()}
              </p>
              <p className="text-xs tracking-widest mt-2 text-gray-300">
                MÚSICA POPULAR · DOMA DE ALTA ESCUELA · SHOWS EN VIVO
              </p>
            </div>

            {/* ICONOS SOCIALES ABAJO IZQUIERDA */}
            <div className="absolute bottom-6 left-6 flex gap-2 z-20">
              {[
                { href: data.socialLinks.tiktok, label: 'TT' },
                { href: data.socialLinks.instagram, label: 'IG' },
                { href: data.socialLinks.youtube, label: 'YT' },
                { href: data.socialLinks.facebook, label: 'FB' }
              ].map(({ href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-xs hover:border-amber-400 hover:text-amber-400 transition bg-black/40"
                >
                  {label}
                </a>
              ))}
            </div>

            {/* BADGE DERECHA */}
            <button
              onClick={() => setCurrentPage('contact')}
              className="absolute bottom-6 right-6 z-20 group"
            >
              <div className="w-28 h-28 rounded-full border-2 border-amber-400 flex items-center justify-center text-xs text-center bg-black/50 backdrop-blur tracking-widest font-bold group-hover:bg-amber-400 group-hover:text-black transition">
                CONTRATA<br />TU SHOW
              </div>
            </button>
          </section>

          {/* SECCIÓN EL SHOW */}
          <section className="py-20 px-6 max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-3 text-center">
              EL <span className="text-red-600">SHOW</span>
            </h2>
            <p className="text-sm text-gray-400 text-center max-w-2xl mx-auto mb-12">
              Música en vivo y caballos de alta escuela en un mismo escenario.
              Un espectáculo único en Colombia que tu público nunca olvidará.
            </p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {data.images.shows.map((src, i) => (
                <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-lg group">
                  <Image
                    src={src}
                    alt={`Show de Hosman Bravo ${i + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
              ))}
            </div>
            <div className="text-center mt-10">
              <button
                onClick={() => setCurrentPage('galeria')}
                className="border border-amber-400 text-amber-400 px-8 py-3 text-xs font-black tracking-widest hover:bg-amber-400 hover:text-black transition"
              >
                VER GALERÍA COMPLETA
              </button>
            </div>
          </section>

          {/* SECCIÓN CABALLOS */}
          <section className="py-20 px-6 bg-gradient-to-b from-black via-red-950/20 to-black">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-black tracking-wide mb-12 text-center">
                EL <span className="text-amber-400">ELENCO</span> ECUESTRE
              </h2>
              <div className="grid md:grid-cols-3 gap-6">
                {data.horses.map((horse) => (
                  <div
                    key={horse.name}
                    className="border border-white/10 rounded-lg p-8 text-center hover:border-amber-400/50 transition bg-black/40"
                  >
                    <h3 className="text-2xl font-black text-amber-400 mb-2">{horse.name}</h3>
                    <p className="text-xs tracking-widest text-gray-500 mb-4">{horse.description.toUpperCase()}</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{horse.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* GALERÍA PAGE */}
      {currentPage === 'galeria' && (
        <section className="relative min-h-screen pt-32 pb-16 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-wide">
              GALERÍA
            </h2>
            <p className="text-sm text-gray-400 mb-10">
              El show, los caballos y la música de Hosman Bravo.
            </p>
            <div className="columns-2 md:columns-3 gap-3 space-y-3">
              {[...data.images.shows, ...data.images.galeria].map((src, i) => (
                <div key={src} className="relative overflow-hidden rounded-lg break-inside-avoid group">
                  <Image
                    src={src}
                    alt={`Hosman Bravo galería ${i + 1}`}
                    width={800}
                    height={1000}
                    className="w-full h-auto object-cover group-hover:scale-105 transition duration-500"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ABOUT PAGE */}
      {currentPage === 'about' && (
        <section className="relative min-h-screen pt-32 pb-16 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Foto */}
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
                <Image
                  src={data.images.about}
                  alt="Hosman Bravo con Don Juan"
                  fill
                  className="object-cover"
                />
              </div>

              {/* Info */}
              <div className="relative">
                <div className="absolute -top-16 -left-5 text-[200px] font-black text-white/5 z-0 pointer-events-none select-none">
                  H
                </div>
                <div className="relative z-10 space-y-8">
                  <h2 className="text-3xl font-black tracking-wide">
                    SOBRE <span className="text-amber-400">HOSMAN BRAVO</span>
                  </h2>

                  <p className="text-sm leading-relaxed text-gray-300">{data.artist.bio}</p>

                  <div>
                    <h3 className="text-sm font-black tracking-widest mb-3 text-red-600">ORIGEN</h3>
                    <p className="text-sm leading-relaxed text-gray-400">
                      Nacido en {data.artist.birthPlace}, Colombia. Radicado actualmente en {data.artist.currentCity}.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-black tracking-widest mb-3 text-red-600">MÚSICA</h3>
                    <ul className="text-sm leading-relaxed text-gray-400 space-y-1">
                      {data.songs.map((song) => (
                        <li key={song.title}>
                          <span className="font-bold text-white">{song.title}</span>{' '}
                          <span className="text-gray-600">({song.year})</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-black tracking-widest mb-4 text-red-600">SÍGUEME</h3>
                    <div className="flex gap-2">
                      {[
                        { href: data.socialLinks.tiktok, label: 'TK' },
                        { href: data.socialLinks.instagram, label: 'IG' },
                        { href: data.socialLinks.youtube, label: 'YT' },
                        { href: data.socialLinks.spotify, label: 'SP' },
                        { href: data.socialLinks.facebook, label: 'FB' }
                      ].map(({ href, label }) => (
                        <a
                          key={label}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-xs hover:border-amber-400 hover:text-amber-400 transition"
                        >
                          {label}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4">
                    <h3 className="text-sm font-black tracking-widest mb-2 text-red-600">CONTACTO</h3>
                    <a href={`mailto:${data.contact.email}`} className="text-sm text-gray-400 hover:text-amber-400 transition">
                      {data.contact.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CONTACT PAGE */}
      {currentPage === 'contact' && (
        <section className="relative min-h-screen pt-32 pb-16 px-6">
          <div className="max-w-xl mx-auto">
            <div className="flex justify-center mb-8">
              <Image
                src={data.images.logo.imagotipoDorado}
                alt="Hosman Bravo"
                width={140}
                height={150}
                className="w-32 h-auto object-contain"
              />
            </div>
            <h2 className="text-3xl font-black mb-12 tracking-wide text-center">CONTRATACIONES</h2>

            <form className="space-y-6">
              {[
                { num: '01', label: 'NOMBRE COMPLETO', type: 'text', placeholder: 'Tu nombre' },
                { num: '02', label: 'EMAIL', type: 'email', placeholder: 'tu@email.com' },
                { num: '03', label: 'TIPO DE EVENTO', type: 'text', placeholder: 'Feria, discoteca, evento privado...' },
                { num: '04', label: 'MENSAJE', type: 'textarea', placeholder: 'Ciudad, fecha y detalles del evento...' }
              ].map(({ num, label, type, placeholder }) => (
                <div key={num} className="flex gap-6 items-baseline border-b border-white/25 pb-3">
                  <span className="text-xs opacity-60 w-6">{num}.</span>
                  <label className="text-sm font-black tracking-wide w-36">{label}</label>
                  {type === 'textarea' ? (
                    <textarea
                      placeholder={placeholder}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-sans resize-none"
                      rows={3}
                    ></textarea>
                  ) : (
                    <input
                      type={type}
                      placeholder={placeholder}
                      className="flex-1 bg-transparent border-none outline-none text-sm font-sans"
                    />
                  )}
                </div>
              ))}

              <button
                type="button"
                className="w-full bg-amber-400 text-black py-4 font-black tracking-widest text-sm mt-8 hover:bg-red-600 hover:text-white transition relative"
              >
                <span className="absolute left-3 top-1/2 -translate-y-1/2">•</span>
                ENVIAR
                <span className="absolute right-3 top-1/2 -translate-y-1/2">•</span>
              </button>
            </form>

            <div className="mt-12 p-6 bg-amber-400/5 border border-amber-400/30 rounded-lg text-center">
              <p className="text-xs text-gray-400 mb-2">O contacta directamente:</p>
              <p className="text-sm font-bold text-amber-400">{data.contact.email}</p>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 px-6 text-center">
        <Image
          src={data.images.logo.logotipoDorado}
          alt="Hosman Bravo"
          width={160}
          height={40}
          className="mx-auto mb-4 w-40 h-auto object-contain"
        />
        <p className="text-xs text-gray-600 tracking-widest">
          © {new Date().getFullYear()} HOSMAN BRAVO · EL REY DE LOS CABALLOS · MEDELLÍN, COLOMBIA
        </p>
      </footer>
    </main>
  );
}
