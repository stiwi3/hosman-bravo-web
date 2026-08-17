/**
 * Render final del humo.
 *
 * Toma la textura de densidad que produce la simulación y decide únicamente
 * su aspecto: color, capas visuales y máscaras. No genera forma: la silueta
 * viene ya dada por la densidad advectada.
 */

import { DEBUG_DENSITY_SHADER, RENDER_SHADER, VERTEX_SHADER } from './fluidShaders';
import { compileShader, Program, type Fbo, type GLContext } from './webglUtils';

/**
 * TEMPORAL — diagnóstico.
 *
 * Con `true`, el lienzo muestra la textura de densidad en crudo (magenta sobre
 * negro, opaco) en lugar del humo definitivo. Sirve para comprobar que la
 * simulación llega a pantalla.
 *
 * Ponerlo a `false` devuelve el render artístico normal.
 */
export const DEBUG_FLUID = true;

export interface RenderOptions {
  opacity: number;
  /** Centro de la zona a mantener despejada (UV, origen abajo-izquierda). */
  clearCenter: [number, number];
  clearRadius: number;
}

export class SmokeRenderer {
  private readonly ctx: GLContext;
  private readonly draw: (target: Fbo | null) => void;
  private readonly program: Program;
  /** TEMPORAL — programa de diagnóstico. */
  private readonly debugProgram: Program | null;
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
      opacity: options.opacity ?? 0.62,
      clearCenter: options.clearCenter ?? [0.5, 0.58],
      clearRadius: options.clearRadius ?? 0.34,
    };

    const { gl } = ctx;
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, RENDER_SHADER);
    if (!vertex || !fragment) throw new Error('No se pudo compilar el render del humo');
    this.program = new Program(gl, vertex, fragment);
    gl.deleteShader(fragment);

    // TEMPORAL — programa de diagnóstico.
    let debugProgram: Program | null = null;
    if (DEBUG_FLUID) {
      const debugFragment = compileShader(gl, gl.FRAGMENT_SHADER, DEBUG_DENSITY_SHADER);
      if (debugFragment) {
        debugProgram = new Program(gl, vertex, debugFragment);
        gl.deleteShader(debugFragment);
      }
    }
    this.debugProgram = debugProgram;
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

    // TEMPORAL — diagnóstico: densidad en crudo, opaca y sin mezcla.
    if (DEBUG_FLUID && this.debugProgram) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.debugProgram.bind();
      gl.uniform2f(
        this.debugProgram.uniform('uTexelSize'),
        density.texelSizeX,
        density.texelSizeY
      );
      gl.uniform1i(this.debugProgram.uniform('uDensity'), density.attach(0));
      this.draw(null);
      return;
    }

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
    this.draw(null);
  }

  dispose() {
    this.program.dispose();
    this.debugProgram?.dispose();
  }
}
