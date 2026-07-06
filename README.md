# Hosman Bravo — Sitio Web Oficial

Sitio web oficial de **Hosman Bravo**, "El Rey de los Caballos" — cantautor colombiano de música popular y domador de caballos de alta escuela (Medellín, Colombia).

🌐 **Sitio en vivo:** https://stiwi3.github.io/hosman-bravo-web/

## Secciones

- **Inicio** — Presentación del artista con fotos del show en vivo
- **Galería** — Fotos de shows, sesiones y el elenco ecuestre
- **Sobre mí** — Biografía, discografía y redes sociales
- **Contacto** — Formulario de contrataciones

## Tecnología

- [Next.js 16](https://nextjs.org/) (App Router, React 19, TypeScript)
- [Tailwind CSS v4](https://tailwindcss.com/)
- Export estático desplegado en GitHub Pages

## Desarrollo local

```bash
npm install
npm run dev
```

El sitio queda disponible en `http://localhost:3000`.

Otros comandos:

```bash
npm run build      # Build de producción (export estático en out/)
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run check      # lint + typecheck + build
```

## Edición de contenido

Todo el contenido del sitio (textos, biografía, canciones, redes sociales, rutas de imágenes) está centralizado en [`src/data/hosman-data.ts`](src/data/hosman-data.ts). Las imágenes viven en [`public/images/`](public/images/).

## Despliegue

Cada push a la rama `master` despliega automáticamente a GitHub Pages mediante el workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml).

## Redes de Hosman Bravo

[Instagram](https://www.instagram.com/hosmanbravo/) · [TikTok](https://www.tiktok.com/@hosman_bravo) · [YouTube](https://www.youtube.com/@hosmanbravo) · [Facebook](https://www.facebook.com/hosman.bravo/) · [Spotify](https://open.spotify.com/intl-es/artist/5IZ9yQEhRQ3rTq76sm93R3)
