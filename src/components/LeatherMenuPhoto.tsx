'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';
import type { MenuItem } from './LeatherMenu';

interface LeatherMenuPhotoProps<T extends string> {
  items: readonly MenuItem<T>[];
  current: T;
  onNavigate: (id: T) => void;
}

/* ---------------------------------------------------------------------------
   Variante del menú apoyada en dos fotografías del objeto ya terminado
   (`menu-header.webp`, `menu-body.webp`): cuero, costuras, lomo, anillas y
   solapa vienen del asset, no de CSS. Este componente solo hace dos cosas:
   ensambla las dos piezas en la proporción correcta y superpone la
   navegación real (texto, iconos, estados) sobre la zona de página del
   cuerpo. Es una implementación independiente de `LeatherMenu` — esa sigue
   intacta y es la que vuelve si se descarta esta prueba; ver `page.tsx`.

   Dimensiones nativas de los assets, base de todo el cálculo de proporciones:
     header: 382×151  (bbox opaco casi a sangre, sin margen para sombra)
     body:   413×519  (idem)
   Medido por muestreo del canal alfa y de los picos de luminancia del hilo
   dorado de la costura: el panel de página utilizable —donde caben texto e
   iconos sin invadir costura ni anillas— ocupa, en fracción del lienzo del
   cuerpo, left 45% · right 8% (desde el borde derecho) · top 6.5% · bottom 5%.
--------------------------------------------------------------------------- */

const HEADER_NATIVE = { w: 382, h: 151 };
const BODY_NATIVE = { w: 413, h: 519 };

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3.6 10.4 12 3.6l8.4 6.8V20a.9.9 0 0 1-.9.9h-4.6v-6.2H9.1v6.2H4.5a.9.9 0 0 1-.9-.9v-9.6Z" />,
  show: (
    <>
      <rect x="9.3" y="2.8" width="5.4" height="10.4" rx="2.7" />
      <path d="M6.4 11.2a5.6 5.6 0 0 0 11.2 0M12 16.8V21M9.2 21h5.6" />
    </>
  ),
  playlist: (
    <>
      <path d="M9.4 17.6V6.2l8.6-1.9v11.4" />
      <ellipse cx="7" cy="17.8" rx="2.5" ry="2.2" />
      <ellipse cx="15.6" cy="15.7" rx="2.5" ry="2.2" />
    </>
  ),
  galeria: (
    <>
      <path d="M3.4 8.2a1 1 0 0 1 1-1h2.7l1.4-2.1h7l1.4 2.1h2.7a1 1 0 0 1 1 1v10.4a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1V8.2Z" />
      <circle cx="12" cy="13.2" r="3.5" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="7.6" r="3.9" />
      <path d="M4.9 20.7c0-3.4 3.2-6 7.1-6s7.1 2.6 7.1 6" />
    </>
  ),
  contact: (
    <>
      <rect x="3" y="5.4" width="18" height="13.2" rx="1.4" />
      <path d="m3.6 6.6 8.4 5.6 8.4-5.6" />
    </>
  )
};

export function LeatherMenuPhoto<T extends string>({
  items,
  current,
  onNavigate
}: LeatherMenuPhotoProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Misma lógica de cierre que `LeatherMenu`: fuera del componente o Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const go = (id: T) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative z-50">
      {/* Degradado de latón para los iconos: es tipografía/UI, no material
          de la pieza, así que se mantiene igual que en la versión CSS. */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <linearGradient id="lmp-brass" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="#f0dca6" />
            <stop offset="38%" stopColor="#d4af37" />
            <stop offset="72%" stopColor="#a07d2f" />
            <stop offset="100%" stopColor="#6d5320" />
          </linearGradient>
        </defs>
      </svg>

      {/* CABECERA — la fotografía ya trae logo, nombre y flecha; el botón
          solo aporta el área de toque y el estado accesible. Su ancho sale
          del ancho del cuerpo (ver más abajo) multiplicado por la proporción
          real entre ambos assets (382/413), para que guarden entre sí la
          misma escala con la que se generaron. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Abrir menú de secciones"
        className="relative z-50 block w-[226px] transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]/70 sm:w-[266px]"
      >
        <Image
          src={hosmanData.images.menu.header}
          alt="Hosman Bravo — abrir menú"
          width={HEADER_NATIVE.w}
          height={HEADER_NATIVE.h}
          priority
          className="h-auto w-full select-none"
          style={{ filter: 'drop-shadow(0 14px 22px rgba(0,0,0,0.75))' }}
          draggable={false}
        />
      </button>

      {/* CUERPO — se ancla bajo la cabecera con un ligero solape (misma idea
          que la versión CSS: la cabecera queda delante, el cuerpo empieza
          justo donde ella termina de proyectar su sombra: 86% de su propia
          altura, dejando el 14% restante superpuesto).
          `top` en px explícitos por breakpoint —no en `calc()` a partir del
          ancho del botón— porque ese ancho también cambia en `sm:` y un solo
          valor no puede seguir a los dos: 226×(151/382)×0.86 ≈ 77 en móvil,
          266×(151/382)×0.86 ≈ 90 en escritorio. */}
      <div
        aria-hidden={!open}
        className="pointer-events-none absolute left-0 top-[77px] w-[244px] sm:top-[90px] sm:w-[288px]"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? 'none' : 'translateY(-10px) scale(0.985)',
          transformOrigin: '18% 0%',
          transition: 'opacity 220ms ease-out, transform 420ms cubic-bezier(0.16, 0.84, 0.28, 1)'
        }}
      >
        <div className="relative" style={{ aspectRatio: `${BODY_NATIVE.w} / ${BODY_NATIVE.h}` }}>
          <Image
            src={hosmanData.images.menu.body}
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 640px) 288px, 244px"
            className="select-none object-contain"
            style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.85))' }}
            draggable={false}
          />

          <nav
            role="menu"
            aria-label="Secciones"
            className="absolute"
            style={{
              left: '45%',
              right: '8%',
              top: '6.5%',
              bottom: '5%',
              pointerEvents: open ? 'auto' : 'none'
            }}
          >
            <ul className="flex h-full flex-col justify-between">
              {items.map(({ id, label }) => {
                const active = current === id;
                const isPlaylist = String(id) === 'playlist';
                return (
                  <li key={id}>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => go(id)}
                      aria-current={active ? 'page' : undefined}
                      tabIndex={open ? 0 : -1}
                      className={`group flex w-full items-center gap-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]/60 sm:gap-2.5 ${
                        active ? 'text-[#E4C46B]' : 'text-[#C9A85C]/75 hover:text-[#E4C46B]'
                      }`}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="url(#lmp-brass)"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`h-[14px] w-[14px] shrink-0 transition-opacity duration-200 sm:h-[17px] sm:w-[17px] ${
                          active ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'
                        }`}
                        style={{ filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.85))' }}
                      >
                        {ICONS[id] ?? ICONS.home}
                      </svg>

                      <span className="relative text-[9.5px] font-semibold leading-none tracking-[0.08em] sm:text-[11.5px] sm:tracking-[0.1em]">
                        {label}
                        {active && (
                          <>
                            <span
                              aria-hidden="true"
                              className="absolute -bottom-[4px] left-0 block h-px w-full sm:-bottom-[5px]"
                              style={{
                                background:
                                  'linear-gradient(90deg, rgba(232,199,110,0.85), rgba(212,175,55,0.35) 70%, transparent)'
                              }}
                            />
                            <span
                              aria-hidden="true"
                              className="absolute -bottom-[6px] left-0 block h-px w-full sm:-bottom-[7px]"
                              style={{
                                background:
                                  'linear-gradient(90deg, rgba(150,26,32,0.6), rgba(150,26,32,0.16) 75%, transparent)'
                              }}
                            />
                          </>
                        )}
                      </span>

                      {isPlaylist && (
                        <span className="ml-0.5 shrink-0 rounded-sm bg-[#96141B] px-[3px] py-[1px] text-[6px] font-bold leading-none tracking-wide text-white sm:ml-1 sm:px-[5px] sm:py-[2px] sm:text-[8px]">
                          NUEVO
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
