/** Clases comunes de los controles redondos sobre medios (pausa y flechas). */
export const MEDIA_CONTROL =
  'flex items-center justify-center rounded-full border border-amber-200/30 bg-black/55 text-amber-100/85 backdrop-blur-sm transition-colors duration-200 hover:border-amber-400/70 hover:text-amber-300 focus-visible:border-amber-400 focus-visible:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60';

/**
 * Pausa/reproducción discreta, abajo a la derecha. Cubre además el requisito
 * de poder detener un bucle de más de 5 s.
 */
export function PauseButton({
  enPausa,
  onToggle,
  etiqueta,
}: {
  enPausa: boolean;
  onToggle: () => void;
  /** Qué se pausa, para el lector de pantalla: «el vídeo de Bandido». */
  etiqueta: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={enPausa ? `Reproducir ${etiqueta}` : `Pausar ${etiqueta}`}
      className={`${MEDIA_CONTROL} absolute bottom-2 right-2 z-10 h-8 w-8 opacity-70 hover:opacity-100 focus-visible:opacity-100`}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-3.5 w-3.5">
        {enPausa ? <path d="M8 5.5v13l10.5-6.5z" /> : <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />}
      </svg>
    </button>
  );
}