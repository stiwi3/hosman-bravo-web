'use client';

import { useEffect, useState } from 'react';

/* ---------------------------------------------------------------------------
   Indicador de «hay más contenido debajo» (solo GALERÍA y EL SHOW: lo montan
   sus páginas). Solo PRESENTACIÓN: `pointer-events: none`, sin texto ni foco.

   Todo sale de la geometría real del documento, nunca de una cifra fija:
   · hay contenido debajo si el documento mide más que la ventana;
   · se alcanzó el final si el scroll llega al máximo posible.
   Se recalcula al desplazar, al cambiar el tamaño de la ventana (incluida la
   orientación) y cuando el contenido cambia de alto (fotos y vídeos que se
   asientan tarde), con un `ResizeObserver` sobre `body`.

   Al llegar al final queda VISTO para esta visita: ya no vuelve aunque se suba
   o cambie el tamaño. Vive en el estado del componente, que la página remonta
   al entrar otra vez; sin `localStorage` ni nada que persista.

   Centrado abajo. Ciclo de 2,8 s sin llegar nunca a desaparecer: reposo tenue →
   se aviva mientras cae unos 7 px → vuelve despacio al reposo. Con movimiento
   reducido, quieto y a plena presencia mientras corresponda.

   El visor (`MediaViewer`) es un `<dialog>` modal en la capa superior del
   navegador: queda por encima de esto sin coordinación ninguna.
--------------------------------------------------------------------------- */

/** Tolerancia de redondeo (subpíxeles, zoom) al comparar alturas. */
const TOLERANCIA_PX = 2;

const KEYFRAMES = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes hb-scroll-hint {
    0%, 15% { opacity: 0.45; transform: translate3d(0, 0, 0); }
    50% { opacity: 1; transform: translate3d(0, 7px, 0); }
    100% { opacity: 0.45; transform: translate3d(0, 0, 0); }
  }
  .hb-scroll-hint { animation: hb-scroll-hint 2.8s ease-in-out infinite; }
}
`;

type Estado = 'oculto' | 'visible' | 'visto';

export function ScrollHint() {
  const [estado, setEstado] = useState<Estado>('oculto');

  useEffect(() => {
    const doc = document.documentElement;
    let visto = false;

    const medir = () => {
      if (visto) return;
      const maximo = doc.scrollHeight - window.innerHeight;
      if (maximo <= TOLERANCIA_PX) {
        // Sin contenido debajo (todavía): no se muestra, pero tampoco cuenta
        // como visto, por si el contenido crece después.
        setEstado('oculto');
        return;
      }
      if (window.scrollY >= maximo - TOLERANCIA_PX) {
        visto = true;
        setEstado('visto');
        return;
      }
      setEstado('visible');
    };

    medir();
    const observer = new ResizeObserver(medir);
    observer.observe(document.body);
    window.addEventListener('scroll', medir, { passive: true });
    window.addEventListener('resize', medir);
    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', medir);
      window.removeEventListener('resize', medir);
    };
  }, []);

  const visible = estado === 'visible';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+clamp(1rem,2.5svh,1.75rem))] left-1/2 z-40 -translate-x-1/2 transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <style>{KEYFRAMES}</style>
      {/* Mismo trazo que el `Chevron` de los carruseles, apuntando abajo. La
          animación solo corre mientras se muestra y arranca en su reposo. El
          halo oscuro lo separa de las fotos claras sin caja ni botón. */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`h-9 w-9 text-amber-200 [filter:drop-shadow(0_0_6px_rgba(0,0,0,0.75))_drop-shadow(0_1px_2px_rgba(0,0,0,0.9))] ${visible ? 'hb-scroll-hint' : ''}`}
      >
        <path
          d="M5.5 9 12 15.5 18.5 9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
