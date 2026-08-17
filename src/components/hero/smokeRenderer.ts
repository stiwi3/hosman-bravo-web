/**
 * Render final del humo.
 *
 * Toma la textura de densidad que produce la simulación y decide únicamente
 * su aspecto: color, capas visuales y máscaras. No genera forma: la silueta
 * viene ya dada por la densidad advectada.
 */

import { RENDER_SHADER, VERTEX_SHADER } from './fluidShaders';
import { compileShader, Program, type Fbo, type GLContext } from './webglUtils';

export interface RenderOptions {
  opacity: number;
  /** Centro de la zona a mantener despejada (UV, origen abajo-izquierda). */
  clearCenter: [number, number];
  clearRadius: number;
  /**
   * Zona del rótulo, en UV del lienzo completo. El humo se aclara ahí para
   * que el artwork respire, sin llegar a desaparecer.
   */
  brandCenter: [number, number];
  brandSize: [number, number];
  /** Humo que queda en el centro de esa zona (1 = sin cambio). */
  brandRelief: number;
}

export class SmokeRenderer {
  private readonly ctx: GLContext;
  private readonly draw: (target: Fbo | null) => void;
  private readonly program: Program;
  private options: RenderOptions;
  private aspect = 1;

  constructor(
    ctx: GLContext,
    draw: (target: Fbo | null) => void,
    options: Partial<RenderOptions> = {}
  ) {
    this.ctx = ctx;
    this.draw = draw;
    this.options = {
      opacity: options.opacity ?? 0.9,
      clearCenter: options.clearCenter ?? [0.5, 0.6],
      clearRadius: options.clearRadius ?? 0.3,
      // Ajustados al artwork del PNG: ocupa la franja central del vídeo, algo
      // por encima de la mitad y bastante apaisado.
      brandCenter: options.brandCenter ?? [0.5, 0.51],
      brandSize: options.brandSize ?? [0.2, 0.13],
      brandRelief: options.brandRelief ?? 0.55,
    };

    const { gl } = ctx;
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, RENDER_SHADER);
    if (!vertex || !fragment) throw new Error('No se pudo compilar el render del humo');
    this.program = new Program(gl, vertex, fragment);
    gl.deleteShader(fragment);
    gl.deleteShader(vertex);
  }

  setAspect(aspect: number) {
    this.aspect = aspect;
  }

  setOpacity(opacity: number) {
    this.options.opacity = opacity;
  }

  render(density: Fbo, time: number) {
    const { gl } = this.ctx;
    const p = this.program;

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Alfa premultiplicado: el shader ya devuelve color * alpha.
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    p.bind();
    gl.uniform2f(p.uniform('uTexelSize'), density.texelSizeX, density.texelSizeY);
    gl.uniform1i(p.uniform('uDensity'), density.attach(0));
    gl.uniform1f(p.uniform('uTime'), time);
    gl.uniform1f(p.uniform('uAspect'), this.aspect);
    gl.uniform1f(p.uniform('uOpacity'), this.options.opacity);
    gl.uniform2f(
      p.uniform('uClearCenter'),
      this.options.clearCenter[0],
      this.options.clearCenter[1]
    );
    gl.uniform1f(p.uniform('uClearRadius'), this.options.clearRadius);
    gl.uniform2f(
      p.uniform('uBrandCenter'),
      this.options.brandCenter[0],
      this.options.brandCenter[1]
    );
    gl.uniform2f(p.uniform('uBrandSize'), this.options.brandSize[0], this.options.brandSize[1]);
    gl.uniform1f(p.uniform('uBrandRelief'), this.options.brandRelief);
    this.draw(null);
  }

  dispose() {
    this.program.dispose();
  }
}
