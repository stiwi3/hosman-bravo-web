import type { NextConfig } from "next";

// BASE_PATH se define en el workflow de GitHub Actions cuando se publica
// en GitHub Pages bajo un subdirectorio (ej: usuario.github.io/hosman-bravo).
const basePath = process.env.BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
