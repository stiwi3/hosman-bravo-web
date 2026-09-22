'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useShowEvents } from '@/hooks/useShowEvents';
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

   UNA HOJA FÍSICA, NO UN INTERRUPTOR
   La posición de la hoja es un PROGRESO entre 0 (cerrada) y 1 (abierta), que
   vive en la variable CSS `--hb-hoja-p` del diálogo: mueve el panel y oscurece
   el fondo a la vez (globals.css, «LA HOJA DE PRÓXIMOS EVENTOS»). Arrastrando,
   el progreso sigue al dedo sin transición; al soltar o al pulsar, se fija el
   destino con una transición corta. El recorrido es la altura del propio
   panel: ninguna distancia depende de la pantalla.

   `abierto` sigue siendo el estado de React (`aria-expanded`, bloqueo de
   scroll); el progreso no lo es, porque cambia en cada `pointermove` y no debe
   provocar un render por fotograma.
--------------------------------------------------------------------------- */

/** Píxeles de movimiento a partir de los cuales un toque pasa a ser arrastre. */
const HOLGURA = 8;
/** Fracción del recorrido que basta para completar el gesto al soltar. */
const UMBRAL_PROGRESO = 0.2;
/** Velocidad (px/ms) que decide por sí sola el sentido: ~0,5 px/ms = 500 px/s. */
const UMBRAL_VELOCIDAD = 0.5;
/** Ventana de muestras con la que se mide la velocidad al soltar. */
const VENTANA_VELOCIDAD = 90;
/** Duración de un recorrido completo; uno parcial dura en proporción. */
const T_MIN = 140;
const T_MAX = 320;

type Muestra = { y: number; t: number };

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
  events: eventsProp,
  onContact,
  className
}: {
  events?: readonly ShowEvent[];
  onContact: () => void;
  className?: string;
}) {
  // Por defecto, los eventos publicados y todavía por venir (`useShowEvents`).
  const publishedEvents = useShowEvents();
  const events = eventsProp ?? publishedEvents;
  const [abierto, setAbierto] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const tiradorRef = useRef<HTMLButtonElement>(null);

  /** Último progreso escrito (0 cerrada · 1 abierta). */
  const progresoRef = useRef(0);
  /** Cancela la animación en curso, si la hay. */
  const animacionRef = useRef<(() => void) | null>(null);
  /** Quita los listeners del arrastre en curso, si lo hay. */
  const arrastreRef = useRef<(() => void) | null>(null);
  /** Un arrastre acaba de terminar: el `click` que lo sigue no es un toque. */
  const suprimirClickRef = useRef(false);

  /* Copia ordenada: `sort` muta el array que recibe, y este viene de
     la capa de datos — ordenarlo en sitio alteraría los datos compartidos. */
  const ordenados = [...events].sort((a, b) => a.date.localeCompare(b.date));

  useScrollLock(abierto);

  /* --- posición --------------------------------------------------------- */

  const aplicar = useCallback((p: number, ms: number) => {
    const dialogo = dialogRef.current;
    if (!dialogo) return;
    progresoRef.current = p;
    dialogo.style.setProperty('--hb-hoja-t', `${ms}ms`);
    dialogo.style.setProperty('--hb-hoja-p', String(p));
  }, []);

  const detenerAnimacion = useCallback(() => {
    animacionRef.current?.();
    animacionRef.current = null;
  }, []);

  /* Lleva la hoja a un extremo. La duración es proporcional a lo que queda de
     recorrido: soltar cerca del destino no se arrastra 320 ms. Con movimiento
     reducido el cambio es inmediato, pero la función es la misma. */
  const animarA = useCallback(
    (destino: 0 | 1, alTerminar?: () => void) => {
      detenerAnimacion();
      const panel = panelRef.current;
      if (!panel) return;
      const distancia = Math.abs(destino - progresoRef.current);
      const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const ms = reducido || distancia === 0 ? 0 : Math.round(T_MIN + (T_MAX - T_MIN) * distancia);
      // Fija la posición de partida antes de cambiar el destino: sin este
      // cálculo de estilo, abrir desde cerrada saltaría sin transición.
      panel.getBoundingClientRect();
      aplicar(destino, ms);
      if (ms === 0) {
        alTerminar?.();
        return;
      }
      let hecho = false;
      const quitar = () => {
        hecho = true;
        panel.removeEventListener('transitionend', alFin);
        window.clearTimeout(reserva);
      };
      function alFin(e: TransitionEvent) {
        if (e.target === panel && e.propertyName === 'translate') terminar();
      }
      function terminar() {
        if (hecho) return;
        quitar();
        animacionRef.current = null;
        alTerminar?.();
      }
      panel.addEventListener('transitionend', alFin);
      // Si el panel deja de pintarse a mitad (al navegar), `transitionend` no
      // llega: el temporizador garantiza que la hoja nunca se quede a medias.
      const reserva = window.setTimeout(terminar, ms + 80);
      animacionRef.current = quitar;
    },
    [aplicar, detenerAnimacion]
  );

  /* --- abrir y cerrar ----------------------------------------------------
     UN SOLO CAMINO IMPERATIVO: estas funciones son las únicas que llaman a
     `showModal()` y a `close()`. `mostrar` pone el diálogo en pantalla con la
     hoja todavía abajo; el resto decide cómo llega arriba. */

  const mostrar = useCallback(() => {
    const dialogo = dialogRef.current;
    if (!dialogo) return;
    if (!dialogo.open) {
      aplicar(0, 0);
      dialogo.showModal();
    }
    setAbierto(true);
  }, [aplicar]);

  const abrir = useCallback(() => {
    mostrar();
    animarA(1);
  }, [mostrar, animarA]);

  /* El diálogo se cierra DESPUÉS de que la hoja haya bajado. `abierto` cae
     en el acto: el scroll de la página se libera sin esperar a la animación. */
  const cerrar = useCallback(() => {
    setAbierto(false);
    const dialogo = dialogRef.current;
    if (!dialogo?.open) return;
    animarA(0, () => {
      if (dialogo.open) dialogo.close();
    });
  }, [animarA]);

  /* Sin animación: para cuando la hoja deja de verse (navegar, girar). */
  const cerrarYa = useCallback(() => {
    detenerAnimacion();
    setAbierto(false);
    const dialogo = dialogRef.current;
    if (dialogo?.open) dialogo.close();
  }, [detenerAnimacion]);

  const contratarYCerrar = useCallback(() => {
    cerrarYa();
    onContact();
  }, [cerrarYa, onContact]);

  /* Lo que el diálogo hace por su cuenta. `cancel` (Escape) se intercepta
     para bajar la hoja con animación; `close` —por cualquier camino— deja
     el estado y la posición en cerrada. Los listeners van a mano porque
     `close` y `cancel` no burbujean. */
  useEffect(() => {
    const dialogo = dialogRef.current;
    if (!dialogo) return;
    const alCancelar = (e: Event) => {
      e.preventDefault();
      cerrar();
    };
    const alCerrar = () => {
      detenerAnimacion();
      aplicar(0, 0);
      setAbierto(false);
    };
    dialogo.addEventListener('cancel', alCancelar);
    dialogo.addEventListener('close', alCerrar);
    return () => {
      dialogo.removeEventListener('cancel', alCancelar);
      dialogo.removeEventListener('close', alCerrar);
    };
  }, [cerrar, detenerAnimacion, aplicar]);

  /* SI EL TIRADOR DEJA DE EXISTIR, LA HOJA SE CIERRA.
     Esta hoja solo se muestra en la composición con rails. Al girar el teléfono
     con ella abierta, su ancestro pasa a `display:none`: el `<dialog>` sigue en
     la capa superior y sigue `open`, pero deja de pintarse — y `useScrollLock`
     seguiría reteniendo el scroll del documento con nada visible que lo
     explicara. La página quedaba bloqueada.

     ⚠️ Pasa por `cerrarYa()`, que cierra el ELEMENTO y no solo el estado: tocar
     solo el estado soltaría el bloqueo de scroll pero dejaría el modal abierto
     en la capa superior, invisible y capturando la interacción.

     Se observa el TAMAÑO DEL TIRADOR y no la condición de la variante: así no
     hay una tercera copia de una regla estructural en JavaScript, y sirve igual
     para cualquier otro motivo por el que la hoja deje de aplicar. La primera
     entrega del observador trae la caja real; si ya es 0×0 el diálogo tampoco
     está abierto, y `cerrarYa()` es inocuo.

     ⚠️ SIN VERIFICAR EN EJECUCIÓN. Que `ResizeObserver` notifique cuando un
     ANCESTRO pasa a `display:none` está confirmado por especificación, pero el
     panel de pruebas del entorno de desarrollo NO entrega `ResizeObserver` en
     absoluto —comprobado con un elemento aislado— ni dispara los eventos
     `change` de `matchMedia`, así que ninguna de las dos alternativas se puede
     verificar ahí. Queda pendiente de comprobar en navegador y dispositivo
     reales: abrir la hoja en vertical y girar el teléfono.

     Se descartó `matchMedia` precisamente porque duplicaría la condición
     `rails` en JavaScript sin ganar verificabilidad a cambio. */
  useEffect(() => {
    const tirador = tiradorRef.current;
    if (!tirador) return;
    const observer = new ResizeObserver(([entrada]) => {
      const caja = entrada.contentRect;
      if (caja.width === 0 && caja.height === 0) cerrarYa();
    });
    observer.observe(tirador);
    return () => observer.disconnect();
  }, [cerrarYa]);

  /* --- arrastre ----------------------------------------------------------
     Pointer Events para ratón y táctil por igual. El gesto solo NACE en los
     dos tiradores (el de la escena abre; el asa de la hoja cierra), que son
     los únicos con `touch-action: none`: los tickets y la lista conservan su
     desplazamiento y sus clics.

     Los movimientos se escuchan en `window` y no en el tirador. Al abrirse, el
     diálogo modal vuelve INERTE todo lo que queda fuera, tirador incluido, y
     un elemento inerte deja de recibir eventos. Por eso, antes de
     `showModal()`, el tirador suelta la captura del puntero: los eventos
     siguientes caen sobre el diálogo y suben hasta `window`.

     CLIC FRENTE A ARRASTRE. Hasta `HOLGURA` px el gesto es un toque y lo
     resuelve el `click` normal. Pasado ese umbral es un arrastre, y el `click`
     que el navegador pueda disparar al soltar se descarta (`suprimirClickRef`).
     El indicador se limpia al empezar el siguiente gesto o al pulsar una
     tecla, así que nunca se come un toque ni un Enter posteriores. */

  const empezarArrastre = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>, origen: 0 | 1) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      suprimirClickRef.current = false;
      // Una animación en curso no se agarra a medias: el toque sigue valiendo.
      if (animacionRef.current || arrastreRef.current) return;
      if (origen === 1 && !dialogRef.current?.open) return;

      const boton = e.currentTarget;
      const id = e.pointerId;
      try {
        boton.setPointerCapture(id);
      } catch {
        // Sin captura el gesto sigue funcionando: los movimientos se escuchan
        // en `window`. Lanza con un puntero que ya no está activo.
      }

      let desdeY = e.clientY;
      let alto = 0;
      let activo = false;
      const muestras: Muestra[] = [{ y: e.clientY, t: e.timeStamp }];

      const registrar = (ev: PointerEvent) => {
        muestras.push({ y: ev.clientY, t: ev.timeStamp });
        while (muestras.length > 2 && ev.timeStamp - muestras[0].t > VENTANA_VELOCIDAD) {
          muestras.shift();
        }
      };

      const alMover = (ev: PointerEvent) => {
        if (ev.pointerId !== id) return;
        registrar(ev);
        if (!activo) {
          if (Math.abs(ev.clientY - desdeY) < HOLGURA) return;
          activo = true;
          suprimirClickRef.current = true;
          // Desde cerrada solo cuenta hacia arriba: hacia abajo no hay a dónde ir.
          if (origen === 0) {
            if (ev.clientY > desdeY) return;
            if (boton.hasPointerCapture(id)) boton.releasePointerCapture(id);
            mostrar();
          }
          // La hoja arranca desde donde está el dedo ahora, sin saltar la holgura.
          desdeY = ev.clientY;
          alto = panelRef.current?.offsetHeight ?? 0;
          if (alto === 0) return;
        }
        if (alto === 0) return;
        // Hacia arriba abre (+), hacia abajo cierra (−).
        const p = origen + (desdeY - ev.clientY) / alto;
        aplicar(Math.min(1, Math.max(0, p)), 0);
      };

      const acabar = (ev: PointerEvent, cancelado: boolean) => {
        if (ev.pointerId !== id) return;
        quitar();
        if (!activo || alto === 0) return;
        registrar(ev);
        const primera = muestras[0];
        const ultima = muestras[muestras.length - 1];
        const dt = ultima.t - primera.t;
        // Velocidad hacia arriba en px/ms: positiva abre, negativa cierra.
        const v = dt > 0 ? (primera.y - ultima.y) / dt : 0;
        const avance = Math.abs(progresoRef.current - origen);
        const otro = origen === 0 ? 1 : 0;
        let destino: 0 | 1;
        if (cancelado) destino = origen;
        else if (v >= UMBRAL_VELOCIDAD) destino = 1;
        else if (v <= -UMBRAL_VELOCIDAD) destino = 0;
        else destino = avance >= UMBRAL_PROGRESO ? otro : origen;
        if (destino === 1) abrir();
        else cerrar();
      };

      const alSoltar = (ev: PointerEvent) => acabar(ev, false);
      const alAnular = (ev: PointerEvent) => acabar(ev, true);

      function quitar() {
        window.removeEventListener('pointermove', alMover);
        window.removeEventListener('pointerup', alSoltar);
        window.removeEventListener('pointercancel', alAnular);
        arrastreRef.current = null;
      }

      window.addEventListener('pointermove', alMover);
      window.addEventListener('pointerup', alSoltar);
      window.addEventListener('pointercancel', alAnular);
      arrastreRef.current = quitar;
    },
    [abrir, cerrar, mostrar, aplicar]
  );

  // Al desmontar no queda nada escuchando ni animando.
  useEffect(
    () => () => {
      arrastreRef.current?.();
      animacionRef.current?.();
    },
    []
  );

  const alClicTirador = useCallback(() => {
    if (suprimirClickRef.current) {
      suprimirClickRef.current = false;
      return;
    }
    abrir();
  }, [abrir]);

  const alClicAsa = useCallback(() => {
    if (suprimirClickRef.current) {
      suprimirClickRef.current = false;
      return;
    }
    cerrar();
  }, [cerrar]);

  const alTeclear = useCallback(() => {
    suprimirClickRef.current = false;
  }, []);

  return (
    <div className={className}>
      {/* TIRADOR — el estado cerrado por defecto. Es un `<button>` de verdad,
          así que teclado y lector de pantalla funcionan sin añadir nada; el
          deslizamiento es una vía ADICIONAL sobre el mismo control. */}
      <button
        ref={tiradorRef}
        type="button"
        onClick={alClicTirador}
        onKeyDown={alTeclear}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        // `touch-action: none` solo aquí: es lo que deja que el navegador nos
        // ceda el arrastre vertical en lugar de interpretarlo como scroll.
        style={{ touchAction: 'none' }}
        className="flex w-full select-none flex-col items-center gap-1 py-1 text-amber-200/70 transition-colors duration-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70"
        onPointerDown={(e) => empezarArrastre(e, 0)}
      >
        <Chevron className="h-3.5 w-3.5" />
        <span className="text-[8px] font-semibold uppercase tracking-[0.22em]">
          Desliza para ver próximos eventos
        </span>
      </button>

      {/* LA HOJA.
          El clic en el fondo se detecta porque el evento llega al propio
          `<dialog>` (su caja ocupa toda la pantalla; el contenido visible es el
          `<div>` de dentro). Escape lo cubre el listener de `cancel` de arriba. */}
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar();
        }}
        aria-label="Próximos shows"
        className="hb-hoja"
      >
        <div
          ref={panelRef}
          className="hb-hoja__panel"
          // El clic dentro no debe cerrar; se detiene aquí en vez de comparar
          // ancestros en el manejador del diálogo.
          onClick={(e) => e.stopPropagation()}
        >
          {/* Asa superior: cierra al pulsar, y también arrastrándola hacia abajo. */}
          <button
            type="button"
            onClick={alClicAsa}
            onKeyDown={alTeclear}
            aria-label="Cerrar próximos eventos"
            style={{ touchAction: 'none' }}
            className="mx-auto flex w-full select-none flex-col items-center gap-1.5 pt-2 pb-1 text-amber-200/70 transition-colors duration-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70"
            onPointerDown={(e) => empezarArrastre(e, 1)}
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
