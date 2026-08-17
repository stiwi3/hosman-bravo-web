/**
 * Utilidades de WebGL para la simulación de humo del hero.
 *
 * Aísla lo puramente mecánico —contexto, programas, framebuffers, quad— para
 * que la simulación y el render trabajen con conceptos y no con la API.
 */

export interface GLContext {
  gl: WebGL2RenderingContext | WebGLRenderingContext;
  isWebGL2: boolean;
  /** Formatos con los que se pueden crear framebuffers de coma flotante. */
  formats: {
    rg: FormatSpec;
    r: FormatSpec;
  };
  supportsLinearFloat: boolean;
}

export interface FormatSpec {
  internalFormat: number;
  format: number;
  type: number;
}

export interface Fbo {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
  /** Tamaño de un téxel; los shaders lo necesitan para muestrear vecinos. */
  texelSizeX: number;
  texelSizeY: number;
  attach(unit: number): number;
}

export interface PingPong {
  read: Fbo;
  write: Fbo;
  swap(): void;
  dispose(): void;
}

/**
 * Crea el contexto y negocia los formatos de coma flotante.
 * Devuelve null si el equipo no puede sostener la simulación.
 */
export function createGLContext(canvas: HTMLCanvasElement): GLContext | null {
  const params: WebGLContextAttributes = {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  };

  const gl2 = canvas.getContext('webgl2', params) as WebGL2RenderingContext | null;
  const gl = gl2 ?? (canvas.getContext('webgl', params) as WebGLRenderingContext | null);
  if (!gl) return null;

  let formats: GLContext['formats'];
  let supportsLinearFloat: boolean;

  if (gl2) {
    // WebGL2: los formatos sized son nativos, solo hace falta poder
    // renderizar a ellos y filtrarlos linealmente.
    const colorBuffer = gl2.getExtension('EXT_color_buffer_float');
    supportsLinearFloat = !!gl2.getExtension('OES_texture_float_linear');
    if (!colorBuffer) return null;
    formats = {
      rg: { internalFormat: gl2.RG16F, format: gl2.RG, type: gl2.HALF_FLOAT },
      r: { internalFormat: gl2.R16F, format: gl2.RED, type: gl2.HALF_FLOAT },
    };
  } else {
    // WebGL1: solo hay RGBA, y el half float llega por extensión.
    const halfFloat = gl.getExtension('OES_texture_half_float');
    if (!halfFloat) return null;
    supportsLinearFloat = !!gl.getExtension('OES_texture_half_float_linear');
    const type = halfFloat.HALF_FLOAT_OES;
    const spec = { internalFormat: gl.RGBA, format: gl.RGBA, type };
    formats = { rg: spec, r: spec };
  }

  return { gl, isWebGL2: !!gl2, formats, supportsLinearFloat };
}

export function compileShader(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Programa con sus uniforms ya resueltos y cacheados por nombre. */
export class Program {
  readonly program: WebGLProgram;
  private readonly uniforms = new Map<string, WebGLUniformLocation | null>();
  private readonly gl: WebGLRenderingContext | WebGL2RenderingContext;

  constructor(
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertex: WebGLShader,
    fragment: WebGLShader
  ) {
    this.gl = gl;
    const program = gl.createProgram();
    if (!program) throw new Error('No se pudo crear el programa');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      throw new Error('Fallo al enlazar el programa');
    }
    this.program = program;

    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) this.uniforms.set(info.name, gl.getUniformLocation(program, info.name));
    }
  }

  bind() {
    this.gl.useProgram(this.program);
  }

  uniform(name: string): WebGLUniformLocation | null {
    return this.uniforms.get(name) ?? null;
  }

  dispose() {
    this.gl.deleteProgram(this.program);
  }
}

function createFbo(
  ctx: GLContext,
  width: number,
  height: number,
  spec: FormatSpec,
  filter: number
): Fbo {
  const { gl } = ctx;
  const texture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  // Clamp: sin esto el humo reaparecería por el lado opuesto al advectar.
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, spec.internalFormat, width, height, 0, spec.format, spec.type, null
  );

  const framebuffer = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0
  );
  gl.viewport(0, 0, width, height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  return {
    texture,
    framebuffer,
    width,
    height,
    texelSizeX: 1 / width,
    texelSizeY: 1 / height,
    attach(unit: number) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      return unit;
    },
  };
}

export function createPingPong(
  ctx: GLContext,
  width: number,
  height: number,
  spec: FormatSpec,
  filter: number
): PingPong {
  let read = createFbo(ctx, width, height, spec, filter);
  let write = createFbo(ctx, width, height, spec, filter);
  const { gl } = ctx;
  return {
    get read() {
      return read;
    },
    get write() {
      return write;
    },
    swap() {
      const tmp = read;
      read = write;
      write = tmp;
    },
    dispose() {
      for (const fbo of [read, write]) {
        gl.deleteTexture(fbo.texture);
        gl.deleteFramebuffer(fbo.framebuffer);
      }
    },
  };
}

export function createSingleFbo(
  ctx: GLContext,
  width: number,
  height: number,
  spec: FormatSpec,
  filter: number
) {
  return createFbo(ctx, width, height, spec, filter);
}

export function disposeFbo(ctx: GLContext, fbo: Fbo) {
  ctx.gl.deleteTexture(fbo.texture);
  ctx.gl.deleteFramebuffer(fbo.framebuffer);
}

/**
 * Quad a pantalla completa compartido por todos los passes: un solo buffer
 * ligado una vez, ya que todos los shaders usan el mismo atributo.
 */
export function createQuad(ctx: GLContext) {
  const { gl } = ctx;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]),
    gl.STATIC_DRAW
  );
  const indices = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  return {
    /** Dibuja el quad sobre `target` (null = lienzo). */
    draw(target: Fbo | null) {
      if (target) {
        gl.viewport(0, 0, target.width, target.height);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      } else {
        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    },
    dispose() {
      gl.deleteBuffer(buffer);
      gl.deleteBuffer(indices);
    },
  };
}

/** Mantiene la proporción del hero al escalar las rejillas de simulación. */
export function resolutionFor(width: number, height: number, target: number) {
  const aspect = width / Math.max(height, 1);
  const w = Math.max(32, Math.round(target));
  const h = Math.max(32, Math.round(target / Math.max(aspect, 0.0001)));
  return aspect >= 1 ? { width: w, height: h } : { width: Math.round(target * aspect), height: w };
}
