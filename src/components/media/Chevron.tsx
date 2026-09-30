/** Flecha de los carruseles y del visor (CABALLOS, `MediaViewer`). */
export function Chevron({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[45%] w-[45%]">
      <path
        d={direccion === 'izquierda' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'}
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
