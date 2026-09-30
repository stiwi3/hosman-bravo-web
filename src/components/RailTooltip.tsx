'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/* Lenguaje común de los dos rails de INICIO (redes y plataformas). El enlace
   lleva `group/rail relative`; el nombre lo sigue anunciando su `aria-label`,
   así que la etiqueta es solo visual. Sustituye al `title`, cuyo retraso lo
   decide el navegador. Los `hover:` de Tailwind v4 ya van dentro de
   `@media (hover: hover)`: en táctil no hay estado activo que se quede pegado. */

/** Añadir al enlace: lo pone delante de sus vecinos mientras está activo. */
export const RAIL_ENLACE_ACTIVO =
  'group/rail relative hover:z-10 focus-visible:z-10';

/** Añadir al glifo: crece dentro del botón, que conserva su caja. */
export const RAIL_GLIFO_ACTIVO =
  'transition-[color,scale] duration-[300ms,180ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/rail:scale-[1.35] group-focus-visible/rail:scale-[1.35] motion-reduce:transition-none';

/**
 * Rótulo de contexto encima del primer botón de un rail («REDES SOCIALES»,
 * «PLATAFORMAS MUSICALES»). Lo pinta el propio GRUPO del rail, así que lo
 * acompaña allí donde vaya.
 *
 * Va `absolute` sobre el grupo (`bottom-full`): no suma alto, así que las
 * fórmulas que reparten la banda entre los botones (`cqh`), las reglas que mide
 * `useGeometriaPeriferica` y la decisión de si caben las ocho plataformas no lo
 * ven. Ocupa el aire que ya había por encima del grupo.
 *
 * Una palabra por línea (`w-min`), centrada sobre la columna de botones. La
 * caja se extiende a los dos lados hasta 2 px del borde de la pantalla; si el
 * texto es más ancho que eso, `safe center` lo deja apoyado en ese tope y crece
 * solo hacia el centro de la escena. Así nunca se sale por el borde ni se
 * recorta. ⚠️ `safe` cae en `start`, que es FÍSICO (la izquierda en LTR) aunque
 * la fila vaya invertida: por eso el rail derecho usa `direction: rtl` en la
 * caja, no `row-reverse`.
 *
 * SE OCULTA SOLO SI NO CABE. El límite es el de la BANDA del rail (el
 * contenedor de tamaño que el rail ya tiene): su borde superior es el borde del
 * menú o del reproductor más `--hb-rail-borde`, el mismo margen de seguridad
 * que respetan los botones. Si el rótulo asomaría por encima de ese borde —
 * alturas críticas, cuando el grupo llena la banda—, queda `visibility:
 * hidden`: conserva su caja para seguir midiéndose y nada se mueve. Arranca
 * oculto hasta la primera medida, para no asomar antes de hidratar.
 *
 * Tipografía de UI funcional (BRAND §2: nunca Cinzel), el mismo registro que el
 * bocadillo «CONTRATA TU SHOW». Tamaño y separación derivados del botón, con
 * suelo de 7 px.
 *
 * @param boton expresión CSS del lado del botón del rail.
 */
export function RailRotulo({
  id,
  children,
  lado,
  boton,
}: {
  id: string;
  children: string;
  lado: 'izquierda' | 'derecha';
  boton: string;
}) {
  const cajaRef = useRef<HTMLDivElement>(null);
  const [cabe, setCabe] = useState(false);

  useLayoutEffect(() => {
    const caja = cajaRef.current;
    if (!caja) return;
    let ancestro = caja.parentElement;
    while (ancestro && getComputedStyle(ancestro).containerType !== 'size') ancestro = ancestro.parentElement;
    if (!ancestro) return;
    const banda = ancestro;
    const grupo = caja.parentElement;
    const medir = () => {
      // Medio píxel de tolerancia por redondeo subpíxel.
      setCabe(caja.getBoundingClientRect().top >= banda.getBoundingClientRect().top - 0.5);
    };
    medir();
    // La posición del rótulo depende del alto de la banda y del grupo (que se
    // centra en ella); al desplazar la escena se mueven juntos.
    const observer = new ResizeObserver(medir);
    observer.observe(banda);
    if (grupo) observer.observe(grupo);
    window.addEventListener('resize', medir);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, []);

  const anclaje =
    lado === 'izquierda'
      ? 'left-[calc(2px-var(--hb-rail-inset))]'
      : 'right-[calc(2px-var(--hb-rail-inset))] [direction:rtl]';
  return (
    <div
      ref={cajaRef}
      className={`pointer-events-none absolute bottom-full flex ${anclaje} [justify-content:safe_center] ${cabe ? '' : 'invisible'}`}
      style={{
        width: `calc(${boton} + 2 * (var(--hb-rail-inset) - 2px))`,
        paddingBottom: `calc(${boton} * 0.16)`,
      }}
    >
      {/* `aria-hidden`: el nombre ya lo da `aria-labelledby` en el grupo; así
          el lector no lo anuncia dos veces. El `pl` compensa el tracking de la
          última letra de cada línea para que el centrado sea óptico. */}
      <p
        id={id}
        aria-hidden="true"
        className="w-min shrink-0 pl-[0.14em] text-center [direction:ltr] font-semibold uppercase leading-[1.2] tracking-[0.14em] text-amber-200/75"
        style={{ fontSize: `max(7px, calc(${boton} * 0.17))` }}
      >
        {children}
      </p>
    </div>
  );
}

export function RailTooltip({ children, hacia }: { children: string; hacia: 'derecha' | 'izquierda' }) {
  const lado =
    hacia === 'derecha'
      ? 'left-full ml-2.5 -translate-x-1'
      : 'right-full mr-2.5 translate-x-1';
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute top-1/2 ${lado} -translate-y-1/2 whitespace-nowrap rounded-md border border-amber-400/45 bg-black/85 px-2 py-[0.3rem] text-[0.72rem] font-medium leading-none tracking-[0.06em] text-amber-100 opacity-0 shadow-[0_4px_14px_-4px_rgba(0,0,0,0.8)] transition-[opacity,translate] duration-150 ease-out group-hover/rail:translate-x-0 group-hover/rail:opacity-100 group-focus-visible/rail:translate-x-0 group-focus-visible/rail:opacity-100 motion-reduce:transition-none`}
    >
      {children}
    </span>
  );
}
