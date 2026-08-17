/**
 * Shaders de la simulación de humo (Stable Fluids sobre GPU).
 *
 * Cada paso es un fragment shader que lee una o varias texturas de estado y
 * escribe la siguiente. El estado vive en las texturas entre fotogramas: la
 * forma del humo no se regenera con ruido, se transporta.
 *
 * Se escribe en GLSL ES 1.0 para que el mismo código sirva en WebGL1 y WebGL2
 * (el contexto 2 lo acepta sin cambios).
 */

export const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
varying vec2 vL;
varying vec2 vR;
varying vec2 vT;
varying vec2 vB;
uniform vec2 uTexelSize;

void main() {
  vUv = aPosition * 0.5 + 0.5;
  // Vecinos precalculados en el vértice: los pasos de derivadas los reutilizan.
  vL = vUv - vec2(uTexelSize.x, 0.0);
  vR = vUv + vec2(uTexelSize.x, 0.0);
  vT = vUv + vec2(0.0, uTexelSize.y);
  vB = vUv - vec2(0.0, uTexelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

/** Ruido de valor compartido por emisores y render. */
const NOISE_CHUNK = `
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = dot(hash2(i) * 2.0 - 1.0, f);
  float b = dot(hash2(i + vec2(1.0, 0.0)) * 2.0 - 1.0, f - vec2(1.0, 0.0));
  float c = dot(hash2(i + vec2(0.0, 1.0)) * 2.0 - 1.0, f - vec2(0.0, 1.0));
  float d = dot(hash2(i + vec2(1.0, 1.0)) * 2.0 - 1.0, f - vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 0.5 + 0.5;
}
float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * noise(p);
    p = p * 2.03 + vec2(3.1, 1.7);
    amp *= 0.5;
  }
  return v;
}
`;

/**
 * Advección semi-lagrangiana: cada téxel mira hacia atrás en el tiempo,
 * siguiendo la velocidad, y toma el valor que había allí. Es lo que hace que
 * la materia se transporte en lugar de deformarse en el sitio.
 */
export const ADVECTION_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;

void main() {
  vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
  vec4 result = texture2D(uSource, coord);
  // Disipación exponencial: el humo se desvanece con suavidad, sin escalones.
  gl_FragColor = result / (1.0 + uDissipation * uDt);
}
`;

/** Rotacional del campo: mide cuánto gira el fluido en cada punto. */
export const CURL_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uVelocity;

void main() {
  float L = texture2D(uVelocity, vL).y;
  float R = texture2D(uVelocity, vR).y;
  float T = texture2D(uVelocity, vT).x;
  float B = texture2D(uVelocity, vB).x;
  gl_FragColor = vec4(0.5 * ((R - L) - (T - B)), 0.0, 0.0, 1.0);
}
`;

/**
 * Vorticity confinement: la advección numérica disipa los remolinos pequeños.
 * Este paso los devuelve empujando el fluido hacia donde el giro es más
 * intenso, que es lo que produce las volutas al atravesar el humo.
 */
export const VORTICITY_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uVelocity;
uniform sampler2D uCurl;
uniform float uCurlStrength;
uniform float uDt;

void main() {
  float L = texture2D(uCurl, vL).x;
  float R = texture2D(uCurl, vR).x;
  float T = texture2D(uCurl, vT).x;
  float B = texture2D(uCurl, vB).x;
  float C = texture2D(uCurl, vUv).x;

  vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
  force /= length(force) + 0.0001;          // solo interesa la dirección
  force *= uCurlStrength * C;
  force.y *= -1.0;

  vec2 velocity = texture2D(uVelocity, vUv).xy + force * uDt;
  gl_FragColor = vec4(clamp(velocity, -1000.0, 1000.0), 0.0, 1.0);
}
`;

export const DIVERGENCE_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying vec2 vUv;
varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uVelocity;

void main() {
  float L = texture2D(uVelocity, vL).x;
  float R = texture2D(uVelocity, vR).x;
  float T = texture2D(uVelocity, vT).y;
  float B = texture2D(uVelocity, vB).y;

  // En los bordes se refleja la componente normal: el fluido no entra ni sale.
  vec2 C = texture2D(uVelocity, vUv).xy;
  if (vL.x < 0.0) { L = -C.x; }
  if (vR.x > 1.0) { R = -C.x; }
  if (vT.y > 1.0) { T = -C.y; }
  if (vB.y < 0.0) { B = -C.y; }

  gl_FragColor = vec4(0.5 * ((R - L) + (T - B)), 0.0, 0.0, 1.0);
}
`;

/** Una iteración de Jacobi para resolver la presión. */
export const PRESSURE_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying vec2 vUv;
varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;

void main() {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  float divergence = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - divergence) * 0.25, 0.0, 0.0, 1.0);
}
`;

/**
 * Resta el gradiente de presión: deja el campo sin divergencia. Sin este paso
 * el humo se desplazaría en bloque en lugar de fluir y arremolinarse.
 */
export const GRADIENT_SUBTRACT_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying vec2 vUv;
varying vec2 vL; varying vec2 vR; varying vec2 vT; varying vec2 vB;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;

void main() {
  float L = texture2D(uPressure, vL).x;
  float R = texture2D(uPressure, vR).x;
  float T = texture2D(uPressure, vT).x;
  float B = texture2D(uPressure, vB).x;
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  velocity -= vec2(R - L, T - B);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

/**
 * Fuerza del cursor aplicada a lo largo del segmento recorrido entre dos
 * fotogramas, no como un estallido radial: se mide la distancia al segmento,
 * de modo que el puntero deja una corriente por donde ha pasado.
 */
export const SPLAT_VELOCITY_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform vec2 uPointA;
uniform vec2 uPointB;
uniform vec2 uForce;
uniform float uRadius;
uniform float uAspect;

void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  vec2 a = vec2(uPointA.x * uAspect, uPointA.y);
  vec2 b = vec2(uPointB.x * uAspect, uPointB.y);

  vec2 ab = b - a;
  float len2 = max(dot(ab, ab), 1e-6);
  float t = clamp(dot(p - a, ab) / len2, 0.0, 1.0);
  vec2 closest = a + ab * t;
  float dist = length(p - closest);

  float fall = exp(-dist * dist / uRadius);
  vec2 velocity = texture2D(uTarget, vUv).xy + uForce * fall;
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

/**
 * Emisores de densidad: alimentan el humo desde la base y los laterales.
 * El ruido rompe la uniformidad para que no se vea de dónde nace, y el centro
 * se mantiene limpio para no velar el rostro.
 */
export const EMITTER_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform float uTime;
uniform float uAmount;
uniform float uAspect;
${NOISE_CHUNK}

void main() {
  float density = texture2D(uTarget, vUv).x;

  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  // Campo de aporte: bordes sí, centro no.
  float bottom = smoothstep(0.30, 0.0, vUv.y);
  float left   = smoothstep(0.26, 0.0, vUv.x);
  float right  = smoothstep(0.74, 1.0, vUv.x);
  float zone = bottom * 0.85 + (left + right) * 0.7;

  // El humo debe ser escaso: el ruido recorta el aporte a manchas sueltas.
  float n = fbm(p * 3.2 + vec2(0.0, -uTime * 0.05));
  float patch = smoothstep(0.45, 0.85, n);

  float feed = zone * patch * uAmount;
  gl_FragColor = vec4(min(density + feed, 1.6), 0.0, 0.0, 1.0);
}
`;

/** Empuje ambiental: ascenso lento y ondulación, para que nunca esté quieto. */
export const AMBIENT_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uDensity;
uniform float uTime;
uniform float uStrength;
uniform float uAspect;
${NOISE_CHUNK}

void main() {
  vec2 velocity = texture2D(uVelocity, vUv).xy;
  float density = texture2D(uDensity, vUv).x;

  vec2 p = vec2(vUv.x * uAspect, vUv.y);
  // Corrientes amplias y lentas que varían en el tiempo.
  float nx = noise(p * 1.7 + vec2(uTime * 0.035, uTime * 0.02));
  float ny = noise(p * 1.9 + vec2(-uTime * 0.028, 7.3));

  vec2 drift = vec2((nx - 0.5) * 2.0, (ny - 0.5) * 0.9 + 0.55);
  // Solo se empuja donde hay materia: el aire vacío no necesita moverse.
  velocity += drift * uStrength * (0.25 + density);

  gl_FragColor = vec4(velocity, 0.0, 1.0);
}
`;

/**
 * Render final. La silueta procede de la densidad simulada; el ruido solo
 * añade microdetalle y filamentos, y las capas se derivan de esa misma
 * densidad muestreada con desfases distintos para dar profundidad.
 */
export const RENDER_SHADER = `
precision highp float;
precision highp sampler2D;
varying vec2 vUv;
uniform sampler2D uDensity;
uniform float uTime;
uniform float uAspect;
uniform float uOpacity;
uniform vec2 uClearCenter;
uniform float uClearRadius;
${NOISE_CHUNK}

void main() {
  vec2 p = vec2(vUv.x * uAspect, vUv.y);

  // Capa principal: la densidad tal cual sale de la simulación.
  float core = texture2D(uDensity, vUv).x;

  // Bruma de fondo: la misma densidad, desplazada, se lee como un plano algo
  // más atrás.
  float haze = texture2D(uDensity, vUv + vec2(0.014, -0.011)).x;

  // Filamentos: el ruido modula los bordes de la densidad, nunca la crea.
  float detail = fbm(p * 7.0 + vec2(0.0, -uTime * 0.06));
  float wisps = core * smoothstep(0.2, 0.8, detail);

  float density = core * 0.85 + haze * 0.34 + wisps * 0.3;

  // Ley de Beer-Lambert: el humo fino ya tiña algo y el denso sature sin
  // llegar nunca a opaco. Sustituye al smoothstep anterior, que recortaba
  // por abajo casi toda la densidad y dejaba la capa invisible.
  float alpha = 1.0 - exp(-density * 3.4);

  // Rostro: caída larga, sin borde perceptible. Elíptica, porque la cara
  // ocupa una zona más alta que ancha.
  vec2 toFace = (p - vec2(uClearCenter.x * uAspect, uClearCenter.y))
                / vec2(uClearRadius * 1.05, uClearRadius * 1.35);
  float face = mix(0.34, 1.0, smoothstep(0.35, 1.25, length(toFace)));

  // Solo se atenúa el borde superior, y muy poco: el humo vive en los
  // laterales y la base, así que ahí no puede recortarse nada.
  float top = smoothstep(1.0, 0.86, vUv.y);

  alpha = clamp(alpha * face * top * uOpacity, 0.0, 1.0);

  // Paleta: ceniza cálida en los jirones, rojo de brasa apagada en lo denso.
  // Todos los tonos quedan por encima del fondo del hero, que es casi negro;
  // si no, el humo sería más oscuro que la escena y no se vería.
  vec3 ash    = vec3(0.157, 0.129, 0.141);  // #282124
  vec3 deep   = vec3(0.322, 0.078, 0.098);  // #521419
  vec3 mid    = vec3(0.408, 0.106, 0.125);  // #681b20
  vec3 bright = vec3(0.486, 0.145, 0.161);  // #7c2529

  vec3 color = mix(ash, deep, smoothstep(0.03, 0.22, density));
  color = mix(color, mid, smoothstep(0.18, 0.5, density));
  color = mix(color, bright, smoothstep(0.45, 0.95, density));

  // Sin reacción de color al cursor: la interacción se lee en el movimiento.
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export const CLEAR_SHADER = `
precision mediump float;
precision mediump sampler2D;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uValue;

void main() {
  gl_FragColor = uValue * texture2D(uTexture, vUv);
}
`;
