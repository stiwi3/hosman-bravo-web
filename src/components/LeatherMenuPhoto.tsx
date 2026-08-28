'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { hosmanData } from '@/data/hosman-data';
import type { NavItem, SectionId } from '@/data/types';

interface LeatherMenuPhotoProps {
  items: readonly NavItem[];
  /** Escena activa, para el subrayado y el `aria-current`. */
  current: SectionId;
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

/* ---------------------------------------------------------------------------
   Medidas de la navegación escrita sobre el cuero, en `cqw` (1cqw = 1% del
   ancho del cuerpo del menú). Se calibran contra el ancho aprobado en
   2048×1023 —288px— de modo que a ese tamaño dan exactamente los píxeles que
   ya estaban validados; por debajo escalan solas.

   Cada una lleva su propio suelo en px: el menú entero encoge, pero su
   contenido deja de hacerlo en cuanto llega al límite de lectura. Por eso no
   son un `cqw` a secas sino un `max(suelo, cqw)` — sin el suelo, en 1280×591
   el rótulo de sección caía a 8px.
--------------------------------------------------------------------------- */
const NAV = {
  /* 11,5px sobre 288 = 3,99cqw */
  fontSize: 'max(9px, 3.99cqw)',
  /* 17px sobre 288 = 5,90cqw */
  icon: 'max(13px, 5.9cqw)',
  /* 10px sobre 288 = 3,47cqw */
  gap: 'max(6px, 3.47cqw)',
  /* 8px sobre 288 = 2,78cqw */
  badgeFontSize: 'max(6px, 2.78cqw)',
  badgePaddingX: 'max(3px, 1.74cqw)',
  badgePaddingY: 'max(1px, 0.69cqw)',
  /* Los dos filetes bajo la sección activa, a 5px y 7px del texto. */
  underlineNear: 'max(3px, 1.74cqw)',
  underlineFar: 'max(5px, 2.43cqw)'
} as const;

/* `Record<SectionId, …>` y no `Record<string, …>`: si mañana se añade una
   escena y se olvida su icono, TypeScript lo para aquí. Antes la clave era
   `string` y el `?? ICONS.home` de más abajo lo tapaba pintando el icono de
   casa en silencio. */
const ICONS: Record<SectionId, React.ReactNode> = {
  home: <path d="M3.6 10.4 12 3.6l8.4 6.8V20a.9.9 0 0 1-.9.9h-4.6v-6.2H9.1v6.2H4.5a.9.9 0 0 1-.9-.9v-9.6Z" />,
  'el-show': (
    <>
      <rect x="9.3" y="2.8" width="5.4" height="10.4" rx="2.7" />
      <path d="M6.4 11.2a5.6 5.6 0 0 0 11.2 0M12 16.8V21M9.2 21h5.6" />
    </>
  ),
  musica: (
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
  'sobre-mi': (
    <>
      <circle cx="12" cy="7.6" r="3.9" />
      <path d="M4.9 20.7c0-3.4 3.2-6 7.1-6s7.1 2.6 7.1 6" />
    </>
  ),
  contacto: (
    <>
      <rect x="3" y="5.4" width="18" height="13.2" rx="1.4" />
      <path d="m3.6 6.6 8.4 5.6 8.4-5.6" />
    </>
  )
};

export function LeatherMenuPhoto({ items, current }: LeatherMenuPhotoProps) {
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

  /* La navegación la hace el propio `<Link>`; aquí solo queda recoger la
     solapa. Antes este componente avisaba al padre con `onNavigate` porque la
     sección era estado de React; ahora es una ruta y el padre no necesita
     enterarse. */
  const closeMenu = () => setOpen(false);

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
          solo aporta el área de toque y el estado accesible.

          Su ancho es el token `--hb-menu-w` del sistema fluido: es la medida
          de la que cuelga todo lo demás de esta pieza (el alto de la propia
          cabecera, la posición y el ancho del cuerpo) y, fuera de aquí, el
          alto de la cabecera fija y el espacio superior de las secciones con
          scroll. Antes eran dos anchos por breakpoint (226/266px) y cada
          medida derivada estaba calculada a mano para cada uno de los dos. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Abrir menú de secciones"
        className="relative z-50 block w-[var(--hb-menu-w)] transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]/70"
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

          Ahora `top` y `width` se DERIVAN del ancho de la cabecera con
          `calc()`, que es lo que antes no se podía hacer: al haber dos anchos
          por breakpoint (226/266px) un solo `calc()` no podía seguir a los
          dos, y hubo que escribir los dos resultados a mano (77px y 90px).
          Con un ancho continuo el cálculo vuelve a ser posible y deja de
          existir la pareja de números mágicos:
            top   = ancho × (151/382) × 0,86  = ancho × 0,340
            ancho = ancho × 1,082   (relación medida entre ambos assets)
          Comprobado contra los valores anteriores: con 266px de cabecera da
          90,4px y 287,8px — los mismos 90/288 de antes. */}
      <div
        aria-hidden={!open}
        className="pointer-events-none absolute left-0 top-[calc(var(--hb-menu-w)*0.34)] w-[calc(var(--hb-menu-w)*1.082)]"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? 'none' : 'translateY(-10px) scale(0.985)',
          transformOrigin: '18% 0%',
          transition: 'opacity 220ms ease-out, transform 420ms cubic-bezier(0.16, 0.84, 0.28, 1)'
        }}
      >
        {/* `container-type: inline-size` convierte el ancho de esta caja en la
            unidad de medida de todo lo que va escrito encima del cuero
            (`1cqw` = 1% de este ancho). Es el mismo recurso que ya usan las
            entradas de `NextShowTicket`, y por la misma razón: el texto queda
            anclado a la fotografía, así que ambos escalan juntos y no hay que
            recalibrar la posición del texto sobre el asset a cada tamaño. */}
        <div
          className="relative [container-type:inline-size]"
          style={{ aspectRatio: `${BODY_NATIVE.w} / ${BODY_NATIVE.h}` }}
        >
          <Image
            src={hosmanData.images.menu.body}
            alt=""
            aria-hidden="true"
            fill
            sizes="288px"
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
              {items.map(({ id, label, href, badge }) => {
                const active = current === id;
                return (
                  <li key={id}>
                    {/* `<Link>` y no `<button>`: son rutas de verdad, así que
                        tienen que funcionar con clic central, «abrir en pestaña
                        nueva» y los botones de atrás/adelante. Las clases y el
                        `tabIndex` son exactamente los de antes. `next/link`
                        aplica solo el `basePath`: `href` va sin `${bp}`. */}
                    <Link
                      href={href}
                      role="menuitem"
                      onClick={closeMenu}
                      aria-current={active ? 'page' : undefined}
                      tabIndex={open ? 0 : -1}
                      className={`group flex w-full items-center text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]/60 ${
                        active ? 'text-[#E4C46B]' : 'text-[#C9A85C]/75 hover:text-[#E4C46B]'
                      }`}
                      style={{ gap: NAV.gap }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="url(#lmp-brass)"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className={`shrink-0 transition-opacity duration-200 ${
                          active ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'
                        }`}
                        style={{
                          width: NAV.icon,
                          height: NAV.icon,
                          filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.85))'
                        }}
                      >
                        {ICONS[id]}
                      </svg>

                      <span
                        className="relative font-semibold leading-none tracking-[0.1em]"
                        style={{ fontSize: NAV.fontSize }}
                      >
                        {label}
                        {active && (
                          <>
                            <span
                              aria-hidden="true"
                              className="absolute left-0 block h-px w-full"
                              style={{
                                bottom: `calc(-1 * ${NAV.underlineNear})`,
                                background:
                                  'linear-gradient(90deg, rgba(232,199,110,0.85), rgba(212,175,55,0.35) 70%, transparent)'
                              }}
                            />
                            <span
                              aria-hidden="true"
                              className="absolute left-0 block h-px w-full"
                              style={{
                                bottom: `calc(-1 * ${NAV.underlineFar})`,
                                background:
                                  'linear-gradient(90deg, rgba(150,26,32,0.6), rgba(150,26,32,0.16) 75%, transparent)'
                              }}
                            />
                          </>
                        )}
                      </span>

                      {/* El distintivo lo decide `NAV_ITEMS`, no este
                          componente: antes era un `String(id) === 'playlist'`
                          cableado aquí dentro. */}
                      {badge && (
                        <span
                          className="shrink-0 rounded-sm bg-[#96141B] font-bold leading-none tracking-wide text-white"
                          style={{
                            fontSize: NAV.badgeFontSize,
                            paddingInline: NAV.badgePaddingX,
                            paddingBlock: NAV.badgePaddingY
                          }}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
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
