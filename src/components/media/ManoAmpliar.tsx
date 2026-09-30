/* ---------------------------------------------------------------------------
   Señal de «pulsa para verlo completo» sobre una tarjeta. Solo PRESENTACIÓN:
   no abre nada (el clic lo recibe el botón de la tarjeta, debajo) y no sabe de
   datos. Qué tarjetas la llevan lo decide cada consumidor (hoy, EL SHOW: los
   vídeos cuya tarjeta es una preview); no es una regla del modelo multimedia
   ni del visor.

   Mismo lenguaje que la mano del telón (trazado `pointer` de Lucide, ISC),
   pero independiente de `EntryScreen`: ni código ni estado compartidos.
   Un toque suave cada 2,5 s; con movimiento reducido, quieta.
--------------------------------------------------------------------------- */

const KEYFRAMES = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes hb-mano-ampliar {
    0%, 55%, 100% { transform: translate3d(0, 0, 0) scale(1); }
    20% { transform: translate3d(-6%, -6%, 0) scale(0.86); }
    32% { transform: translate3d(0, 0, 0) scale(1); }
  }
  .hb-mano-ampliar { animation: hb-mano-ampliar 2.5s ease-in-out infinite; }
}
`;

export function ManoAmpliar() {
  return (
    <>
      <style>{KEYFRAMES}</style>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="hb-mano-ampliar pointer-events-none absolute bottom-2.5 left-2.5 z-[6] h-7 w-7 rotate-[-18deg] text-amber-100/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]"
      >
        <path d="M22 14a8 8 0 0 1-8 8" />
        <path d="M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
        <path d="M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1" />
        <path d="M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10" />
        <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    </>
  );
}
