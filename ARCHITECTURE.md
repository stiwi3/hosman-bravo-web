# ARCHITECTURE.md

Mapa estable de **cómo está construido** hosman-bravo-web. No es una bitácora: si algo
de aquí cambia con cada sesión, no pertenece a este archivo (va a `PROGRESS.md`).

> Reparto documental — `CLAUDE.md` reglas para el agente · **`ARCHITECTURE.md` cómo está
> construido el sistema** · `PROGRESS.md` estado, tareas y decisiones recientes ·
> `MEMORY` preferencias de trabajo · `../HOSMAN_BRAVO_PROYECTO_MAESTRO.md` historia,
> negocio y contenido. No duplicar entre ellos.

---

## 1. Idea de partida

**No es una landing con scroll: es una experiencia por escenas.** INICIO, EL SHOW,
MÚSICA, GALERÍA, SOBRE MÍ y CONTACTO son escenas de una misma experiencia continua, no
páginas independientes. Cambiar de escena **no** debe interrumpir lo que ya está
ocurriendo: la música sigue sonando y el humo sigue evolucionando.

Esa continuidad es el requisito que gobierna toda la arquitectura de abajo.

---

## 2. Rutas

Rutas reales de Next (App Router), no estado interno:

| Ruta | Escena | Archivo |
|---|---|---|
| `/` | INICIO | `src/app/page.tsx` (devuelve `null`, ver §3) |
| `/el-show` | EL SHOW | `src/app/el-show/page.tsx` |
| `/musica` | MÚSICA | `src/app/musica/page.tsx` |
| `/galeria` | GALERÍA | `src/app/galeria/page.tsx` |
| `/sobre-mi` | SOBRE MÍ | `src/app/sobre-mi/page.tsx` |
| `/contacto` | CONTACTO | `src/app/contacto/page.tsx` |

Cada `page.tsx` de sección es un componente servidor mínimo que renderiza su sección de
`src/components/sections/`. Añadir una escena = crear su carpeta de ruta, su componente
de sección y su entrada en `NAV_ITEMS` (`src/data/types.ts`).

---

## 3. SiteShell — la capa persistente

**El único concepto que hay que entender antes de tocar nada.**

```
src/app/layout.tsx                  Server Component
└── <AudioProvider>                 estado global de audio
    └── <SiteShell>                 Client Component · NUNCA se desmonta
        ├── <EntryScreen />         telón z-100
        ├── <header>                menú de cuero · nav central · TrackPlayer · MusicPlatforms
        ├── <HeroScene />           INICIO · SIEMPRE montado, se oculta con CSS
        ├── {children}              ← lo ÚNICO que cambia al navegar
        └── <footer>                solo fuera de `/`
```

El App Router preserva el layout y su estado entre navegaciones de cliente; solo se
reemplaza `children`. Todo lo que deba sobrevivir a un cambio de ruta vive en el
`SiteShell`, **no** en una ruta.

Por eso `src/app/page.tsx` **devuelve `null`**: INICIO no es contenido de la ruta `/`, lo
pinta el shell. Si el Hero viviera en `page.tsx`, navegar a `/galeria` lo desmontaría y
destruiría el contexto WebGL.

**El shell no lleva `key`.** Es lo que garantiza que React lo reconcilie como el mismo
elemento en cada navegación.

### Cómo sabe el shell qué escena está activa

`useSelectedLayoutSegment()` de `next/navigation` — devuelve `null` en `/` y el segmento
(`'galeria'`, `'musica'`…) en las demás.

**No usar `usePathname()` para esto.** `useSelectedLayoutSegment` lee el árbol de rutas,
no la cadena de URL, así que es **agnóstico al `basePath`**: funciona igual en local
(`/galeria`) que en GitHub Pages (`/hosman-bravo-web/galeria`).

### Ocultación del Hero

```tsx
<div className={segment === null ? 'contents' : 'hidden'}>
```

`hidden` es `display:none`, no desmontaje. El `ResizeObserver` de `InteractiveSmoke`
recibe entonces 0×0 y `applySize` sale por su guarda `if (cssWidth <= 0) return`, que es
justo lo que **impide que las texturas de densidad se recreen**. Ver §6.

---

## 4. Audio

`AudioProvider` (`src/components/audio/AudioProvider.tsx`) vive en `layout.tsx`, por
encima del shell. Crea **un único** elemento `Audio` en un efecto con dependencias `[]`.

- **Nunca crear un segundo elemento de audio en ninguna parte del sitio.** Si una escena
  necesita reproducir otra pista, se amplía el provider.
- Silenciar **pausa**: play/pause y sound on/off gobiernan un único estado y no pueden
  contradecirse.
- Consumidores actuales: `EntryScreen` (`enter`), `TrackPlayer` (el resto) y `SiteShell`
  (`hasEntered`, para saber si detrás del telón hay que mostrar el destino final o el
  hero — ver §3).
- **Suspensión con contador:** `suspend(id)` / `release(id)` apartan la canción de fondo
  sin pisar a quien la haya pausado a propósito. Al primer `suspend` se apunta si sonaba
  (`wasPlayingRef`) y se pausa; los `id` activos viven en un `Set`, así que dos avisos de
  suspensión no se pisan entre sí; al último `release` se reanuda **solo si sonaba**.
  Su único consumidor es `YouTubeModal` (`src/components/music/`), con el id
  `'youtube-modal'` — las previews muteadas de la cuadrícula NO deben llamarlo: un
  `<iframe>` muted y el `<audio>` no compiten por nada.

### YouTubeModal

El videoclip a pantalla completa. **Su ciclo de vida es el montaje**: `MusicSection` lo
renderiza solo mientras hay vídeo abierto, así que bloqueo de scroll, suspensión del audio
y destrucción del reproductor son la limpieza de React y no tres apagados manuales.

⚠️ **Es un `<iframe>` normal, NO la IFrame Player API (`YT.Player`), y es deliberado.** La
API sirve para mandar sobre el reproductor desde fuera (silenciar, arrancar en un segundo
concreto, coordinar varios); el modal no hace nada de eso. Traerla obliga a repartir el
callback global único `onYouTubeIframeAPIReady`, a proteger un `destroy()` que no está
documentado como idempotente ni como seguro antes de `onReady`, a cancelar la creación si
el componente se desmonta durante la carga del script, y a meter una carga asíncrona entre
el clic y el reproductor —lo que debilita la activación que el navegador exige para sonar—.
Un `<iframe>` se destruye solo al desmontarse, que es justo lo que se quiere aquí.

El cargador compartido de la API llegará con las **previews** de la cuadrícula, que sí lo
necesitan. Contrapartida asumida: sin la API no se leen los códigos de error (101/150,
vídeo no embebible); YouTube pinta su propio aviso con enlace, y no se puede sustituir.

El dominio es `youtube-nocookie.com`, y el `autoplay=1` de la URL **necesita además**
`allow="autoplay; …"` en el iframe o el navegador lo ignora.

⚠️ El reproductor es un documento de otro origen: en cuanto el foco entra en él, ni Escape
ni la trampa de foco pueden actuar desde dentro. Por eso el botón de cerrar va fuera del
reproductor, recibe el foco al abrir, y el fondo también cierra.

### EntryScreen

El telón no es solo estética: los navegadores no permiten reproducir audio sin un gesto
del usuario, y el clic en «ENTRAR A LA EXPERIENCIA» **es** ese gesto (dispara `enter()`).

Consecuencia para cualquier automatización: `agent-browser open http://localhost:3000`
muestra la prepágina, no INICIO. **Hay que pulsar el botón antes de medir o capturar**, y
con un clic real — `.click()` de JS no cuenta como gesto y el navegador bloquea el audio.

Al entrar directamente por una ruta de sección el telón también aparece: es correcto, el
gesto de audio sigue siendo necesario.

**Bloqueo de scroll compartido.** Mientras el telón está visible no debe poder
desplazarse la página, pero `document.body` es un recurso único: si otra pieza (un modal
de vídeo) también lo bloqueara escribiendo `overflow` a mano, la primera en soltarlo
restauraría el scroll con la segunda todavía abierta. Por eso `EntryScreen` no toca
`document.body.style.overflow` directamente — usa `useScrollLock(activo)`
(`src/hooks/useScrollLock.ts`), que lleva un contador de módulo: solo el primer bloqueo
guarda el valor original y solo el último lo restaura. Cualquier pieza nueva que necesite
bloquear el scroll debe pasar por el mismo hook.

---

## 5. Hero

`HeroScene` reúne las capas de INICIO: fondo, `Hero.mp4` con máscara CSS de cuatro lados,
`InteractiveSmoke`, rótulo, redes + bocadillo de contratación y bloque de próximos shows.

**INICIO no tiene scroll:** ocupa `100svh` con `overflow-hidden`. Las otras cinco escenas
sí tienen scroll normal.

Coste asumido de la persistencia: el Hero está montado también en `/contacto`, `/musica`,
etc. (oculto). Es el precio de que el humo y el vídeo sobrevivan a la navegación.

---

## 6. WebGL / Stable Fluids — infraestructura sensible

```
src/components/hero/
  InteractiveSmoke.tsx   ciclo de vida: contexto, tamaño, visibilidad, puntero, limpieza
  fluidSimulation.ts     física (Stable Fluids)
  smokeRenderer.ts       aspecto
  webglUtils.ts          programas, texturas, framebuffers
```

Separación limpia y deliberada. **No tocar física ni shaders** salvo petición explícita.

Lo que hay que saber para no romperlo:

- **La forma del humo ES el estado de las texturas de densidad.** No es ruido procedural:
  es densidad advectada. Recrear las texturas arranca de cero y tarda 10–15 s en
  acumular humo visible.
- `simulation.resize()` destruye y recrea esas texturas. Solo debe llamarse con un tamaño
  real distinto — de ahí la guarda de `applySize`.
- **La portada nunca se desmonta** (§3). Es la única forma de que el contexto WebGL y las
  texturas sobrevivan.
- El bucle se detiene solo fuera de vista: `IntersectionObserver` + `visibilitychange`,
  ambos consultando el estado de visibilidad real del hero.
- `dispose()` en cascada libera programas, texturas y framebuffers. No se fuerza
  `loseContext()` a propósito: en un remontaje volvería perdido e inservible.
- Al medir el humo: la simulación necesita ~700 pasos para llegar al equilibrio.

---

## 7. Sistema responsive de tokens fluidos

**No hay ni una sola `@media` en el código fuente. Mantenerlo así.**

La razón: entre los dos monitores de referencia (2048×1023 y 1280×591) el ancho **no**
cambia de escalón de Tailwind — ambos están en `md:`. Lo que cambia es el **alto** (−42%),
e INICIO vive encerrado en `100svh`.

Dos capas en `src/app/globals.css`:

- **`:root`** — tokens de layout consumidos por `var()`/`calc()`, o derivados unos de
  otros (`@theme` no permite lo segundo): `--hb-menu-w`, `--hb-header-pad`,
  `--hb-header-h`, `--hb-hero-inset`, `--hb-control`, `--hb-control-social`,
  `--hb-player-w`, `--hb-music-gap`, `--hb-ticket-w`, `--hb-shows-panel-max`.
- **`@theme`** — los que deben generar utilidad de Tailwind: `spacing-scene-x/-top/
  -bottom`, `spacing-block`, `container-content/-narrow`, `text-section`, `text-nav`.

Fórmula: `clamp(mínimo, a·vw + b·svh, máximo)`. El **máximo** se calibra para devolver en
2048×1023 exactamente el valor aprobado; el **mínimo** es el suelo de legibilidad de esa
pieza. `svh` y no `vh`, porque INICIO ya usa `100svh`.

`--spacing-scene-top` se deriva de `--hb-header-real-h`, que publica un `ResizeObserver`
sobre el `<header>` real (en `SiteShell`). Así la reserva superior de las escenas con
scroll conoce la altura de verdad de los dos flancos de la cabecera, que no es simétrica.

### Reglas al escribir medidas nuevas

1. **Buscar primero si ya existe token.** Las escenas con scroll parten de `SCENE`,
   `SCENE_FULL` y `SCENE_CONTENT` (`src/components/sections/`).
2. **Texto sobre un asset fotográfico va en `cqw`**, con `container-type: inline-size` en
   la caja de la imagen y un suelo en px: `max(9px, 3.99cqw)`.
3. ⚠️ **Un elemento con `container-type: inline-size` NO puede usar `cqw` sobre sí
   mismo.** Ese contexto es para sus DESCENDIENTES; sin contenedor de referencia, `cqw`
   cae al viewport. Ya pasó una vez (devolvía 68px en vez de 10px). Para el propio
   contenedor, derivar del token con `calc()`.
4. **Las clases de Tailwind con interpolación en tiempo de ejecución no se compilan.** El
   JIT necesita leer la clase como texto literal en el fuente: nunca
   `` `w-[${x}px]` ``.
5. Los breakpoints quedan reservados para cambios reales de **forma** (una rejilla que
   colapsa), que llegarán con tablet/móvil.
6. Nada de `transform: scale()` global: escalaría grosores, sombras y el grano del cuero.

---

## 8. Datos

Hay **dos** orígenes, y no se mezclan:

**Contenido fijo** — `src/data/hosman-data.ts`: textos, biografía, caballos, enlaces de
redes, rutas de assets. Lo edita quien toca el código.

**Contenido publicable** — `public/content.json`: lo edita Hosman desde una hoja de
cálculo y lo publica él mismo. Hoy contiene `music`; `events` y `config` están previstos.

`src/data/types.ts` — **frontera de tipos**: `SectionId`, `NavItem`, `ShowEvent`,
`MusicRelease` y demás. Ningún componente define la forma de los datos que pinta.

### El circuito de publicación

```
Hosman → Google Sheet privado → botón PUBLICAR
       → Apps Script: valida TODO antes de tocar nada
       → API de GitHub: reescribe public/content.json + commit
       → despliegue del sitio
       → el navegador lee /content.json como un asset más
```

**El visitante nunca habla con Google.** Antes el navegador pedía el catálogo a un Apps
Script que leía la hoja en vivo, y una petición llegó a tardar 23 s. Ahora esa latencia la
paga Hosman una vez al publicar; el visitante siempre ve el último snapshot válido.

**Si la validación falla, no se publica nada** y el snapshot anterior queda intacto. Y
como cada publicación es un commit, hay historial y se puede volver atrás.

`src/lib/content-api.ts` es la **única** frontera con ese contenido: valida el sobre
(`schemaVersion === 1`, `music` es array), valida fila a fila, traduce snake_case a
camelCase y devuelve `MusicRelease[]`. Nada más en la aplicación sabe de dónde salen los
datos.

⚠️ **El snapshot NO es de fiar por estar en nuestro repositorio.** Lo genera un script a
partir de lo que alguien escribe en una hoja. La validación de cliente se mantiene entera:
una fila inválida se descarta sola, un campo inválido se descarta solo. Las URL se
comprueban por **hostname completo** —un enlace de Amazon pegado en la columna de Apple no
puede acabar bajo el icono de Apple— y `youtube_id` solo se acepta como identificador de
11 caracteres, nunca como HTML.

**`cover_url` acepta dos formas**, resueltas por `parseCoverReference()`: una URL
`http(s)` externa, o una ruta interna bajo `/images/covers/` (con `${bp}` aplicado para
GitHub Pages). Cualquier otra ruta, `//dominio` disfrazado de ruta local, o un `..` se
descarta. El Apps Script valida lo mismo en su lado (`cleanUrlOrLocalPath` con prefijo,
en `apps-script/Validation.js`) — la portada solo se sube al Sheet si ambas capas la
aceptarían, pero la web nunca confía en que el Apps Script ya lo hizo.

**De la portada sale además cómo se PINTA la pieza, no solo su imagen.**
`releasePresentation()` (`src/data/music-releases.ts`) es un eje aparte de
`releaseKind()`: `kind` (`'video' | 'audio'`) dice si hay videoclip reproducible;
`presentation` (`'window' | 'object'`) dice si hay portada propia. Con portada, la pieza
es un OBJETO (funda cuadrada + vinilo) porque las portadas se entregan cuadradas y a
sangre perderían el título; sin ella, es una VENTANA a la miniatura de YouTube
(`i.ytimg.com/vi/<id>/maxresdefault.jpg`, con respaldo a `hqdefault.jpg`), que ya nace en
16:9. `ReleaseVisual.tsx` pinta las portadas con `<img>` y no `next/image`: con
`images.unoptimized` (obligado por el export estático) `next/image` no optimiza nada pero
sigue exigiendo declarar cada host remoto en `remotePatterns`, y `cover_url` puede apuntar
a cualquier alojamiento que Hosman decida usar.

### Patrón obligatorio para nuevas hojas del CMS

Al conectar una hoja nueva (`02_EVENTOS`, `03_CONFIG_GLOBAL`…), replicar lo ya hecho en
`01_MUSICA`:

1. **La hoja es la primera capa preventiva**, no la única: formatos, desplegables,
   casillas y notas para que el editor se equivoque menos.
2. **Apps Script es la capa autoritativa.** Una `validate[Recurso]ForPublication_()` que
   lea la hoja sin caché, valide todas las filas activas y devuelva `{ok, errors, data}`.
3. Las filas **inactivas son borradores** y pueden estar incompletas; las activas deben
   cumplir todos los campos obligatorios.
4. Cada error lleva al menos `sheet`, `row`, `field` y `message`, para poder mostrárselo
   al editor.
5. `publishContentSnapshot()` valida **todos** los recursos antes de llamar a GitHub. Un
   solo error crítico cancela la publicación entera.
6. Reutilizar los cleaners existentes (`cleanString`, `cleanUrl`, `formatDateDDMMYYYY`…);
   no duplicarlos.
7. **No publicar campos editoriales internos** como `notes`.
8. Mantener `events`, `config`, etc. en la raíz del snapshot aunque estén vacíos.
9. **No tocar `publishJsonToGitHub_()`** salvo necesidad justificada: es infraestructura
   probada.
10. Definir por escrito, para cada hoja: campos obligatorios, opcionales, derivados,
    formatos, unicidad de IDs y qué es público.
11. Añadir un `setup[Recurso]Sheet()` para que las validaciones visuales de la hoja sean
    reproducibles y no dependan de configuración manual.

### El Apps Script, por dentro

**No vive en este repositorio.** Vive en Google, asociado al Sheet, y se sincroniza con
`clasp` a una carpeta `apps-script/` que está en `.gitignore`. Para recuperarlo en una
máquina nueva: `npm i -g @google/clasp`, `clasp login`, y `clasp clone-script <ID>` — el
Script ID está en el Sheet, en *Extensiones → Apps Script → ⚙ Configuración del proyecto*
(y anotado en `PROGRESS.md`, que es local).

Seis módulos, separados por responsabilidad:

| Archivo | Qué hace |
|---|---|
| `Config.js` | IDs, `MUSIC_HEADERS`, `musicColumn_`. **Única definición del esquema** |
| `Validation.js` | Limpiadores puros y dominios oficiales por plataforma |
| `Music.js` | `readMusicSheet_` (una sola lectura) + `validateMusicForPublication_` |
| `GitHub.js` | Configuración de Script Properties y publicador |
| `Publish.js` | Lógica, resultado y presentación separados |
| `SheetSetup.js` | Mantenimiento reproducible de la hoja, idempotente |

Decisiones que no son obvias y conviene no deshacer:

- **Una sola lectura de la hoja por publicación.** Antes había dos, lo que además abría
  una ventana para editar entre ambas y validar una cosa publicando otra.
- **El validador devuelve directamente el modelo publicable**, sin pasar por un objeto
  intermedio con `active` y `notes`. Así esos campos no pueden filtrarse por descuido.
- **`Ui.alert()` nunca se muestra con el cerrojo tomado.** `alert` suspende la ejecución
  esperando a que alguien pulse un botón, y un `LockService` no debe sostenerse durante esa
  espera. `publishContentSnapshot()` devuelve un resultado; `publishFromSheet()` lo
  traduce a diálogo, ya fuera de la sección crítica.
- **No hay `doGet`.** El Apps Script no expone ninguna API: es solo el backend editorial.
- **Las fórmulas de la hoja se escriben sin argumentos** (`=LEN($F3)>0`, no
  `=IF(...,TRUE,FALSE)`). Una hoja configurada en una región que usa `;` como separador no
  interpreta las comas y devuelve `#ERROR!` en toda la columna.
- **Cada escritura de `setupMusicSheet()` va aislada con su propio `flush()`.** Apps Script
  encola las escrituras, así que sin el vaciado inmediato una excepción aparece en una
  lectura posterior, señalando una línea que no tiene nada que ver.
- **La hoja es una Tabla de Google Sheets** con tipos de columna propios, y por eso rechaza
  aplicar un formato de fecha a `release_date`. No molesta: el formato ya es el correcto y
  el validador acepta tanto `Date` como texto `DD-MM-YYYY`.

Hay una suite local de 70 pruebas en `apps-script/tests/`. Se ejecuta con
`node tests/test-cms.js .` desde esa carpeta y **no toca Google**: el validador recibe los
datos, así que se puede probar entero en local. Ejecutarla antes de cualquier
`clasp push`.

### Secretos

La credencial que usa Apps Script para escribir en GitHub vive **solo** en las Script
Properties privadas de Apps Script, se lee con `PropertiesService.getScriptProperties()` y
**nunca** aparece en este repositorio, en el frontend, en un `.env` ni en la hoja. La
configuración no secreta (repositorio, rama, ruta del snapshot) vive también ahí.
`content.json` contiene exclusivamente información pública destinada a la web.

⚠️ **Toda ruta de asset lleva el prefijo `${bp}`** (`NEXT_PUBLIC_BASE_PATH`). Una ruta
escrita como `'/images/foto.jpg'` funciona en local y da 404 en producción — ya ocurrió.
El MP3 va además percent-encoded por la tilde de su nombre.

**Las rutas de navegación NO llevan `${bp}`**: `next/link` lo aplica solo.

---

## 9. Módulos y dependencias permitidas

```
src/
├── app/                    layout · rutas · globals.css
├── components/
│   ├── SiteShell.tsx       capa persistente (§3)
│   ├── sections/           una escena por archivo · JSX presentacional, sin estado global
│   ├── hero/               WebGL · autónomo (§6)
│   ├── audio/              AudioProvider · TrackPlayer · EntryScreen (§4)
│   ├── music/              MusicCard · ReleaseVisual · YouTubeModal (§4)
│   ├── icons/              SVG de marca inline (Simple Icons)
│   └── …                   menú, tickets, redes, plataformas
├── data/                   contenido + tipos (§8)
└── hooks/                  useReducedMotion · useScrollLock (contador compartido, §4)
```

**Sentido de las dependencias:**

- `sections/` puede importar de `data/`, `components/` y `hooks/`. **No** de `app/`.
- `hero/` no importa de nadie salvo de sí mismo. Recibe todo por props.
- Nadie importa un tipo desde un componente: los tipos compartidos viven en `data/types.ts`.
- Solo `SiteShell` conoce la ruta activa. Las secciones no saben en qué ruta están.
- Solo `AudioProvider` crea sonido.

**Contratos implícitos que hay que respetar:**

- El **orden de `NETWORKS`** en `SocialLinks.tsx` y el anclaje del bocadillo «CONTRATA TU
  SHOW» están acoplados: el bocadillo cuelga del PRIMER icono (WhatsApp). Reordenar el
  array obliga a mover el bocadillo.
- El **cuerpo del menú es una fotografía** (`menu-body.webp`, lienzo 413×519) con las seis
  entradas repartidas por `justify-between`. Añadir una séptima escena aprieta el
  interlineado sobre renglones ya impresos: habría que regenerar el asset.
- `ZONES_STACK` de `NextShowTicket` está calculado para `object-fit: cover`. Cambiar el
  `object-fit` del ticket apilado obliga a recalcular esas zonas.

---

## 10. Materialidad y assets

- La materialidad de las piezas grandes (menú, tickets, telón) viene de **fotografías ya
  terminadas**, nunca recreada en CSS. Encima solo va contenido HTML/SVG real.
- CSS puro solo en controles pequeños (`TrackPlayer`).
- Las zonas útiles sobre los assets están **medidas por muestreo de píxeles**, no a ojo.
  Si se sustituye un asset hay que remedir, y en el telón hay que remedir la **opacidad**,
  no solo el bbox.
- Sombras de piezas con asset real en `filter: drop-shadow()`, nunca `box-shadow`.
- Imágenes nuevas: comprimir con `sharp` antes de copiarlas a `public/`.
- El dev server bloquea los archivos que sirve: para sobrescribir un asset hay que parar
  el servidor primero.

---

## 11. Despliegue

**Hoy: GitHub Pages con export estático.**

- `next.config.ts`: `output: "export"`, `images.unoptimized`, y `basePath` desde la
  variable `BASE_PATH`, que inyecta el workflow (`/hosman-bravo-web`). En local queda
  vacío.
- `.github/workflows/deploy-pages.yml` construye y sube `out/` en cada push a `master`.
- Cada ruta genera un `.html` plano (`out/galeria.html`). **Verificado contra el
  despliegue real** (28 ago 2026): GitHub Pages resuelve rutas sin extensión —`/404`
  devolvió 200 con el contenido de `404.html`—, así que `/galeria` funciona.
  `trailingSlash` se queda en su valor por defecto.
- ⚠️ **`/galeria/` con barra final da 404** (cae en `404.html`). Es la contrapartida
  aceptada de mantener URLs limpias. Los enlaces del sitio nunca la emiten.

**Futuro: probablemente Vercel con `hosmanbravo.com`.** Considerado, no implementado. La
arquitectura no debe crear dependencias de GitHub Pages:

- Nada de rutas de navegación escritas a mano con el `basePath`.
- `basePath` sale de una variable de entorno, no de una constante.
- `trailingSlash` es config de Next, portable.
- Migrar consistiría en quitar `output: "export"` y `BASE_PATH`; el código de la app no
  debería necesitar cambios.

---

## 12. NO TOCAR sin petición explícita

1. **Física y shaders del humo.** `fluidSimulation.ts`, `fluidShaders.ts`,
   `smokeRenderer.ts`.
2. **La regla de que la portada nunca se desmonta.** Desmontarla reinicia el humo (§6).
3. **El sistema de tokens fluidos.** No introducir `@media` ni px por breakpoint (§7).
4. **El ciclo de audio.** Un solo elemento `Audio`, y silenciar pausa (§4).
5. **`EntryScreen`** y las calibraciones del telón (recorridos, `CURTAIN_GRADE`).
6. **Assets aprobados** y las zonas medidas sobre ellos (§10).
7. **Geometría y diseño visibles.** Tamaños, posiciones, responsive y composición están
   aprobados contra 2048×1023 y verificados en 1600×800 y 1280×591.

---

## 13. Cómo verificar

- **Tres viewports de control, siempre los mismos:** `2048×1023` (referencia de diseño
  aprobada), `1600×800` (comprueba que la interpolación es continua) y `1280×591`.
- **Medir geometría con JS** (`getBoundingClientRect`, `getComputedStyle().fontSize`), no
  fiarse de capturas: el panel del navegador suele estar oculto y no compone frames.
- **Medir los elementos visibles, no solo el wrapper.** Una caja exterior puede medir bien
  y tener espacio muerto dentro.
- **Probar los estados abiertos**, y combinaciones: menú de cuero + panel de fechas es
  donde aparecen las colisiones.
- **Verificar dentro del árbol completo**, no clonando el nodo aislado: un ancestro con
  `overflow-hidden` puede recortarlo. Y ojo: si un eje deja de ser `visible`, el navegador
  convierte el otro en `auto`.
- Herramienta: `agent-browser` (instalado global). Recuerda pulsar el telón primero (§4).
- ⚠️ **Si se ha corrido `npm run check`/`build`, borrar `.next` antes de volver al dev
  server** — puede seguir sirviendo el CSS de la build de producción sin ningún aviso.
