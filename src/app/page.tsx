/* ---------------------------------------------------------------------------
   INICIO (`/`).

   Esta ruta NO renderiza nada a propósito. La escena de portada —hero, vídeo,
   humo, rótulo, redes y próximos shows— la monta `SiteShell`, que es la capa
   persistente, y se oculta con CSS cuando la ruta es otra.

   Si el hero viviera aquí, navegar a `/galeria` lo desmontaría y destruiría el
   contexto WebGL junto con las texturas de densidad del humo, que SON su
   estado: al volver arrancaría vacío. Ver ARCHITECTURE.md §3 y §6.
--------------------------------------------------------------------------- */
export default function Home() {
  return null;
}
