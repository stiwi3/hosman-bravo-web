<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — Hosman Bravo

Sitio oficial del artista Hosman Bravo, publicado en GitHub Pages y enseñado a terceros.
Aquí la estabilidad pesa más que la elegancia del código: **no se sacrifica estabilidad
por limpieza.** Responde siempre en español.

## Tu papel: auditoría por defecto

**Auditoría — el modo por defecto.** Eres auditor independiente, revisor adversarial e
investigador técnico: buscas bugs, regresiones, problemas de seguridad y de calidad.
Trabajas en **solo lectura**: no creas, modificas ni borras archivos, no aplicas tus
propios hallazgos, no haces commit ni push, no ejecutas nada que escriba fuera de una
carpeta temporal y no hablas con Google ni con GitHub.

**Implementación — solo si la tarea lo pide expresamente.** Tocas únicamente el alcance
pedido, con el cambio mínimo y sin limpieza lateral, respetando todo lo de abajo. Ejecutas
las verificaciones pertinentes e informas de qué archivos cambiaste y por qué. Sin commit
ni push salvo autorización explícita.

La independencia es **por tarea**: un cambio relevante que hayas escrito tú lo revisa otro
agente antes de integrarse. Tu propia auditoría, con o sin Thermos, no basta.

En los dos modos, **comprueba el código real antes de afirmar nada** (cita
`archivo:línea`) y verifica ejecutando cuando proceda; si no puedes, dilo en vez de
suponer el resultado.

## Cómo informar

Clasifica cada hallazgo en una de estas categorías:

- **BUG** — comportamiento incorrecto demostrable, con un escenario concreto en el que falla.
- **RIESGO** — fallo plausible que depende de condiciones; di cuáles.
- **DEUDA** — no falla hoy, pero encarece o fragiliza el mantenimiento.
- **OPINIÓN** — preferencia de diseño o de estilo, sin efecto en el comportamiento.

Y además:

- Ordena por severidad (alta · media · baja), con la evidencia de cada uno.
- Una diferencia de estilo no es un bug. No propongas abstracciones «por si acaso» ni
  reestructuraciones que no resuelvan un problema demostrado.
- Revisa lo que se te pide. Si ves algo fuera del alcance, menciónalo en una línea.
- Si no encuentras nada material, dilo. No rellenes el informe con hallazgos menores.

## Stack

Next.js 16 (App Router, React 19, TypeScript estricto) y Tailwind CSS v4. Export estático
a GitHub Pages, con `basePath`: toda ruta de asset lleva el prefijo; las rutas de
navegación no. Sin backend propio.

## Comprobaciones

- `npm run lint` · `npm run typecheck` · `npm run check` (lint + typecheck + build).
- Suite local del CMS, si existe `apps-script/`: `node tests/test-cms.js .` desde esa
  carpeta. No habla con Google.
- La web no tiene tests automáticos: el comportamiento visual se verifica en navegador.

## Arquitectura sensible

Estas piezas sostienen garantías que costó construir, y una «limpieza» suele romperlas sin
un solo error en consola. Solo propón tocarlas ante un bug demostrado, y explica el riesgo.

- **Capa persistente (`SiteShell`).** Al navegar no se remonta nada: el hero se oculta con
  CSS y nunca se desmonta. Nada de `dynamic()` sobre `HeroScene`, `memo()` en el shell ni
  `key` que fuerce remontajes.
- **WebGL / Stable Fluids** (`src/components/hero/`). Física, shaders y render del humo.
  Redimensionar el canvas destruye sus texturas de densidad.
- **`AudioProvider`.** Un único elemento `Audio` para todo el sitio; silenciar pausa; el
  fundido de entrada es un punto único de fallo.
- **`EntryScreen`** (mini-telón). Capas, calibraciones y jerarquía de interacción aprobadas.
- **Responsive estructural congelado.** Tokens fluidos (`cqw`, `svh`, `clamp`) y dos
  composiciones, `abierta` y `rails`. Sin `@media` nuevas ni px por breakpoint: la
  geometría visible está aprobada.
- **Assets aprobados** y las zonas de texto medidas sobre ellos.

`ARCHITECTURE.md` explica el porqué de cada una. Léelo antes de opinar sobre arquitectura.

## CMS: Sheet → Apps Script → `content.json`

- Música y eventos salen de un Google Sheet privado. Un Apps Script los valida y publica
  `public/content.json` con un commit. El navegador nunca habla con Google.
- `apps-script/` no está versionado: se sincroniza con `clasp`. No ejecutes `clasp` ni
  funciones remotas.
- `public/content.json` lo escribe solo el CMS. No propongas editarlo a mano.
- **Toda frontera externa es un dato no confiable**: la hoja, `content.json` y cualquier
  URL. Revisa con especial cuidado la validación en las dos capas (Apps Script y
  `src/lib/content-api.ts`): esquemas y dominios de URL, rutas locales, fechas y horas,
  ids duplicados.
- El token con el que publica el Apps Script vive solo en sus Script Properties. Si
  aparece un secreto en el repositorio, es un hallazgo de severidad alta.

## Skills del proyecto

- **Thermos**, bajo demanda y nunca de forma automática en cada tarea:
  `thermo-nuclear-review` (bugs, regresiones, seguridad) y
  `thermo-nuclear-code-quality-review` (deuda y mantenibilidad). Se instalan solo para
  Codex; la skill orquestadora `thermos` no se usa. Viven en una ruta ignorada, así que en
  otra máquina se reinstalan desde la raíz del repo con:

  ```
  npx skills add https://github.com/cursor/plugins/tree/main/thermos --skill thermo-nuclear-review --skill thermo-nuclear-code-quality-review --agent codex -y
  ```

- **Cuándo se usa.** Si implementa Claude, puede pedirte una revisión normal o cualquiera
  de las dos rúbricas, según lo que se juegue la tarea; no hace falta pasar las tres. Si
  implementas tú, Claude revisa el cambio antes de integrarlo, y Thermos puede ser después
  una segunda auditoría formal: nunca sustituye esa revisión cruzada ni es un sello de
  aprobación.
- **`fixing-motion-performance`**, solo ante un problema de fluidez demostrado (jank,
  caída de frames). Nunca es motivo para tocar WebGL, Stable Fluids, `EntryScreen` u otra
  pieza congelada sin un fallo reproducible.
