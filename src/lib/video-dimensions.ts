import { closeSync, fstatSync, openSync, readSync } from 'node:fs';
import path from 'node:path';

/* ---------------------------------------------------------------------------
   DIMENSIONES DE UN VÍDEO — SOLO EN EL SERVIDOR (build / render estático).

   Lee la cabecera del propio MP4 de `public/` y devuelve su tamaño de
   presentación. Sirve para que una composición (EL SHOW) sepa si un vídeo es
   horizontal o vertical SIN que el navegador descargue nada: los vídeos inline
   siguen con `preload="none"` y la maqueta sale bien desde el HTML, sin saltos.

   No es un dato del CMS: sale del archivo real, así que no puede mentir. Si el
   archivo no se puede leer o no es un MP4 reconocible devuelve `null` y quien
   lo usa aplica su composición de siempre.

   Recorre las cajas de nivel superior hasta `moov` (esté al principio, con
   faststart, o al final) y, dentro, la pista de vídeo (`hdlr` = `vide`): su
   `tkhd` trae ancho y alto (16.16) y la matriz, que dice si está girado 90°.
   No importar desde componentes de cliente: usa `node:fs`.
--------------------------------------------------------------------------- */

export interface VideoDimensions {
  width: number;
  height: number;
}

const cache = new Map<string, VideoDimensions | null>();

/** Cabecera de caja en `offset`: tamaño total, tipo y longitud de la cabecera. */
function leerCaja(fd: number, offset: number, fin: number) {
  if (offset + 8 > fin) return null;
  const cab = Buffer.alloc(16);
  readSync(fd, cab, 0, 16, offset);
  let tam = cab.readUInt32BE(0);
  const tipo = cab.toString('latin1', 4, 8);
  let cabecera = 8;
  if (tam === 1) {
    tam = Number(cab.readBigUInt64BE(8));
    cabecera = 16;
  } else if (tam === 0) {
    tam = fin - offset;
  }
  if (tam < cabecera || offset + tam > fin) return null;
  return { tam, tipo, cabecera };
}

/** Hijos de una caja ya leída en memoria. */
function* hijos(buf: Buffer, desde: number, hasta: number) {
  let p = desde;
  while (p + 8 <= hasta) {
    let tam = buf.readUInt32BE(p);
    const tipo = buf.toString('latin1', p + 4, p + 8);
    let cabecera = 8;
    if (tam === 1) {
      tam = Number(buf.readBigUInt64BE(p + 8));
      cabecera = 16;
    } else if (tam === 0) {
      tam = hasta - p;
    }
    if (tam < cabecera || p + tam > hasta) return;
    yield { tipo, inicio: p + cabecera, fin: p + tam };
    p += tam;
  }
}

function hijo(buf: Buffer, desde: number, hasta: number, tipo: string) {
  for (const c of hijos(buf, desde, hasta)) if (c.tipo === tipo) return c;
  return null;
}

/** Tamaño de presentación de la pista de vídeo dentro de `moov`. */
function dePista(moov: Buffer): VideoDimensions | null {
  for (const trak of hijos(moov, 0, moov.length)) {
    if (trak.tipo !== 'trak') continue;
    const mdia = hijo(moov, trak.inicio, trak.fin, 'mdia');
    const hdlr = mdia && hijo(moov, mdia.inicio, mdia.fin, 'hdlr');
    // hdlr: versión/flags (4) + pre_defined (4) + handler_type (4).
    if (!hdlr || hdlr.fin - hdlr.inicio < 12) continue;
    if (moov.toString('latin1', hdlr.inicio + 8, hdlr.inicio + 12) !== 'vide') continue;
    const tkhd = hijo(moov, trak.inicio, trak.fin, 'tkhd');
    if (!tkhd || tkhd.fin - tkhd.inicio < 1) continue;

    // Longitud mínima de `tkhd` según su versión: nunca leer de la caja vecina.
    const v1 = moov[tkhd.inicio] === 1;
    if (tkhd.fin - tkhd.inicio < (v1 ? 96 : 84)) continue;
    const matriz = tkhd.inicio + (v1 ? 52 : 40);
    const ancho = moov.readUInt32BE(tkhd.inicio + (v1 ? 88 : 76)) / 65536;
    const alto = moov.readUInt32BE(tkhd.inicio + (v1 ? 92 : 80)) / 65536;
    if (!(ancho > 0 && alto > 0)) continue;

    // Giro de 90°/270°: a = 0 y |b| = 1 en la matriz (16.16).
    const a = moov.readInt32BE(matriz);
    const b = moov.readInt32BE(matriz + 4);
    const girado = a === 0 && Math.abs(b) === 65536;
    return girado ? { width: alto, height: ancho } : { width: ancho, height: alto };
  }
  return null;
}

/**
 * Dimensiones de un vídeo de `public/` a partir de su ruta pública
 * (`/videos/el-show/x.mp4`, con o sin el prefijo de despliegue).
 */
export function videoDimensions(rutaPublica: string): VideoDimensions | null {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const ruta = base && rutaPublica.startsWith(base + '/') ? rutaPublica.slice(base.length) : rutaPublica;
  if (cache.has(ruta)) return cache.get(ruta) ?? null;

  let resultado: VideoDimensions | null = null;
  let fd: number | null = null;
  try {
    // Solo rutas de la lista blanca del contrato (sin `..`): no sale de `public/`.
    if (!/^\/(images|videos)\/[A-Za-z0-9._/-]+\.mp4$/i.test(ruta) || ruta.includes('..')) return null;
    fd = openSync(path.join(process.cwd(), 'public', ruta), 'r');
    const fin = fstatSync(fd).size;
    let offset = 0;
    for (let caja = leerCaja(fd, offset, fin); caja; caja = leerCaja(fd, offset, fin)) {
      if (caja.tipo === 'moov') {
        const moov = Buffer.alloc(caja.tam - caja.cabecera);
        readSync(fd, moov, 0, moov.length, offset + caja.cabecera);
        resultado = dePista(moov);
        break;
      }
      offset += caja.tam;
    }
  } catch {
    resultado = null;
  } finally {
    if (fd !== null) closeSync(fd);
  }
  cache.set(ruta, resultado);
  return resultado;
}
