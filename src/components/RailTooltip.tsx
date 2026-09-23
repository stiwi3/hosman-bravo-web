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
