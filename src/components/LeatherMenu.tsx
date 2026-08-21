'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { hosmanData } from '@/data/hosman-data';

export interface MenuItem<T extends string> {
  id: T;
  label: string;
}

interface LeatherMenuProps<T extends string> {
  items: readonly MenuItem<T>[];
  current: T;
  onNavigate: (id: T) => void;
}

/* ---------------------------------------------------------------------------
   MATERIALES

   El objeto se construye con cuatro piezas de cuero independientes —cuerpo,
   lomo, cabecera y solapa—, cada una con su propio canto, su iluminación y su
   costura. Lo que las hace leerse como piezas separadas y no como un solo
   rectángulo son las sombras de contacto: cada pieza proyecta sobre la que
   tiene detrás.
--------------------------------------------------------------------------- */

/** Ruta del grano fotográfico, expuesta a CSS para las capas `.lm-grain`. */
const LEATHER_VAR = {
  '--lm-leather': `url(${hosmanData.images.textures.blackLeather})`,
} as React.CSSProperties;

/** Base del cuero: charcoal muy oscuro con caída de luz diagonal. */
const LEATHER_BASE = 'linear-gradient(152deg, #1c1613 0%, #100c0b 46%, #0a0707 100%)';

/** El lomo va un punto más oscuro: es lo que lo empuja visualmente al fondo. */
const LEATHER_SPINE = 'linear-gradient(152deg, #150f0d 0%, #0b0808 50%, #070505 100%)';

/**
 * Canto de la pieza. La línea clara superior es el borde que recibe la luz; la
 * oscura inferior, el grosor del cuero visto de perfil. El vuelo exterior
 * separa el objeto del hero.
 */
const EDGE = [
  'inset 0 1px 0 rgba(238,228,210,0.11)',
  'inset 0 -2px 2px rgba(0,0,0,0.9)',
  'inset 2px 0 3px -2px rgba(0,0,0,0.7)',
  'inset -2px 0 3px -2px rgba(0,0,0,0.7)',
  // Filo del canto derecho. Sin él la pieza se funde con el negro del hero y
  // pierde el contorno, que es justo lo que la separa del fondo.
  'inset -1px 0 0 rgba(238,228,210,0.07)',
  '0 0 0 1px rgba(238,228,210,0.045)',
].join(', ');

/** Sombra que el objeto proyecta sobre el hero. Difusa y baja, como peso. */
const DROP = '0 18px 34px -12px rgba(0,0,0,0.92), 0 4px 10px -4px rgba(0,0,0,0.8)';

/**
 * Anilla metálica.
 *
 * Un cilindro visto de lado no tiene un solo realce: tiene el realce especular
 * estrecho por encima del eje, el rebote de luz difusa cerca del borde inferior
 * y sombra propia en los dos cantos. Ese segundo realce inferior es lo que
 * separa un metal redondo de una barra pintada de dorado. Los extremos se
 * oscurecen aparte, porque la anilla entra en el cuero y no está iluminada por
 * igual a lo largo.
 */
const BRASS = [
  'linear-gradient(90deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.12) 14%, rgba(0,0,0,0) 34%, rgba(0,0,0,0.1) 72%, rgba(0,0,0,0.6) 100%)',
  'linear-gradient(180deg, #1d1506 0%, #6b5220 9%, #b98f3f 22%, #f2e2ae 33%, #fdf6dd 39%, #d8b25d 48%, #8a6a28 62%, #4a3812 74%, #9c7c37 86%, #c9a44f 92%, #3a2b0e 100%)',
].join(', ');

/* ---------------------------------------------------------------------------
   ICONOS

   Trazo real en SVG, con un degradado de latón compartido. El estado no cambia
   el degradado sino la opacidad del icono: así el metal conserva su transición
   de tonos en cualquier estado y sigue habiendo respuesta al hover.
--------------------------------------------------------------------------- */

const ICONS: Record<string, React.ReactNode> = {
  home: (
    <>
      <path d="M3.6 10.4 12 3.6l8.4 6.8V20a.9.9 0 0 1-.9.9h-4.6v-6.2H9.1v6.2H4.5a.9.9 0 0 1-.9-.9v-9.6Z" />
    </>
  ),
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
  ),
};

/**
 * Costura perimetral.
 *
 * Va en SVG y no con `border: dashed` porque el borde CSS no deja elegir el
 * largo ni la separación de la puntada —y Chrome además redondea su grosor a
 * menos de un píxel, con lo que el hilo desaparece—. Se dibujan dos trazos:
 * el oscuro, desplazado un píxel hacia abajo, es el surco que la aguja deja en
 * el cuero; el dorado apagado, encima, es el hilo. Esa diferencia de un píxel
 * es lo que hace que la costura se lea hundida y no pintada.
 *
 * El SVG se coloca justo sobre la línea media del trazo, así que el `rect` al
 * 100% no necesita `calc()` y se comporta igual en todos los navegadores. Va
 * dentro de un `span`: un `<svg>` es un elemento reemplazado y con `width:auto`
 * se queda en su tamaño intrínseco de 300×150 en vez de estirarse al `inset`.
 */
function Stitch({ inset, radius }: { inset: number; radius: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute"
      style={{ inset }}
    >
      <svg className="block h-full w-full" style={{ overflow: 'visible' }}>
        <rect
          x="0"
          y="1"
          width="100%"
          height="100%"
          rx={radius}
          fill="none"
          stroke="rgba(0,0,0,0.7)"
          strokeWidth="1.5"
          strokeDasharray="3.5 3.8"
        />
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx={radius}
          fill="none"
          stroke="rgba(172,134,72,0.5)"
          strokeWidth="1.2"
          strokeDasharray="3.5 3.8"
        />
      </svg>
    </span>
  );
}

/**
 * Superficie de cuero de una pieza.
 *
 * `pos` elige qué zona de la fotografía usa cada pieza. No es un detalle: la
 * foto tiene su propia iluminación y sus propias arrugas, así que desplazarla
 * es lo que hace que las cuatro piezas no compartan el mismo poro ni el mismo
 * brillo. Ese modelado sale del material, no de un degradado encima.
 */
function LeatherSurface({
  pos,
  brightness,
  bevel = 7,
  bevelPos = '-700px -80px',
  bevelBrightness = 1.5,
}: {
  pos: string;
  brightness: number;
  bevel?: number;
  bevelPos?: string;
  bevelBrightness?: number;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        className="lm-grain"
        style={
          {
            '--lm-tex-pos': pos,
            '--lm-tex-brightness': brightness,
          } as React.CSSProperties
        }
      />
      <span
        aria-hidden="true"
        className="lm-bevel"
        style={
          {
            '--lm-bevel-width': `${bevel}px`,
            '--lm-bevel-pos': bevelPos,
            '--lm-bevel-brightness': bevelBrightness,
          } as React.CSSProperties
        }
      />
    </>
  );
}

/**
 * Navegación principal presentada como una agenda ecuestre de cuero negro.
 *
 * La apertura se resuelve solo con `transform` y `opacity`, así que la compone
 * la GPU y no provoca reflujo. Ninguna pieza es una imagen: los textos, iconos
 * y estados siguen siendo elementos reales.
 */
export function LeatherMenu<T extends string>({
  items,
  current,
  onNavigate,
}: LeatherMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Cerrar al pulsar fuera o con Escape.
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
    <div
      ref={rootRef}
      style={LEATHER_VAR}
      className="relative z-50"
    >
      {/* Degradado de latón, compartido por los seis iconos. */}
      <svg width="0" height="0" aria-hidden="true" className="absolute">
        <defs>
          <linearGradient id="lm-brass" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="#f0dca6" />
            <stop offset="38%" stopColor="#d4af37" />
            <stop offset="72%" stopColor="#a07d2f" />
            <stop offset="100%" stopColor="#6d5320" />
          </linearGradient>
        </defs>
      </svg>

      {/* ------------------------------------------------------------------
          OBJETO ABIERTO

          Se ancla bajo la cabecera y desplazado a la derecha, de modo que el
          lomo asome por debajo de ella. El orden de apilado reproduce el de la
          referencia: solapa y lomo detrás, cuerpo delante, anillas cosiendo
          ambos, y la cabecera por encima de todo.
      ------------------------------------------------------------------- */}
      <div
        aria-hidden={!open}
        className="pointer-events-none absolute left-[18px] top-[calc(100%-14px)] w-[272px] sm:left-[26px] sm:w-[300px]"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? 'none' : 'translateY(-10px) scale(0.985)',
          transformOrigin: '20% 0%',
          transition:
            'opacity 220ms ease-out, transform 420ms cubic-bezier(0.16, 0.84, 0.28, 1)',
        }}
      >
        {/* SOLAPA DE CIERRE — sale lateralmente por detrás del lomo. */}
        <span
          aria-hidden="true"
          className="absolute left-[-26px] top-[44%] z-10 h-[52px] w-[76px] overflow-hidden rounded-[10px] sm:left-[-32px] sm:h-[58px] sm:w-[88px]"
          style={{
            backgroundImage: LEATHER_BASE,
            boxShadow: `${EDGE}, 0 8px 14px -6px rgba(0,0,0,0.9)`,
          }}
        >
          <LeatherSurface
            pos="-260px -700px"
            brightness={1.0}
            bevel={6}
            bevelPos="-60px -900px"
            bevelBrightness={1.15}
          />
          <Stitch inset={5} radius={6} />
          {/* Remache metálico. */}
          <span
            className="absolute left-[11px] top-1/2 h-[15px] w-[15px] -translate-y-1/2 rounded-full sm:h-[17px] sm:w-[17px]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 34% 28%, #f6e9c2 0%, #cfa94f 34%, #8a6a28 66%, #3a2b0f 100%)',
              boxShadow:
                'inset 0 -1px 2px rgba(0,0,0,0.75), 0 2px 4px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.6)',
            }}
          />
        </span>

        {/* LOMO — pieza independiente, un poco más alta que el cuerpo y
            parcialmente cubierta por él. */}
        <span
          aria-hidden="true"
          className="absolute bottom-[-7px] left-0 top-[-7px] z-20 w-[50px] rounded-[13px] sm:w-[58px]"
          style={{
            backgroundImage: LEATHER_SPINE,
            boxShadow: `${EDGE}, ${DROP}`,
          }}
        >
          {/* Canto ancho: en una pieza tan estrecha el bisel ocupa casi todo el
              ancho, y esa curvatura continua es lo que la lee como un lomo
              cilíndrico en vez de como otra tira plana. */}
          <LeatherSurface
            pos="-1180px -700px"
            brightness={0.9}
            bevel={13}
            bevelPos="-320px -820px"
            bevelBrightness={1.05}
          />
          <Stitch inset={6} radius={8} />
        </span>

        {/* CUERPO — la pieza principal, delante del lomo y con su sombra de
            contacto proyectada sobre él por el flanco izquierdo. */}
        <div
          role="menu"
          aria-label="Secciones"
          className="relative z-30 ml-[32px] rounded-[13px] py-4 sm:ml-[38px] sm:py-5"
          style={{
            backgroundImage: LEATHER_BASE,
            boxShadow: `${EDGE}, -12px 0 18px -8px rgba(0,0,0,1), -4px 0 6px -3px rgba(0,0,0,0.95), ${DROP}`,
            pointerEvents: open ? 'auto' : 'none',
          }}
        >
          <LeatherSurface
            pos="-880px -600px"
            brightness={1.0}
            bevel={8}
            bevelPos="-1080px -300px"
            bevelBrightness={1.1}
          />
          <Stitch inset={7} radius={7} />

          <ul className="relative pl-[26px] pr-3 sm:pl-[30px] sm:pr-4">
            {items.map(({ id, label }, index) => {
              const active = current === id;
              return (
                <li key={id} className="relative">
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className="block h-px bg-gradient-to-r from-[#D4AF37]/14 via-[#D4AF37]/9 to-transparent"
                    />
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => go(id)}
                    aria-current={active ? 'page' : undefined}
                    tabIndex={open ? 0 : -1}
                    className={`group flex w-full items-center gap-3 rounded px-1.5 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]/60 sm:gap-3.5 sm:py-[18px] ${
                      active ? 'text-[#E4C46B]' : 'text-[#C9A85C]/70 hover:text-[#E4C46B]'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="url(#lm-brass)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className={`h-[19px] w-[19px] shrink-0 transition-opacity duration-200 sm:h-5 sm:w-5 ${
                        active ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'
                      }`}
                      style={{ filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.85))' }}
                    >
                      {ICONS[id] ?? ICONS.home}
                    </svg>

                    <span className="relative text-[12.5px] font-semibold tracking-[0.13em] sm:text-[13.5px]">
                      {label}
                      {/* Subrayado de la sección activa: filo dorado y, justo
                          debajo, un hilo rojo apenas perceptible. */}
                      {active && (
                        <>
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-[5px] left-0 block h-px w-full"
                            style={{
                              background:
                                'linear-gradient(90deg, rgba(232,199,110,0.85), rgba(212,175,55,0.35) 70%, transparent)',
                            }}
                          />
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-[7px] left-0 block h-px w-full"
                            style={{
                              background:
                                'linear-gradient(90deg, rgba(150,26,32,0.6), rgba(150,26,32,0.16) 75%, transparent)',
                            }}
                          />
                        </>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ANILLAS — cosen lomo y cuerpo: nacen dentro del lomo y terminan
            dentro del cuerpo, con su sombra de contacto sobre ambos. En móvil
            son cuatro, para no apelmazar la pieza. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-[24px] z-40 flex flex-col justify-evenly py-7 sm:left-[28px]"
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`block h-[7px] w-[34px] rounded-full sm:h-[8px] sm:w-[40px] ${
                i === 1 || i === 4 ? 'hidden sm:block' : ''
              }`}
              style={{
                backgroundImage: BRASS,
                boxShadow:
                  'inset 0 0 0 0.5px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.9), 0 1px 0 rgba(0,0,0,0.6)',
              }}
            />
          ))}
        </span>
      </div>

      {/* ------------------------------------------------------------------
          CABECERA

          Pieza de cuero propia, por delante del resto y proyectando su sombra
          sobre el cuerpo del objeto.
      ------------------------------------------------------------------- */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Abrir menú de secciones"
        style={{
          backgroundImage: LEATHER_BASE,
          boxShadow: `${EDGE}, ${DROP}`,
        }}
        className="relative z-50 flex items-center gap-3 rounded-[14px] px-4 py-3 transition-shadow duration-300 hover:shadow-[0_20px_38px_-12px_rgba(0,0,0,0.95)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#D4AF37]/70 sm:gap-4 sm:px-5 sm:py-3.5"
      >
        <LeatherSurface
          pos="-660px -700px"
          brightness={1.05}
          bevel={9}
          bevelPos="-880px -640px"
          bevelBrightness={1.2}
        />
        <Stitch inset={7} radius={8} />

        {/* Isotipo tallado en cuero: es una pieza más de material, no un
            emblema dorado flotando sobre la superficie. Por eso no lleva el
            troquelado de luz/sombra que sí necesita el isotipo dorado plano —
            aquí el relieve ya viene grabado en la propia imagen. */}
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12">
          <Image
            src={hosmanData.images.logo.isotipoCuero}
            alt=""
            aria-hidden="true"
            width={100}
            height={105}
            className="h-9 w-9 object-contain sm:h-11 sm:w-11"
          />
        </span>

        {/* El nombre se mantiene también en móvil: sin él la cabecera encoge a
            un botón cuadrado y deja de leerse como una pieza de cuero. */}
        <span className="relative block text-left leading-[1.05]">
          <span
            className="block font-serif text-[16px] tracking-[0.1em] text-[#E4C46B] sm:text-[19px]"
            style={{ textShadow: '0 1px 0 rgba(0,0,0,0.9)' }}
          >
            HOSMAN
          </span>
          <span
            className="block font-serif text-[16px] tracking-[0.1em] text-[#C9A85C] sm:text-[19px]"
            style={{ textShadow: '0 1px 0 rgba(0,0,0,0.9)' }}
          >
            BRAVO
          </span>
        </span>

        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={`relative h-4 w-4 shrink-0 text-[#C9A85C] transition-transform duration-[420ms] ease-out ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
