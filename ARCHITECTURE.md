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
        ├── <EntryScreen />         mini-telón flotante z-80 (no bloquea la página; bajo los modales)
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
- Consumidores actuales: `EntryScreen` (`enter` e `isPlaying`) y los reproductores (el
  resto). `hasEntered` sigue expuesto pero hoy no tiene consumidores.
- **Suspensión con contador:** `suspend(id)` / `release(id)` apartan la canción de fondo
  sin pisar a quien la haya pausado a propósito. Al primer `suspend` se apunta si sonaba
  (`wasPlayingRef`) y se pausa; los `id` activos viven en un `Set`, así que dos avisos de
  suspensión no se pisan entre sí; al último `release` se reanuda **solo si sonaba**.
  Su único consumidor es `YouTubeModal` (`src/components/music/`), con el id
  `'youtube-modal'` — las previews muteadas de la cuadrícula NO deben llamarlo: un
  `<iframe>` muted y el `<audio>` no compiten por nada.

### ⚠️ El fundido de entrada es un punto único de fallo

`AudioProvider` crea el audio con `volume = 0` y lo sube a `TARGET_VOLUME` (0,45) con un
fundido de 1,8 s montado sobre `requestAnimationFrame`. **Si ese bucle no corre, la canción
se reproduce en silencio y nada la recupera**: el único otro sitio que asigna el volumen es
el `catch` de `play()`, que solo entra cuando el navegador rechaza la reproducción.

Medido en producción (7 sep 2026): tras entrar por el telón el elemento está
`paused: false`, `muted: false`, `currentTime` avanzando y **`volume: 0`**.

En iOS `volume` es de solo lectura, así que allí el fundido se ignora y suena al volumen
del sistema: el fallo solo puede manifestarse en Android o escritorio.

Cualquier cambio aquí necesita permiso explícito de Danny — ver §12.

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

### Previews de MÚSICA

Capa visual sobre la portada, **siempre con `pointer-events: none`**: no le quita el clic
al disparador del modal ni tapa los enlaces de plataforma. La portada nunca se retira, así
que cualquier fallo degrada a lo que ya había.

Cascada de `ReleasePreview`: **clip propio → YouTube → portada**.

- **Clip propio** (`previewVideoUrl`, ruta bajo `/videos/previews/`): `<video muted loop
  playsinline>`. ⚠️ El `<video>` **no se monta hasta la primera activación** — montarlo
  siempre haría que el navegador descargase todos los clips al entrar en la sección.
- **YouTube** (`src/lib/youtube-api.ts`): cargador **singleton** con promesa cacheada a
  nivel de módulo. Resuelve los dos problemas del callback global único
  `onYouTubeIframeAPIReady`: que un consumidor pise a otro (se encadena el anterior) y que
  YouTube solo lo llame una vez (de ahí la comprobación inmediata de `window.YT.Player`).
- **`preview_start_sec`** entra como `playerVars.start` y solo aplica al camino de
  YouTube: con clip propio, el recorte ya lo eligió quien lo hizo.

**El fundido se dispara con el estado REPRODUCIENDO, no con `onReady`.** Entre «listo» y
«hay imagen» está el buffering, que es cuando YouTube pinta su fondo negro; esperar al
estado real es lo que garantiza que nunca se vea un hueco.

⚠️ **`onReady` arranca la reproducción si en ese momento tocaba, consultando un ref.** No
es redundante con el efecto de play/pausa: el reproductor se crea de forma ASÍNCRONA, así
que una tarjeta que ya está activa en el primer render —la destacada— corre ese efecto
cuando `playerRef` todavía es `null`, se va por la guarda, y sus dependencias no vuelven a
cambiar nunca. Con `autoplay: 0`, sin esta línea la destacada no arranca jamás. Ya pasó.

**Los clips propios se publican en H.264/MP4**, no en VP9/WebM, aunque pesen algo más: el
soporte de VP9 en WebM ha sido irregular en iOS. El material fuente (originales sin
recortar, variantes descartadas) vive en `public/references/`, que está en `.gitignore`.

⚠️ **El recorte de 1,55× del iframe no es estético.** YouTube **no permite ocultar** el
rótulo del título ni el botón central: `modestbranding` está obsoleto y lo ignoran, y
`controls: 0` solo quita la barra inferior. La única salida es agrandar el iframe y
centrarlo para que esas franjas caigan fuera del recorte de la tarjeta. En una caja 4:3 el
iframe se declara al 133,34% de ancho para que el 16:9 CUBRA sin bandas negras. Los
subtítulos tampoco se quitan con `cc_load_policy` si el espectador los tiene activados en
su cuenta: hay que descargar el módulo (`unloadModule`) con el reproductor ya vivo.

Quién reproduce lo decide `MusicSection`, no la tarjeta — es la única forma de garantizar
**una secundaria activa a la vez**:

- la destacada suena sola y **no se para** cuando una secundaria entra en hover;
- las secundarias solo con `(hover: hover) and (pointer: fine)`; sin puntero fino la
  tarjeta ni siquiera recibe manejador de hover;
- la **precarga** de los reproductores de YouTube espera a que la sección esté pintada
  (dos `requestAnimationFrame` encadenados) y va atada al puntero fino, porque en un móvil
  esos reproductores no podrían activarse nunca;
- con `prefers-reduced-motion` **no hay previews de ninguna clase**.

**Las previews NO tocan `AudioProvider`.** Van mudas, y un `<iframe>`/`<video>` sin sonido
no compite con el `<audio>`. `suspend`/`release` siguen teniendo un único consumidor: el
modal.

### EntryScreen

Mini-telón flotante. No es solo estética: los navegadores no permiten reproducir audio sin
un gesto del usuario, y el clic en «ENTRAR EN LA EXPERIENCIA» **es** ese gesto (dispara
`enter()`).

**Cada ruta es su propio destino.** No hay redirección a `/` ni hero forzado detrás del
telón: quien entra por `/musica` ve MÚSICA desde el primer momento, y por la abertura de
las cortinas se ve esa escena real (el telón no tiene fondo propio). No se duplica
ninguna escena.

**No bloquea la página.** El envoltorio `fixed inset-0` solo centra y es
`pointer-events: none`; únicamente la caja del telón captura puntero. Sin bloqueo de
scroll ni `inert` sobre el contenido. La caja tiene la proporción del lienzo del telón:
ancho `min(80vw, 48rem, 52svh × 2778/1533)` (techo de alto al 52 %; `80vw` libera los
rails en móvil) y subida de `0,2 × (100svh − alto de caja)`, así que los recorridos
calibrados en % del lienzo siguen valiendo. En táctil la caja sigue capturando toques:
lo que tapa en móvil está cubierto por arte opaco, y dejar pasar esos toques abriría
enlaces que no se ven.

**Integración en la escena.** Feather en el perímetro de la caja (máscara), y penumbra
(negro 0,28) + halo como `box-shadow` de un hueco con la forma del arte: una sombra
exterior no se pinta bajo su elemento, así que **el telón nunca se oscurece**. Atmósfera
periférica: 4 regiones con un gradiente negro-burdeos/charcoal cada una, animadas solo
con `transform` (`@keyframes` en el propio componente), con la misma máscara-hueco. Sin
canvas, WebGL, RAF ni blur.

**Jerarquía de interacción** — un único estado visual derivado de tres hechos (ratón sobre
el telón con `(hover: hover) and (pointer: fine)`, ratón sobre ENTRAR, foco
`:focus-visible` en ENTRAR):

| Estado | Apertura | Penumbra / atmósfera | CTA |
|---|---|---|---|
| `idle` | cerrado | presentes | estable |
| `curtain` (hover del telón) | ±2,7 % | reveladas (≈0) | salto vertical una vez por visita |
| `cta` (hover o foco de ENTRAR) | ±4,5 % | reveladas, sin nuevo cambio | hover propio del botón |
| `leaving` (cualquier salida) | según salida | se van | — |

El salto va en el envoltorio del botón (`transform`, `max(4px, 0,9cqw)`, 820 ms) y el
botón conserva su hover. Se arma al alcanzar `curtain` y solo se desarma al salir del
telón, así que `curtain → cta → curtain` no lo repite. Sin salto en táctil, con teclado ni
con movimiento reducido.

**Tres salidas, de un solo sentido** (el estado vive en el `SiteShell` persistente: al
navegar no vuelve; en una recarga documental sí):

| Salida | Audio | Animación |
|---|---|---|
| ENTRAR | `enter()` (reinicia a 0 y fundido) | apertura cinematográfica completa |
| Primera reproducción efectiva desde el reproductor (`isPlaying`) | no se toca: sin `enter()`, sin `currentTime` | la misma apertura (es solo visual) |
| X o Escape | ninguno | fundido breve (280 ms), sin apertura |

Al empezar cualquier salida la caja pasa a `inert` (solo ella): ENTRAR y la X dejan de ser
enfocables. Escape se ignora si hay un `dialog[open]` o `[aria-modal="true"]` en la
página, porque ese Escape es suyo.

Consecuencia para cualquier automatización: la página ya es medible sin pasar el telón,
pero el popup está por encima en el centro. Para audio, **hay que pulsar ENTRAR con un clic
real** — `.click()` de JS no cuenta como gesto y el navegador bloquea el audio.

**Bloqueo de scroll compartido.** `document.body` es un recurso único: si dos piezas
(la hoja de próximos shows, el modal de vídeo) lo bloquearan escribiendo `overflow` a
mano, la primera en soltarlo restauraría el scroll con la otra todavía abierta. Por eso se
usa `useScrollLock(activo)` (`src/hooks/useScrollLock.ts`), que lleva un contador de
módulo. El mini-telón ya **no** lo usa. Cualquier pieza nueva que necesite bloquear el
scroll debe pasar por el mismo hook.

---

## 5. Hero

`HeroScene` reúne las capas de INICIO: fondo, `Hero.mp4` con máscara CSS de cuatro lados,
`InteractiveSmoke`, rótulo, redes + bocadillo de contratación y bloque de próximos shows.

**INICIO no tiene scroll:** ocupa `100svh` con `overflow-hidden`. Las otras cinco escenas
sí tienen scroll normal.

Coste asumido de la persistencia: el Hero está montado también en `/contacto`, `/musica`,
etc. (oculto). Es el precio de que el humo y el vídeo sobrevivan a la navegación.
Si la carga empieza en una ruta profunda, el hero arranca oculto (0×0, sin simulación) y
se inicializa al navegar a `/`: el humo no llega precalentado. Verificado el 15 sep 2026
(`/musica` → cerrar telón → INICIO: vídeo reproduciendo, canvas al tamaño del viewport,
humo visible).

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

**Tipografía.** `layout.tsx` carga con `next/font/google` (autoalojadas en el build) Geist
y Geist Mono para todo el sitio, y **Cinzel solo en Bold** (`--font-cinzel`). Cinzel entra
únicamente por la utilidad `titulo-editorial` (`globals.css`), que añade la familia a la
escala `--text-section` y es la que llevan los títulos editoriales principales de sección.
Qué es un título editorial y qué no, y el resto de reglas de marca: [BRAND.md](BRAND.md).

Fórmula: `clamp(mínimo, a·vw + b·svh, máximo)`. El **máximo** se calibra para devolver en
2048×1023 exactamente el valor aprobado; el **mínimo** es el suelo de legibilidad de esa
pieza. `svh` y no `vh`, porque INICIO ya usa `100svh`.

`--spacing-scene-top` se deriva de `--hb-header-real-h`, que publica un `ResizeObserver`
sobre el `<header>` real (en `SiteShell`). Así la reserva superior de las escenas con
scroll conoce la altura de verdad de los dos flancos de la cabecera, que no es simétrica.

### Dos anchos, dos responsabilidades

`--container-content` (72rem) es el ancho de **LECTURA**: su tope existe porque una línea
de texto larga se lee mal. Es un límite tipográfico real y no debe subirse.

`--container-wide` (108rem) es el ancho de **EXPOSICIÓN**, para secciones cuyo contenido
son piezas visuales en rejilla. No tienen problema de longitud de línea, así que compartir
tope con el texto las encerraba sin motivo: medido, MÚSICA usaba el 45% de una pantalla de
2560 y su tarjeta medía lo mismo (368px) que en 1280. Lo aplica `SCENE_SHOWCASE`
(`sections/scene.ts`), que además declara `container-type: inline-size`.

⚠️ **Las columnas se deciden por el CONTENEDOR, no por el viewport.** La rejilla de MÚSICA
usa `repeat(auto-fill, minmax(clamp(155px, 29cqw, 30rem), 1fr))`. El `29cqw` es lo que
mantiene estable el número de columnas en todo el tramo fluido: numerador y denominador
escalan juntos. Antes era `lg:grid-cols-3`, un umbral de viewport, y producía una
discontinuidad medida de 312px → 447px al pasar de 1024 a 960 — la tarjeta se hacía un 43%
MÁS grande al encoger la ventana.

⚠️ **El segundo término del `minmax` tiene que ser `1fr`.** Con una longitud definida, la
especificación de Grid cuenta las columnas usando ese máximo y no el mínimo: se probó
`minmax(base, base*1.2)` y daba 2 columnas de 576px en 1920 en vez de 3.

Queda un salto residual de ×1,48 a ~520px de ventana, inevitable si la rejilla ocupa todo
el ancho; está fuera del rango de escritorio a propósito.

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

### Las dos composiciones de INICIO

Todo el sistema responsive escala con `clamp()` y con unidades de contenedor. Las
**únicas** reglas que miran el viewport son dos, declaradas juntas y con nombre como
variantes de Tailwind en `globals.css`:

| Variante | Condición | Qué compone |
|---|---|---|
| *(base)* | — | **Composición compacta.** Barra superior de una fila (`MobilePlayer`), bandas que reservan alto de verdad, escena que crece si hace falta. |
| `abierta` | `min-aspect-ratio: 13/10` + `min-width: 58rem` + `min-height: 34rem` | **Composición superpuesta.** El vídeo sangra a todo el alto; cabecera, shows y redes flotan en las esquinas. Solo cede por los flancos. |
| `rails` | `max-width: 40rem` | Dentro de la compacta: los grupos de iconos pasan a rails verticales superpuestos y el pie lo ocupa el tirador de eventos. El rótulo sigue dentro del encuadre del hero, como en las demás composiciones. |

**La base es la compacta, no la de escritorio.** Es la que funciona en cualquier
geometría, así que el caso difícil es el camino por defecto y el fácil el que se pide
expresamente.

**La cabecera compacta no tiene condición propia**: va atada a la composición. En
`abierta` la cabecera flota sobre el vídeo y no le cuesta alto al hero, así que ahí cabe
el módulo completo de reproductor + plataformas; en la compacta cada píxel de cabecera se
lo quita al hero. Medido: 225–280 px el módulo completo frente a 86 el compacto, y esos
~140 px valen ~105 px de vídeo.

⚠️ `@custom-variant` de Tailwind v4 **no admite listas separadas por coma**: parte el valor
y emite un selector vacío que rompe la hoja entera, con un 500 que no menciona la variante.

### La política: `fit` mientras quepa, crecer cuando no

La escena es `min-height: max(100svh, var(--hb-escena-min))` —no `height`— con
`grid-template-rows: auto minmax(var(--hb-hero-suelo), 1fr) auto`. `--hb-escena-min` lo
publica el coordinador con lo que piden las columnas laterales en su mínimo.

Si `cabecera + suelo del hero + pie` entra en la pantalla, el `1fr` absorbe el sobrante:
una pantalla, sin scroll. Si no entra, la rejilla crece y el documento se desplaza — dentro
de INICIO, porque en `/` la ruta devuelve `null` y el `<footer>` solo existe fuera de la
portada: **debajo de la escena no hay nada**. No hay ninguna condición que escribir; lo
resuelve el algoritmo de rejilla.

`100svh` dejó de ser una obligación porque serlo tenía un precio medido: con la cabecera y
el pie en sus mínimos, todo el déficit caía sobre el hero y este bajaba a 327 px en la
franja intermedia, para recuperar 488 al entrar en móvil. La progresión `675 → 327 → 488`
era la avería.

### El suelo del hero

Dos tokens **propios del hero**, sin dependencia de ningún otro módulo (cambiar los
tickets o la cabecera no debe mover por la puerta de atrás la geometría del protagonista),
uno por eje:

- **Compacta y `rails`** — `--hb-hero-suelo: 15rem` (240 px de alto) es el mínimo de la fila
  central. Por debajo, la escena crece y hay scroll.
- **`abierta`** — la zona hero está **fuera del flujo** y el mínimo de fila no le llega, así
  que cede el flanco, con `--hb-hero-min-w: 20rem` como suelo de ancho:
  `min(var(--hb-flanco-ideal), max(0px, (100cqw - var(--hb-hero-min-w)) / 2))`.

### El flanco protege el RÓTULO, no el vídeo

En `abierta`, `--hb-flanco-ideal` reserva solo lo necesario para que el rótulo —centrado y
al `--hb-rotulo-fraccion` (0,54) del ancho del vídeo— empiece donde acaba el ticket de
Próximos Shows más su separación:
`50cqw − (50cqw − hero-inset·0,55 − ticket-w − separación) / fracción`.

Antes reservaba el ancho entero del ticket **a los dos lados**. Cerca de la frontera de
`abierta` comprimía el hero (a 826 de alto bajaba de 620 a 365 al estrechar hasta 1080) y
al pasar a la compacta volvía a crecer de golpe (598). Medido tras el cambio: el vídeo queda
limitado por el alto en todo el rango de `abierta`; salto residual al cruzar a la compacta
de ~3,5 % (la compacta descuenta el margen inferior del pie); separación mínima rótulo↔ticket
13 px a 940×720, justo la separación prevista. Los bordes del vídeo pueden quedar bajo el
ticket o la esquina del reproductor: la máscara los desvanece.

`--hb-rotulo-fraccion` es la única fuente de verdad del ancho del rótulo: la usan el propio
`Branding` en `HeroScene` y este flanco. El coordinador la lee del DOM.

### La ley del vídeo

Una sola declaración para todas las composiciones:

```css
width: min(100cqw, var(--hb-hero-alto, 75cqh));  aspect-ratio: 3 / 4;
```

`100cqw` es el límite por ancho disponible, `75cqh` el límite por alto disponible, y
`min()` es «lo que quepa». Lo que cambia entre composiciones no es la fórmula: es el
**tamaño de la caja** contra la que se mide, que declara `container-type: size`. Solo
`rails` declara `--hb-hero-alto` (presencia mínima en alto, ver «Hero, rótulo y menú en
`rails`»); en abierta y compacta la variable no existe y el límite es `75cqh`.

**El lienzo del hero.** En la compacta, vídeo y rótulo no se miden contra la zona sino
contra una caja interior que sube hasta el borde superior de la escena
(`top: -var(--hb-header-real-h)`). La cabecera solo ocupa sus dos esquinas y el borde
superior del vídeo es transparente por la máscara, así que el hero aprovecha ese alto sin
pisar nada legible. Crece más donde la cabecera pesa más en el alto (apaisado bajo:
844×390 pasó de 216 a 281 px de ancho; 800×900, de 529 a 599) sin escribir ningún umbral.
En `abierta` la zona ya ocupa todo el alto y en `rails` la cabecera es una barra de lado a
lado: en ambas la caja vuelve a ser la zona (`abierta:top-0 rails:top-0`).

Es **solo visual**: la zona, la rejilla y la reserva de cabecera no cambian, así que la
frontera de scroll y las reservas del coordinador tampoco. La única consecuencia en
`useGeometriaPeriferica` es la predicción del vídeo en lateral, que ya no descuenta la
reserva de cabecera (el rótulo es fracción de ese vídeo y de él sale el hueco de Shows).
⚠️ Si se cambia la altura del lienzo, cambiar también esa predicción.

El rótulo no necesita regla propia: es el 54 % del encuadre y su bajada `2.9cqw` del
rótulo con suelo de 9 px, así que acompaña al hero conservando la jerarquía. (En `rails`
tiene ancho, anclaje y tope de bajada propios: ver «Hero, rótulo y menú en `rails`».)

⚠️ **No devolver el marco a `md:h-full md:w-auto`.** Esa forma mide solo por altura y era la
causa de que a 960×1080 el vídeo ocupara el 84 % del ancho.

⚠️ **`svh`, nunca `dvh`.** Con `dvh` cada aparición de la barra del navegador
redimensionaría la escena, el `ResizeObserver` de `InteractiveSmoke` llamaría a `applySize`
y este a `simulation.resize()`, que destruye los búferes de densidad.

⚠️ **`min-h-svh` y no `min-h-screen` en `<main>`.** `min-h-screen` es `100vh`, el viewport
grande, y hacía que el documento midiera más que la pantalla con la barra desplegada.

### Dos reglas que protegen al humo

El canvas es lo único de la escena que **no** puede depender del contenido: cada cambio de
su tamaño reconstruye las texturas de densidad, que son la forma del humo.

1. **El canvas mide una pantalla, no la escena.** Velo y humo comparten una capa
   `absolute inset-0` que cubre la escena entera y, dentro, una ventana
   `sticky top-0 h-[100svh]`. Su tamaño depende solo del ancho de la ventana y de `svh`,
   así que crecer la escena o desplazarse no lo tocan; y cuando la escena supera la
   pantalla (alturas ≲ 407 px), la ventana se queda pegada al viewport y el pie no se
   queda sin humo. `fixed` no sirve: el `container-type` de la escena la convierte en su
   bloque contenedor. `sticky` funciona porque `<main>` usa `overflow-x: clip`, que no
   crea contenedor de scroll — ⚠️ cambiarlo a `hidden` rompería el `sticky` sin avisar.
   El `z-[5]` de la capa exterior conserva el orden de apilado anterior.
2. **El panel de Próximos Shows no participa en el reparto vertical** (`absolute
   bottom-full`): se despliega hacia arriba sobre el hero. Cuando estaba en el flujo, en la
   composición compacta su fila es `auto` y abrirlo le robaba el alto al hero — medido a
   1000×900 sobre el commit 1734a99: el vídeo pasaba de 327 a 208 px.

### Menú, isotipo y margen de los rails: una curva, sin excepciones

- **Menú** — `--hb-menu-w` es UNA curva para las dos composiciones:
  `max(126px, min(33vw, clamp(190px, 6vw + 14svh, 266px)))`. Antes la compacta tenía su
  propio valor (126–150) y el menú saltaba de 150 a 190 al cruzar a `abierta`. El `33vw`
  existe porque en la barra de teléfono el trigger comparte fila con el reproductor. Solo
  se fija el ancho: la proporción del cuero sale del asset.
- **Isotipo** — `clamp(3.25rem, 2.4vw + 5.2svh, 5.75rem)`; el coordinador lo reduce si su
  columna no da para más. La frontera de scroll usa su MÍNIMO, no este objetivo.
- **Rails** — `--hb-rail-inset` es el margen de los DOS rails (redes a la izquierda,
  plataformas a la derecha), simétrico. **No** es el margen del menú, del isotipo ni de
  Próximos Shows: Shows va pegado al borde a propósito (su filete ya hace de margen y cada
  píxel retrasa la colisión con el rótulo).

### Los rails van `absolute` dentro de la escena

Los dos rails son permanentes (todas las composiciones) y van `position: absolute` DENTRO
de la escena de INICIO: las redes directamente en `HeroScene`, las plataformas llevadas
por `createPortal` a `[data-hb-capa-rails]`. Por eso **se desplazan con la escena** cuando
esta crece por encima de `100svh`: tras la frontera de scroll, la geometría queda
congelada y todo el conjunto se mueve junto (ver `useGeometriaPeriferica`).

(Hasta `fc343e8` iban `fixed` con la variante `rails` y, en escenas móviles muy bajas,
quedaban ligados al viewport mientras el hero se desplazaba. Ese trade-off ya no existe.)

### Hero, rótulo y menú en `rails`

Todo con la variante `rails:`; fuera de ella nada cambia (el flanco de `abierta` asume el
rótulo al 54 %).

- **Hero centrado** en su zona, con **presencia mínima en alto**: el encuadre usa
  `min(100cqw, var(--hb-hero-alto, 75cqh))` y `rails` declara
  `--hb-hero-alto: max(75cqh, 60.75svh)` (≈ 81 % del alto de pantalla). Con poca altura
  (530×512: 262×350 → 311×415) desborda la zona por arriba y por abajo con los bordes que
  la máscara desvanece; en teléfonos altos no cambia (manda el ancho). Solo visual: filas,
  zona, pie y frontera de scroll no cambian. (Se probó alinearlo abajo: hundía la
  composición en teléfonos altos.)
- **Rótulo**: ancho `min(max(0,67·vídeo, --hb-rotulo-objetivo 256px), disponible)`, con
  disponible = hueco entre rails CERRADOS a la altura del rótulo (margen + botón +
  holgura). El bocadillo «CONTRATA TU SHOW» no se reserva: cuelga del primer icono y queda
  ≥ 46 px por encima del rótulo en todos los barridos, incluida la frontera. Su borde
  inferior es el final de la zona menos `hero-inset` (`bottom: calc((100% − 100cqh)/2 +
  hero-inset)` dentro del encuadre centrado): con el hero limitado por alto queda sobre las
  patas; en teléfonos altos cuelga bajo los pies. La bajada cede con `--hb-bajada-tope:
  4cqw` si el rótulo se estrecha.
- **Menú**: en la raíz de `LeatherMenuPhoto`,
  `--hb-menu-w: max(126px, min(0,4·(100vw − 2·header-pad), curva de la compacta))`. Se
  mide contra la fila de la cabecera y converge en altura con el reproductor, que ocupa
  el resto de la fila y cede un poco (403: 236 → 226). En 640/641 enlaza con la compacta.

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

**`cover_url` y `preview_video_url` aceptan dos formas**, resueltas por la misma
`parseAssetReference(valor, carpeta)`: una URL `http(s)` externa, o una ruta interna
acotada a su carpeta — `/images/covers/` y `/videos/previews/` respectivamente, con
`${bp}` aplicado para GitHub Pages. Cualquier otra ruta, `//dominio` disfrazado de ruta
local, o un `..` se descarta. El Apps Script valida lo mismo en su lado
(`cleanUrlOrLocalPath` con prefijo, en `apps-script/Validation.js`) — el asset solo se
sube al Sheet si ambas capas lo aceptarían, pero la web nunca confía en que el Apps Script
ya lo hizo.

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
│   ├── music/              MusicCard · ReleaseVisual · ReleasePreview · YouTubeModal (§4)
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
- Herramienta: `agent-browser` (instalado global). El mini-telón queda encima en el centro: ciérralo (X/Escape) o pulsa ENTRAR con clic real si hace falta audio (§4).
- ⚠️ **Si se ha corrido `npm run check`/`build`, borrar `.next` antes de volver al dev
  server** — puede seguir sirviendo el CSS de la build de producción sin ningún aviso.
