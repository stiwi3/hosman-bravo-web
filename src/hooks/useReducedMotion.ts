'use client';

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;

/** En el servidor no hay preferencia que consultar: se asume movimiento normal. */
const getServerSnapshot = () => false;

/**
 * Indica si el usuario ha pedido movimiento reducido en su sistema.
 *
 * Usa `useSyncExternalStore` porque la preferencia es una fuente externa: así
 * el valor correcto está disponible en el primer render del cliente sin
 * provocar renders en cascada.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
