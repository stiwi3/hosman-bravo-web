# BRAND.md — identidad de marca en la web

Contrato operativo de identidad visual de este sitio. Traduce el manual de marca de Hosman
Bravo a reglas concretas; no lo sustituye. Cómo está construido el sistema: [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Fuentes de verdad

`Manual PDF → assets oficiales → BRAND.md → implementación`

| Capa | Qué es |
|---|---|
| **Manual de marca** | Fuente normativa original: `public/references/Hosman Bravo_Manual de marca.pdf` (fuera de git, 9 páginas). Ante cualquier duda de forma, color o construcción, manda el PDF revisado **visualmente**. |
| **Assets oficiales o derivados fielmente del master** | Recursos gráficos que usa la implementación, en `public/images/logo/` (§3). |
| **BRAND.md** (este) | Reglas vigentes. Debe bastar para aplicar la identidad sin consultar nada más. |
| **Obsidian** | Contexto ampliado, investigaciones, motivos y excepciones en detalle: `Segunda-cabeza/Proyectos/Hosman Bravo/Identidad de marca — excepciones y pendientes.md`. Solo hace falta para retomar una excepción. |

## 2. Categorías

Toda pieza visible cae en una sola categoría, y la categoría decide qué reglas se le aplican.

| Categoría | Qué es | Reglas |
|---|---|---|
| **Marca oficial** | Isotipo, logotipo, imagotipo y slogan oficial. | Fidelidad total al manual (§3–§5). |
| **Branding secundario** | Descriptores y piezas que evocan la marca sin ser la marca: «EL REY DE LOS CABALLOS», «MÚSICA POPULAR · SHOWS EN VIVO», medallones, menú de cuero. | Lenguaje de marca (§6). Nunca se presenta como logotipo ni como slogan. |
| **Título editorial** | Título principal de cada sección. | Cinzel Bold (§7). |
| **Contenido editorial** | Cuerpo de texto, bajadas, subtítulos internos, fichas. | Sistema tipográfico actual del sitio. |
| **UI funcional** | Reproductor, canciones, artistas, SOUND ON/OFF, navegación, botones, Próximos Shows, eventos, fechas, formularios, labels, metadatos. | Sistema tipográfico actual. **Nunca Cinzel.** |

## 3. Marca oficial

- **Isotipo:** cabeza de caballo con crin, corona y media luna en «C».
- **Logotipo:** «Hosman Bravo» en **Cinzel Regular con stroke de 2 pt**: H y B a altura de
  mayúscula, el resto en versalita, con el degradado dorado y la sombra desplazada que
  forman parte del propio master.
- **Imagotipo:** isotipo encima y logotipo debajo. El manual permite deconstruirlo en
  isotipo solo o logotipo solo.
- **Slogan oficial:** «Más bravo que nunca», en **Creato Display Medium Italic** con
  espaciado muy abierto. No se usa en la web y no se añade solo porque exista.

**Assets**

| Asset | Origen | Uso actual |
|---|---|---|
| `logotipo-dorado.svg` | Derivado del manual (ver abajo) | Firma del telón. Logotipo a cualquier tamaño. |
| `logotipo-dorado.png` / `-blanco.png` | PNG del diseñador, 758×76 | Pie de página. Solo a tamaño pequeño (§8). |
| `imagotipo-dorado.png` / `-blanco.png` | PNG del diseñador, 758×796 | Contacto. |
| `isotipo-dorado.png` / `-blanco.png` | PNG del diseñador, 613×647 | Hero, favicon, reserva de MÚSICA. |

**Procedencia de `logotipo-dorado.svg`.** No lo entregó el diseñador: deriva de los
contornos vectoriales del logotipo que contiene el propio manual (página 4).

- **Geometría:** conserva la del master del PDF (8 contornos de letra, la sombra y las
  matrices del degradado). **No es una reconstrucción tipográfica aproximada.**
- **Color:** la traducción CMYK → RGB usa los valores digitales que especifica el manual en
  la página 3. El degradado se interpola en RGB, así que puede diferir en matices mínimos
  del render CMYK del PDF.
- **Sombra:** la sombra desplazada forma parte del master y va dentro del SVG. No es una
  sombra añadida por CSS.
- **Mantenimiento:** no se edita a mano. Si cambia el manual, se vuelve a extraer.

## 4. Cuándo asset y cuándo construcción tipográfica

Para representar el logotipo, por orden de preferencia:

1. **Asset oficial existente** con resolución suficiente para su tamaño de uso.
2. **Asset derivado fielmente del master del manual**, sin reinterpretar la geometría.
3. **Construcción tipográfica**, solo si se demuestra que reproduce el manual. Hay que
   verificar Cinzel Regular, el stroke de 2 pt (o su equivalente digital), H y B frente a
   las versalitas, tracking, proporciones, color o degradado y la sombra, y compararla
   visualmente con el asset oficial.

**Escribir `HOSMAN BRAVO` en Cinzel no es el logotipo.** Una construcción aproximada no se
considera logotipo oficial; si se conserva, se registra como excepción (§10). **El stroke de
2 pt es exclusivo del logotipo**: ningún título ni descriptor lo lleva.

## 5. Colores y prohibiciones

- **Degradado dorado:** `#EBD678` · `#EAD59D` · `#8A6B29` · `#F3DA8D`.
- **Una tinta:** negro `#000000` y blanco `#FFFFFF`.
- **Prohibido** distorsionar o girar la marca.
- **No añadir sombras adicionales ni efectos externos** (`drop-shadow`, `text-shadow`,
  filtros, opacidades) a la marca oficial, salvo que una aplicación de marca esté
  expresamente diseñada y aprobada. Las sombras que ya forman parte del master no cuentan
  como añadidas.

## 6. Branding secundario

- **«EL REY DE LOS CABALLOS»:** descriptor de marca secundario. No es logotipo ni slogan.
  Puede usar Cinzel como lenguaje de marca, **sin stroke**.
- **«MÚSICA POPULAR · SHOWS EN VIVO»:** descriptor secundario, no el slogan. Dirección
  futura: Creato Display Medium Italic, cuando su licencia web esté confirmada.
- **Aplicaciones materiales** (cuero, metal, relieve, medallones): se permiten como
  tratamiento, pero su geometría debe **partir del isotipo o logotipo oficial**. Si no, son
  excepciones y no representan oficialmente la marca.

## 7. Títulos editoriales principales

- **Regla compartida:** utilidad `titulo-editorial` en `src/app/globals.css`, la única que
  nombra Cinzel (`var(--font-cinzel)`). Reúne familia, tamaño, interlínea y peso de la
  escala `--text-section`. Ningún componente declara Cinzel por su cuenta.
- **Fuente:** Cinzel **Bold (700)**, único peso cargado, autoalojada con `next/font/google`
  (licencia OFL). No hay peticiones a Google durante la visita.
- **La llevan:** «EL SHOW», «EL ELENCO ECUESTRE», «LA MÚSICA», «GALERÍA», «SOBRE HOSMAN
  BRAVO» y «CONTRATACIONES».
- **No la llevan:** encabezados de módulo o tarjeta («ÚLTIMO LANZAMIENTO», «PRÓXIMOS
  SHOWS», los h3 de SOBRE MÍ, los nombres de los caballos…), el contenido editorial ni la
  UI funcional. Para añadir un título nuevo a esta jerarquía, debe ser inequívocamente un
  título principal de sección.

## 8. Tamaño mínimo y área de respeto en digital

- Los **4 cm** del manual son para soporte físico y **no se convierten a px**. Los mínimos
  digitales se fijan por pieza con pruebas reales (legibilidad, densidad de píxel,
  contexto y área de respeto) y se anotan aquí cuando existan.
- **Área de respeto:** la altura de la «H» del logotipo, libre de elementos ajenos a la marca.
- **Raster:** un PNG solo vale si su ancho en píxeles cubre `ancho CSS × DPR`, al menos
  hasta DPR 2. Si no, se usa el vector.

## 9. Creato Display

No está incorporada y **no se añade** hasta verificar con certeza su licencia de uso web.
Nunca se reutilizan los subconjuntos de fuente incrustados en el PDF.

## 10. Excepciones y pendientes conocidos

Nada de lo que sigue representa todavía la aplicación ideal del manual. Contexto de cada
punto en la nota de Obsidian (§1).

**Excepciones visibles hoy**

1. Rótulo del hero (`Letras sin fondo.png`): no es el logotipo oficial.
2. Marca incrustada en `Hero.mp4`, pendiente de un vídeo limpio. No se tapa, recorta ni altera.
3. Medallones del telón: no parten del isotipo.
4. Marca integrada en el menú de cuero (`menu-header.webp`).
5. Sombra y opacidad añadidas al isotipo del hero.
6. Isotipo al 45 % de opacidad en la reserva de MÚSICA.
7. «EL REY DE LOS CABALLOS» y «MÚSICA POPULAR · SHOWS EN VIVO» con la tipografía actual (§6).

**Pendientes**

8. Licencia web de Creato Display (§9).
9. Posible uso futuro de «Más bravo que nunca».
10. Tamaños mínimos digitales de las aplicaciones de marca (§8).
11. Variantes negras del logo: se incorporan solo si aparece un uso real.
