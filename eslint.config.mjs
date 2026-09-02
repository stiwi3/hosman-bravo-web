import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // El CMS es un proyecto de Google Apps Script, no parte de la web: otro
    // runtime, otras reglas y su propia suite de pruebas en Node. Se sincroniza
    // con clasp y está fuera del repositorio (ver ARCHITECTURE.md §8).
    "apps-script/**",
  ]),
]);

export default eslintConfig;
