'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { hosmanData } from '@/data/hosman-data';
import { useScrollLock } from '@/hooks/useScrollLock';
import { NextShowTicket } from '../NextShowTicket';
import { PromoTicket } from '../PromoTicket';
import type { ShowEvent } from '@/data/types';

/* ---------------------------------------------------------------------------
   PRÓXIMOS EVENTOS EN MÓVIL — tirador + hoja inferior.

   En móvil no cabe (ni interesa) el bloque de escritorio permanentemente
   abierto: INICIO tiene que seguir siendo UNA pantalla. Lo que queda a la
   vista es una franja discreta bajo el branding, y los eventos suben desde
   abajo por encima de la escena.

   POR QUÉ `<dialog>` Y NO UN DIV POSICIONADO
   La hoja debe cubrir la escena sin que el documento gane alto, atrapar el
   foco mientras está abierta, devolverlo al tirador al cerrarse, cerrarse con
   Escape y dejar inerte lo que hay detrás. `showModal()` da las cinco cosas
   sin escribir ninguna, y la capa superior no participa del flujo, así que el
   alto del documento no cambia — que era el requisito.

   UN SOLO ESTADO DE APERTURA
   `abierto` es la única verdad. Las tres vías de apertura (tap, deslizamiento
   y teclado sobre el mismo `<button>`) escriben ahí, y el evento `close` del
   propio diálogo —que dispara también con Escape y con el clic en el fondo— lo
   devuelve a `false`. No hay un segundo estado que pueda desincronizarse.
--------------------------------------------------------------------------- */

/** Píxeles de arrastre vertical a partir de los cuales el gesto cuenta. */
const UMBRAL_GESTO = 36;

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <path
        d="m6 15 6-6 6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShowsSheet({
  events = hosmanData.upcomingShows,
  onContact,
  className
}: {
  events?: readonly ShowEvent[];
  onContact: () => void;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  /* Copia ordenada: `sort` muta el array que recibe, y este viene de
     `hosmanData` — ordenarlo en sitio alteraría los datos compartidos. */
  const ordenados = [...events].sort((a, b) => a.date.localeCompare(b.date));

  useScrollLock(abierto);

  /* UN SOLO CAMINO IMPERATIVO.
     `abrir` y `cerrar` (abajo) son los únicos que llaman a `showModal()` y a
     `close()`; aquí solo se escucha lo que el elemento hace por su cuenta:
     Escape, el botón nativo o cualquier otro camino del navegador.

     El listener va a mano en vez de como `onClose` en el JSX porque `close` no
     burbujea, y así no depende de cómo React trate hoy los eventos que no
     burbujean: escuchando en el elemento funciona en cualquier caso. */
  useEffect(() => {
    const dialogo = dialogRef.current;
    if (!dialogo) return;
    const alCerrar = () => setAbierto(false);
    dialogo.addEventListener('close', alCerrar);
    return () => dialogo.removeEventListener('close', alCerrar);
  }, []);

  /* --- gesto vertical ----------------------------------------------------
     Pointer Events y no una librería: son dos números y un umbral. Va solo
     sobre los tiradores, así que el contenido de la hoja conserva su
     desplazamiento táctil normal. `setPointerCapture` mantiene los eventos
     aunque el dedo se salga del elemento, y `pointercancel` limpia si el
     navegador se queda el gesto (un scroll, una llamada entrante).

     El origen del arrastre va en un `ref` y no en una variable de la clausura:
     una variable nacería de nuevo en cada render, y si React volviera a pintar
     entre el `pointerdown` y el `pointerup` el gesto se perdería. */
  const inicioY = useRef<number | null>(null);

  const alPulsar = useCallback((e: React.PointerEvent) => {
    inicioY.current = e.clientY;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura el gesto sigue funcionando mientras el dedo no se salga del
      // tirador; lo que no puede es tumbar el manejador. Lanza cuando el
      // puntero ya no está activo — un evento sintético, o uno que el
      // navegador ha dado por terminado entre medias.
    }
  }, []);

  const alAnular = useCallback(() => {
    inicioY.current = null;
  }, []);

  /* Abrir y cerrar tocan el estado Y el elemento, no solo el estado.
     El efecto de arriba solo se ejecuta cuando `abierto` CAMBIA, así que si
     alguna vez el diálogo y el estado se separaran —un `close` que no llegara a
     escucharse— un segundo toque no volvería a abrirlo: `abierto` ya valdría
     `true` y no habría cambio que sincronizar. Actuando también sobre el
     elemento, con su guarda (`showModal()` sobre un diálogo ya abierto lanza),
     la pareja se recompone sola sin añadir un segundo estado. */
  const abrir = useCallback(() => {
    setAbierto(true);
    const dialogo = dialogRef.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);

  const cerrar = useCallback(() => {
    setAbierto(false);
    const dialogo = dialogRef.current;
    if (dialogo?.open) dialogo.close();
  }, []);

  const contratarYCerrar = useCallback(() => {
    cerrar();
    onContact();
  }, [cerrar, onContact]);

  /* Un solo sitio decide si un arrastre cuenta y hacia dónde. `abierto` no se
     consulta aquí: cada tirador solo sabe abrir o solo cerrar, así que un
     gesto en el sentido contrario simplemente no hace nada. */
  const alSoltar = useCallback(
    (e: React.PointerEvent, hacia: 'arriba' | 'abajo') => {
      const desde = inicioY.current;
      inicioY.current = null;
      if (desde === null) return;
      const dy = e.clientY - desde;
      if (Math.abs(dy) < UMBRAL_GESTO) return;
      if (hacia === 'arriba' && dy < 0) abrir();
      if (hacia === 'abajo' && dy > 0) cerrar();
    },
    [abrir, cerrar]
  );

  return (
    <div className={className}>
      {/* TIRADOR — el estado cerrado por defecto. Es un `<button>` de verdad,
          así que teclado y lector de pantalla funcionan sin añadir nada; el
          deslizamiento es una vía ADICIONAL sobre el mismo control. */}
      <button
        type="button"
        onClick={abrir}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        // `touch-action: none` solo aquí: es lo que deja que el navegador nos
        // ceda el arrastre vertical en lugar de interpretarlo como scroll.
        style={{ touchAction: 'none' }}
        className="flex w-full flex-col items-center gap-1 py-1 text-amber-200/70 transition-colors duration-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70"
        onPointerDown={alPulsar}
        onPointerCancel={alAnular}
        onPointerUp={(e) => alSoltar(e, 'arriba')}
      >
        <Chevron className="h-3.5 w-3.5" />
        <span className="text-[8px] font-semibold uppercase tracking-[0.22em]">
          Desliza para ver próximos eventos
        </span>
      </button>

      {/* LA HOJA.
          El clic en el fondo se detecta porque el evento llega al propio
          `<dialog>` (su caja ocupa toda la pantalla; el contenido visible es el
          `<div>` de dentro). Escape lo cubre el listener de `close` de arriba. */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar();
        }}
        aria-label="Próximos shows"
        className="hb-hoja"
      >
        <div
          className="hb-hoja__panel"
          // El clic dentro no debe cerrar; se detiene aquí en vez de comparar
          // ancestros en el manejador del diálogo.
          onClick={(e) => e.stopPropagation()}
        >
          {/* Asa superior: también cierra con un deslizamiento hacia abajo. */}
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar próximos eventos"
            style={{ touchAction: 'none' }}
            className="mx-auto flex w-full flex-col items-center gap-1.5 pt-2 pb-1 text-amber-200/70 transition-colors duration-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70"
            onPointerDown={alPulsar}
            onPointerCancel={alAnular}
            onPointerUp={(e) => alSoltar(e, 'abajo')}
          >
            <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-amber-200/35" />
            <Chevron className="h-3.5 w-3.5 rotate-180" />
          </button>

          <h2 className="mb-3 text-center font-serif text-[10px] uppercase tracking-[0.3em] text-amber-300/90">
            Próximos shows
          </h2>

          <div className="flex flex-col items-center gap-3 overflow-y-auto px-6 pb-6">
            {ordenados.map((_, i) =>
              i < 2 ? (
                <NextShowTicket key={i} events={ordenados} index={i} priority={i === 0} />
              ) : null
            )}
            {/* La hoja se cierra ANTES de navegar. La escena INICIO no se
                desmonta al cambiar de ruta (solo se oculta), así que un
                `<dialog>` abierto seguiría abierto y `useScrollLock` seguiría
                reteniendo el scroll del documento en la sección de destino:
                CONTACTO se quedaba sin poder desplazarse. Ocultar el ancestro
                tampoco cierra un modal. */}
            <PromoTicket onContact={contratarYCerrar} widthClass="w-[var(--hb-ticket-w)]" />
          </div>
        </div>
      </dialog>
    </div>
  );
}
