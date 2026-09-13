'use client';

import { useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   COORDINADOR DE LOS MÓDULOS PERIFÉRICOS DE INICIO.

   Redes (izquierda), plataformas (derecha) y Próximos Shows (abajo) se
   adaptan al espacio que REALMENTE queda alrededor del hero. Un solo sitio
   mide y decide, siempre en la misma dirección:

       viewport → cabecera (menú, reproductor) → hero/rótulo
                → estado de Próximos Shows → límites de los rails
                → contenido de los rails (SocialLinks, MusicPlatforms)

   Nada de lo que está a la derecha de una flecha puede cambiar lo que está a
   su izquierda, y por eso no hay bucles:

   · La POSICIÓN de Shows (lateral / bajo el rótulo) sí cambia la fila del pie
     —bajo el rótulo reserva el mínimo; en lateral no reserva nada—, y con ella
     el hero. Por eso no se decide sobre el rótulo que se ve, sino sobre el que
     habría en lateral, calculado desde la zona: decidir no altera la entrada.
   · La PRESENTACIÓN (completa / reducida / mínima) y el tamaño del logo solo
     mueven overlays: ninguna fila depende de ellos.
   · `--hb-escena-min` sale de la cabecera y de mínimos fijos, no del estado.
   · El ticket lateral es un overlay: su ancho no toca ninguna fila.
   · Los rails son `fixed` y superpuestos: no se miden, solo leen.

   Lo que se mide del propio bloque de Shows son PROPORCIONES (alto del ticket
   por píxel de ancho, alto fijo del título y el botón), que no dependen del
   ancho al que esté dibujado. Así, volver a medir tras aplicar un ancho da el
   mismo ancho: el observador converge en una pasada.

   En la composición ABIERTA (escritorio aprobado) no se decide nada: Shows va
   completo y los rails siguen con sus tokens (`abierta:` en las clases). Se
   detecta leyendo el resultado de la variante —la zona del hero es
   `absolute`— en lugar de copiar su media query aquí.
--------------------------------------------------------------------------- */

/** Por debajo de este ancho el ticket lateral deja de leerse. Gobierna los dos
 *  ejes con la misma histéresis, pero cada uno con su propia causa:
 *  · POSICIÓN — si el ancho junto al rótulo baja de aquí, Shows pasa a mínimo
 *    y se recoloca bajo el rótulo;
 *  · PRESENTACIÓN — si es el alto (sitio para las redes) el que deja el
 *    ticket por debajo, pasa a mínimo pero se queda en su esquina. */
export const SHOWS_ANCHO_MIN_LATERAL = 256;
/** Para volver a lateral hace falta este ancho. La diferencia con el mínimo es
 *  la histéresis: en el límite exacto el bloque se queda donde está. */
export const SHOWS_ANCHO_VOLVER_LATERAL = 280;
/** Ancho mínimo de las entradas dentro del panel desplegado del estado
 *  mínimo. Solo por debajo de él aparece el scroll de seguridad del panel. */
export const SHOWS_PANEL_ANCHO_MIN = 200;

/** Qué se ve de Próximos Shows. Puede cambiar por falta de ancho o de alto. */
export type PresentacionShows = 'completa' | 'reducida' | 'minima';
/** Dónde va. Cambia SOLO por falta de ancho junto al rótulo del hero. */
export type PosicionShows = 'lateral' | 'bajoRotulo';

export interface GeometriaShows {
  presentacion: PresentacionShows;
  posicion: PosicionShows;
  /** Ancho del ticket lateral en px, o `null` para usar el token. */
  anchoLateral: number | null;
  /** Ancho de las entradas del panel mínimo en px, o `null` para el token. */
  anchoPanel: number | null;
  /** Alto disponible para ese panel (entre la cabecera y el bloque), o `null`. */
  altoPanel: number | null;
  /** El panel se abre al lado del bloque porque encima no cabe. */
  panelAlLado: boolean;
  /** Cuánto baja ese panel lateral por debajo del botón (el aviso legal), en px. */
  bajaPanel: number;
}

const INICIAL: GeometriaShows = {
  presentacion: 'completa',
  posicion: 'lateral',
  anchoLateral: null,
  anchoPanel: null,
  altoPanel: null,
  panelAlLado: false,
  bajaPanel: 0
};

/** Histéresis 256/280: por debajo de `min` se pasa; para volver hace falta `volver`. */
const conHisteresis = (pasado: boolean, ancho: number) =>
  pasado ? ancho < SHOWS_ANCHO_VOLVER_LATERAL : ancho < SHOWS_ANCHO_MIN_LATERAL;

const visible = (el: Element | null | undefined): el is HTMLElement =>
  !!el && el.getClientRects().length > 0;

export function useGeometriaPeriferica(escenaRef: React.RefObject<HTMLElement | null>) {
  const [geo, setGeo] = useState<GeometriaShows>(INICIAL);
  // El estado vigente de cada eje hace falta DENTRO del observador para la histéresis.
  const vigente = useRef({ bajoRotulo: false, minimaPorAlto: false });

  useEffect(() => {
    const escena = escenaRef.current;
    const header = document.querySelector('header');
    if (!escena || !header) return;
    const root = document.documentElement;
    const $ = (nombre: string) => escena.querySelector<HTMLElement>(`[data-hb-geo="${nombre}"]`);

    const publicar = (vars: Record<string, number | null>) => {
      for (const [nombre, valor] of Object.entries(vars)) {
        const nuevo = valor === null ? '' : `${Math.round(valor)}px`;
        if (root.style.getPropertyValue(nombre) !== nuevo) {
          if (nuevo) root.style.setProperty(nombre, nuevo);
          else root.style.removeProperty(nombre);
        }
      }
    };

    const aplicar = (siguiente: GeometriaShows) => {
      setGeo((prev) =>
        prev.presentacion === siguiente.presentacion &&
        prev.posicion === siguiente.posicion &&
        prev.anchoLateral === siguiente.anchoLateral &&
        prev.anchoPanel === siguiente.anchoPanel &&
        prev.altoPanel === siguiente.altoPanel &&
        prev.panelAlLado === siguiente.panelAlLado &&
        prev.bajaPanel === siguiente.bajaPanel
          ? prev
          : siguiente
      );
    };

    const medir = () => {
      const zona = $('zona');
      // Escena oculta (otra ruta): nada que medir.
      if (!visible(zona)) return;

      if (getComputedStyle(zona).position === 'absolute') {
        publicar({
          '--hb-lim-sup-izq': null,
          '--hb-lim-sup-dcha': null,
          '--hb-lim-inf-izq': null,
          '--hb-lim-inf-dcha': null,
          '--hb-escena-min': null,
          '--hb-isotipo-real': null
        });
        aplicar(INICIAL);
        return;
      }

      const vh = root.clientHeight;
      const sy = window.scrollY;
      /* COORDENADAS DE ESCENA, no de pantalla. Los rails van dentro de la escena
         y se desplazan con ella, así que todo límite se expresa respecto a su
         borde superior (que es el del documento). Si la escena supera la
         pantalla, los límites dejan de depender de ella: la geometría queda
         CONGELADA en la que tenía en la frontera y el conjunto se desplaza
         entero, sin que nada siga encogiendo. */
      const enEscena = (yViewport: number) => yViewport + sy;
      const borde = $('regla-borde')?.offsetHeight ?? 8;

      // 1 · CABECERA — límites superiores.
      const menu = header.firstElementChild?.querySelector('button');
      const reproductor = [...header.querySelectorAll('[data-hb-geo="reproductor"]')].find(visible);
      const supIzq = (menu?.getBoundingClientRect().bottom ?? 0) + borde;
      const supDcha = (reproductor?.getBoundingClientRect().bottom ?? 0) + borde;

      const pie = $('pie');
      if (!pie) return;

      /* MÍNIMOS — la expresión más pequeña de cada módulo, leída de los tokens.
         Los rails usan la MISMA fórmula que su CSS: botón en su suelo y hueco en
         `cqh` de su propia banda (2 % en redes, 2,5 % en plataformas). */
      const controlMin = $('regla-control-min')?.offsetHeight ?? 28;
      const cta = $('regla-social-cta')?.offsetHeight ?? 34;
      const logoMin = $('regla-logo-min')?.offsetHeight ?? 28;
      const logoObjetivo = $('regla-logo')?.offsetHeight ?? 45;
      const sueloHero = $('regla-hero-suelo')?.offsetHeight ?? 240;
      const redesMin = (4 * controlMin + cta) / (1 - 3 * 0.02);
      const plataformasMin = (4.75 * controlMin) / (1 - 4 * 0.025);
      const pb = parseFloat(getComputedStyle(pie).paddingBottom);
      const menuAbajo = supIzq - borde;
      const reproductorAbajo = supDcha - borde;
      // Columna derecha en su mínimo: reproductor → plataformas → logo.
      const columnaDchaMin = reproductorAbajo + 2 * borde + plataformasMin + logoMin + pb;
      /* El logo va a su tamaño objetivo mientras quepa; cede después que las
         plataformas, que ya han bajado a su mínimo, y nunca por debajo del suyo. */
      const tamLogo = (base: number, tope = Infinity) =>
        Math.max(logoMin, Math.min(logoObjetivo, tope, base - reproductorAbajo - 2 * borde - plataformasMin));

      // 2 · MÓVIL — el bloque inferior es rótulo + tirador, una fila de verdad.
      const pieRails = $('pie-rails');
      if (visible(pieRails)) {
        const altoPie = pie.getBoundingClientRect().height;
        const escenaMin = Math.max(menuAbajo + 2 * borde + redesMin, columnaDchaMin - logoMin - pb) + altoPie;
        const inf = enEscena(pieRails.getBoundingClientRect().top) - borde;
        // En móvil el logo comparte franja con el tirador centrado: su tope es
        // el hueco que deja el texto del tirador a cada lado.
        const texto = pieRails.querySelector('button[aria-haspopup] span')?.getBoundingClientRect().width ?? 0;
        const estiloPie = getComputedStyle(pie);
        const anchoInterior = pie.clientWidth - parseFloat(estiloPie.paddingLeft) - parseFloat(estiloPie.paddingRight);
        const logo = Math.max(logoMin, Math.min(logoObjetivo, (anchoInterior - texto) / 2 - borde));
        publicar({
          '--hb-lim-sup-izq': supIzq,
          '--hb-lim-sup-dcha': supDcha,
          '--hb-lim-inf-izq': inf,
          '--hb-lim-inf-dcha': inf,
          '--hb-escena-min': escenaMin,
          '--hb-isotipo-real': logo
        });
        aplicar(INICIAL);
        return;
      }

      // 3 · COMPACTA — rótulo del hero → estado de Shows.
      const lateral = $('shows-lateral');
      const minimo = $('shows-minimo');
      const minimoLateral = $('shows-lateral-minimo');
      const rotulo = $('rotulo')?.firstElementChild;
      const ticket = lateral?.querySelector('section')?.children[1];
      if (!lateral || !minimo || !minimoLateral || !rotulo || !ticket) return;

      const natural = $('regla-ticket')?.offsetWidth ?? 300;
      const separacion = $('regla-separacion')?.offsetWidth ?? 12;
      const redesNatural = $('regla-redes')?.offsetHeight ?? 200;

      const cajaLateral = lateral.getBoundingClientRect();
      const cajaTicket = ticket.getBoundingClientRect();
      if (cajaTicket.width === 0) return;
      const altoPorAncho = cajaTicket.height / cajaTicket.width;
      const altoFijo = cajaLateral.height - cajaTicket.height;
      const altoMinLateral = minimoLateral.getBoundingClientRect().height;
      const altoMinBajo = minimo.getBoundingClientRect().height;

      /* LA ESCENA SE CALCULA POR COLUMNAS, NO SUMANDO FILAS.
         En lateral, Shows y el logo comparten franja con el hero: no reservan
         fila. Lo que no puede solaparse es cada COLUMNA consigo misma:
           · centro — reserva de cabecera + suelo del hero + margen inferior
             (el rótulo va DENTRO del hero, no suma);
           · izquierda — menú → redes mínimas → Shows mínimo;
           · derecha — reproductor → plataformas mínimas → logo mínimo.
         La escena solo supera la pantalla si alguna de las tres no cabe ni con
         todo en su mínimo. El centro lo resuelve la rejilla sola; las columnas
         laterales se publican en `--hb-escena-min`.

         Todo esto depende de la cabecera, de los tokens y de alturas propias de
         cada bloque — nunca del estado elegido —, así que no hay bucle. */
      const reservaCabecera = zona.getBoundingClientRect().top - escena.getBoundingClientRect().top;
      const columnaIzqLateralMin = menuAbajo + 2 * borde + redesMin + altoMinLateral + pb;
      const escenaLateral = Math.max(vh, columnaIzqLateralMin, columnaDchaMin, reservaCabecera + sueloHero + pb);
      const baseLateral = escenaLateral - pb;
      // Lo que mediría la escena con Shows mínimo BAJO EL RÓTULO (fila de reserva).
      const escenaBajoMin = Math.max(
        menuAbajo + 2 * borde + redesMin + altoMinBajo + pb,
        columnaDchaMin,
        reservaCabecera + sueloHero + pb + altoMinBajo
      );

      /* EJE 1 · POSICIÓN — se decide sobre el hero que habría EN LATERAL (sin
         reserva de pie), no sobre el actual. Si se midiera el actual, ir bajo el
         rótulo encogería el hero, eso abriría hueco y volvería a lateral: un
         vaivén. El rótulo es una fracción fija del ancho del vídeo, y el vídeo
         es `min(ancho de zona, 0,75 × alto de su lienzo)`. El lienzo sube hasta
         el borde superior de la escena (ver `HeroScene`), así que su alto NO
         descuenta la reserva de cabecera. */
      const cajaZona = zona.getBoundingClientRect();
      const cajaEncuadre = $('rotulo')!.getBoundingClientRect();
      const fraccionRotulo = rotulo.getBoundingClientRect().width / cajaEncuadre.width;
      const videoLateral = Math.min(cajaZona.width, 0.75 * (escenaLateral - pb));
      const rotuloIzqLateral = cajaZona.left + cajaZona.width / 2 - (fraccionRotulo * videoLateral) / 2;
      /* El ticket va CENTRADO bajo el título, que tiene ancho fijo (sus
         filetes). Mientras el ticket sea más estrecho que el título, su borde
         derecho no está en `izquierda + ancho` sino en
         `izquierda + (título + ancho) / 2`: medido a 760×600, un ticket de 258
         invadía 10px el rótulo con el cálculo simple. */
      const hueco = rotuloIzqLateral - cajaLateral.left - separacion;
      const anchoTitulo = lateral.querySelector('section h2')?.getBoundingClientRect().width ?? 0;
      const porAncho = hueco >= anchoTitulo ? hueco : 2 * hueco - anchoTitulo;
      // Ancho con el que el bloque deja a las redes su tamaño NORMAL encima.
      const techoLateral = supIzq + redesNatural + borde;
      const porAlto = (baseLateral - techoLateral - altoFijo) / altoPorAncho;
      /* EJE 1 · POSICIÓN — la mira el ancho junto al rótulo, con histéresis…
         salvo cuando eso cuesta scroll. CABER EN `100svh` MANDA SOBRE LA
         HISTÉRESIS: si bajo el rótulo desborda y lateral es válido (ancho ≥ el
         mínimo, sin la banda de histéresis) y cabe, lateral es obligatorio. La
         histéresis solo decide entre dos posiciones que caben (o que no caben
         ninguna). No oscila: una vez en lateral, para volver hace falta bajar
         del mínimo, y eso no depende del alto que se acaba de recuperar. */
      const anchoJuntoRotulo = Math.floor(Math.min(natural, porAncho));
      const bajoPorHisteresis = conHisteresis(vigente.current.bajoRotulo, anchoJuntoRotulo);
      /* Para no desbordar, lateral es válido si cabe su versión MÍNIMA: la tinta
         del título y del botón (no los filetes decorativos) no alcanza el
         rótulo. El ticket tiene su propia exigencia de ancho, más abajo. */
      const cajaMinLateral = minimoLateral.getBoundingClientRect();
      const seccionMinLateral = minimoLateral.querySelector('section');
      const tintaMinLateral =
        Math.max(
          seccionMinLateral?.querySelector(':scope > button')?.getBoundingClientRect().right ?? 0,
          seccionMinLateral?.querySelector('h2 span.font-serif')?.getBoundingClientRect().right ?? 0
        ) - cajaMinLateral.left;
      const minimoLateralValido = hueco >= tintaMinLateral;
      /* Si bajo el rótulo desborda y lateral es válido, manda la escena MÁS
         BAJA: si lateral cabe, no hay scroll; si tampoco cabe, es la que menos
         desborda. Sin lo segundo, al cruzar la frontera real la histéresis
         volvía a bajo el rótulo y el scroll saltaba de 0 a 73px (700×340) en
         vez de crecer desde 1: la geometría no quedaba congelada. */
      const bajoRotulo =
        bajoPorHisteresis && !(escenaBajoMin > vh && minimoLateralValido && escenaLateral < escenaBajoMin);
      // Lateral forzado por alto con un ticket que no cabe al lado: va mínimo.
      const minimaPorAncho = !bajoRotulo && anchoJuntoRotulo < SHOWS_ANCHO_MIN_LATERAL;
      // EJE 2 · PRESENTACIÓN — bajo el rótulo siempre es mínima; en lateral,
      // el ticket mide lo que permitan ancho Y alto, y si eso baja del mínimo
      // legible pasa a mínima SIN moverse de su esquina.
      const ancho = Math.floor(Math.min(natural, porAncho, porAlto));
      // La histéresis de este eje mira SOLO el alto: si mirara también el
      // ancho, un mínimo que entró por alto se quedaría enganchado por ancho.
      const minimaPorAlto =
        !bajoRotulo && conHisteresis(vigente.current.minimaPorAlto, Math.floor(Math.min(natural, porAlto)));
      vigente.current = { bajoRotulo, minimaPorAlto };

      const posicion: PosicionShows = bajoRotulo ? 'bajoRotulo' : 'lateral';
      const presentacion: PresentacionShows =
        bajoRotulo || minimaPorAlto || minimaPorAncho ? 'minima' : ancho < natural ? 'reducida' : 'completa';
      const anchoLateral = Math.max(SHOWS_ANCHO_MIN_LATERAL, Math.min(natural, ancho));
      // El bloque mínimo que manda: el de la esquina o el de bajo el rótulo.
      const minimoActivo = bajoRotulo ? minimo : minimoLateral;

      // 4 · Panel del estado mínimo: las entradas se ajustan al alto que hay
      // entre la cabecera y el bloque, en vez de desplazarse dentro.
      let anchoPanel: number | null = null;
      let altoPanel: number | null = null;
      let panelAlLado = false;
      let bajaPanel = 0;
      const panel = minimoActivo.querySelector<HTMLElement>('[data-hb-geo="panel-shows"]');
      const primera = panel?.firstElementChild?.getBoundingClientRect();
      if (panel && primera && primera.width > 0) {
        const hijos = [...panel.children].map((h) => h.getBoundingClientRect().height);
        const estilo = getComputedStyle(panel);
        const fijoPanel =
          parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom) + parseFloat(estilo.rowGap || '0') * (hijos.length - 1);
        const altoPorAnchoPanel = hijos.reduce((a, b) => a + b, 0) / primera.width;
        const techo = header.getBoundingClientRect().bottom + borde;
        const seccion = minimoActivo.querySelector('section')!.getBoundingClientRect();
        // −2px: el redondeo de las alturas de las entradas llegaba a pasar el
        // tope por un píxel, y eso ya encendía el scroll del panel.
        const anchoPara = (alto: number) => Math.min(natural, (alto - fijoPanel - 2) / altoPorAnchoPanel);
        // Encima del bloque, si ahí caben las entradas a un ancho legible.
        let disponible = enEscena(seccion.top) - techo;
        /* Si no, y el bloque va en su esquina, al LADO: ahí el panel puede
           bajar hasta el pie del propio bloque y gana todo su alto. Sigue
           siendo un overlay sobre el hero; no mueve nada. */
        if (!bajoRotulo && anchoPara(disponible) < SHOWS_PANEL_ANCHO_MIN) {
          const pieBloque = minimoActivo.getBoundingClientRect().bottom;
          disponible = enEscena(pieBloque) - techo;
          bajaPanel = pieBloque - seccion.bottom;
          panelAlLado = true;
        }
        altoPanel = Math.floor(disponible);
        anchoPanel = Math.floor(Math.max(SHOWS_PANEL_ANCHO_MIN, anchoPara(disponible)));
      }

      // 5 · Escena final y límites inferiores, según el estado ya decidido.
      // Bajo el rótulo, Shows mínimo sí es una fila: la reserva la pone la
      // rejilla, y la columna izquierda la cuenta.
      const escenaMin = bajoRotulo
        ? Math.max(menuAbajo + 2 * borde + redesMin + altoMinBajo + pb, columnaDchaMin)
        : Math.max(columnaIzqLateralMin, columnaDchaMin);
      const escenaTotal = Math.max(vh, bajoRotulo ? escenaBajoMin : escenaLateral);
      // Pie de la escena, no de la pantalla: por debajo de la frontera ya no
      // cambia con el viewport, y así redes, plataformas y logo quedan fijos.
      const base = escenaTotal - pb;

      const logo = tamLogo(base);
      const altoOcupadoIzq = bajoRotulo
        ? altoMinBajo
        : presentacion === 'minima'
          ? altoMinLateral
          : altoFijo + altoPorAncho * anchoLateral;

      publicar({
        '--hb-lim-sup-izq': supIzq,
        '--hb-lim-sup-dcha': supDcha,
        '--hb-lim-inf-izq': base - altoOcupadoIzq - borde,
        '--hb-lim-inf-dcha': base - logo - borde,
        '--hb-escena-min': escenaMin,
        '--hb-isotipo-real': logo
      });
      aplicar({ presentacion, posicion, anchoLateral, anchoPanel, altoPanel, panelAlLado, bajaPanel: Math.round(bajaPanel) });
    };

    const observador = new ResizeObserver(medir);
    const observar = (el: Element | null | undefined) => el && observador.observe(el);
    observar(header);
    header.querySelectorAll('[data-hb-geo="reproductor"]').forEach(observar);
    ['zona', 'rotulo', 'pie', 'pie-rails', 'shows-lateral', 'shows-minimo', 'shows-lateral-minimo', 'regla-ticket', 'regla-redes'].forEach((n) =>
      observar($(n))
    );
    observar($('shows-minimo')?.querySelector('[data-hb-geo="panel-shows"]'));
    observar($('shows-lateral-minimo')?.querySelector('[data-hb-geo="panel-shows"]'));
    window.addEventListener('resize', medir);
    return () => {
      observador.disconnect();
      window.removeEventListener('resize', medir);
    };
  }, [escenaRef]);

  return geo;
}
