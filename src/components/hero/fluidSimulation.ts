/**
 * Simulación de fluido para el humo del hero.
 *
 * Mantiene dos campos con estado propio entre fotogramas:
 *   - velocidad: hacia dónde se mueve el aire
 *   - densidad:  dónde hay humo
 *
 * Cada fotograma la densidad es transportada por la velocidad. El cursor no
 * mueve el humo: inyecta una fuerza en la velocidad, y es esa corriente la que
 * arrastra la densidad que ya existía.
 */

import {
  ADVECTION_SHADER,
  AMBIENT_SHADER,
  CLEAR_SHADER,
  CURL_SHADER,
  DENSITY_ERASE_SHADER,
  DIVERGENCE_SHADER,
  EMITTER_SHADER,
  GRADIENT_SUBTRACT_SHADER,
  PRESSURE_SHADER,
  SPLAT_VELOCITY_SHADER,
  VERTEX_SHADER,
  VORTICITY_SHADER,
} from './fluidShaders';
import {
  compileShader,
  createPingPong,
  createSingleFbo,
  disposeFbo,
  Program,
  resolutionFor,
  type Fbo,
  type GLContext,
  type PingPong,
} from './webglUtils';

export interface SimulationConfig {
  /** Ancho de la rejilla de velocidad. */
  velocityResolution: number;
  /** Ancho de la rejilla de densidad; mayor porque define la silueta. */
  densityResolution: number;
  pressureIterations: number;
  /** Intensidad de los remolinos reinyectados. */
  curl: number;
  velocityDissipation: number;
  densityDissipation: number;
  /** Aporte de los emisores por segundo. */
  emission: number;
  /** Fuerza de las corrientes ambientales. */
  ambient: number;
  /**
   * Cuánta presión del fotograma anterior se conserva.
   * La proyección de presión es elíptica: propaga por naturaleza. Guardar el
   * campo íntegro acelera la convergencia pero acumula la perturbación del
   * cursor y acaba moviendo toda la escena. Con <1 la ayuda se mantiene y la
   * acumulación se corta.
   */
  pressureRetention: number;
  /** Radio del área que el cursor afecta, en la gaussiana exp(-d²/r). */
  splatRadius: number;
  /** Proporción de densidad que el cursor aparta a su paso. */
  eraseAmount: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  velocityResolution: 192,
  densityResolution: 320,
  pressureIterations: 12,
  curl: 22,
  velocityDissipation: 0.28,
  densityDissipation: 0.22,
  emission: 1.28,
  ambient: 16,
  pressureRetention: 0.72,
  splatRadius: 0.0025,
  eraseAmount: 0.3,
};

export interface PointerSample {
  /** Posición previa y actual en UV (0..1, origen abajo-izquierda). */
  prevX: number;
  prevY: number;
  x: number;
  y: number;
  /** Desplazamiento en UV desde el fotograma anterior. */
  dx: number;
  dy: number;
}

interface Programs {
  advection: Program;
  curl: Program;
  vorticity: Program;
  divergence: Program;
  pressure: Program;
  gradientSubtract: Program;
  splat: Program;
  densityErase: Program;
  emitter: Program;
  ambient: Program;
  clear: Program;
}

type DrawFn = (target: Fbo | null) => void;

export class FluidSimulation {
  private readonly ctx: GLContext;
  private readonly draw: DrawFn;
  private readonly programs: Programs;
  private readonly config: SimulationConfig;

  private velocity!: PingPong;
  private density!: PingPong;
  private pressure!: PingPong;
  private divergenceFbo!: Fbo;
  private curlFbo!: Fbo;

  private aspect = 1;
  private elapsed = 0;
  /** Trayecto del cursor pendiente de apartar densidad en este fotograma. */
  private pendingErase: { pointer: PointerSample; strength: number } | null = null;
  /** Escala global del movimiento; se reduce con `prefers-reduced-motion`. */
  private motionScale = 1;

  constructor(ctx: GLContext, draw: DrawFn, config: Partial<SimulationConfig> = {}) {
    this.ctx = ctx;
    this.draw = draw;
    this.config = { ...DEFAULT_CONFIG, ...config };

    const { gl } = ctx;
    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    if (!vertex) throw new Error('Vertex shader inválido');

    const make = (source: string) => {
      const fragment = compileShader(gl, gl.FRAGMENT_SHADER, source);
      if (!fragment) throw new Error('Fragment shader inválido');
      const program = new Program(gl, vertex, fragment);
      gl.deleteShader(fragment);
      return program;
    };

    this.programs = {
      advection: make(ADVECTION_SHADER),
      curl: make(CURL_SHADER),
      vorticity: make(VORTICITY_SHADER),
      divergence: make(DIVERGENCE_SHADER),
      pressure: make(PRESSURE_SHADER),
      gradientSubtract: make(GRADIENT_SUBTRACT_SHADER),
      splat: make(SPLAT_VELOCITY_SHADER),
      densityErase: make(DENSITY_ERASE_SHADER),
      emitter: make(EMITTER_SHADER),
      ambient: make(AMBIENT_SHADER),
      clear: make(CLEAR_SHADER),
    };
    gl.deleteShader(vertex);
  }

  /** Crea (o recrea) las rejillas. Solo debe llamarse al cambiar de tamaño. */
  resize(width: number, height: number) {
    this.disposeBuffers();
    const ctx = this.ctx;
    this.aspect = width / Math.max(height, 1);

    const filter = ctx.supportsLinearFloat ? ctx.gl.LINEAR : ctx.gl.NEAREST;
    const vel = resolutionFor(width, height, this.config.velocityResolution);
    const den = resolutionFor(width, height, this.config.densityResolution);

    this.velocity = createPingPong(ctx, vel.width, vel.height, ctx.formats.rg, filter);
    this.density = createPingPong(ctx, den.width, den.height, ctx.formats.r, filter);
    this.pressure = createPingPong(ctx, vel.width, vel.height, ctx.formats.r, ctx.gl.NEAREST);
    this.divergenceFbo = createSingleFbo(ctx, vel.width, vel.height, ctx.formats.r, ctx.gl.NEAREST);
    this.curlFbo = createSingleFbo(ctx, vel.width, vel.height, ctx.formats.r, ctx.gl.NEAREST);
  }

  setMotionScale(scale: number) {
    this.motionScale = scale;
  }

  get densityTexture(): Fbo {
    return this.density.read;
  }

  get grids() {
    return {
      velocity: { width: this.velocity.read.width, height: this.velocity.read.height },
      density: { width: this.density.read.width, height: this.density.read.height },
    };
  }

  /** Ata el uniform de tamaño de téxel que el vertex shader usa para vecinos. */
  private bindTexel(program: Program, fbo: Fbo) {
    const { gl } = this.ctx;
    gl.uniform2f(program.uniform('uTexelSize'), fbo.texelSizeX, fbo.texelSizeY);
  }

  /**
   * Avanza la simulación un fotograma.
   * @param dt segundos transcurridos, ya acotados por el llamante
   * @param pointer muestra del cursor, o null si no hay interacción
   */
  step(dt: number, pointer: PointerSample | null) {
    const { gl } = this.ctx;
    const p = this.programs;
    const motion = this.motionScale;
    this.elapsed += dt * motion;

    gl.disable(gl.BLEND);

    // 1. La velocidad se transporta a sí misma.
    p.advection.bind();
    this.bindTexel(p.advection, this.velocity.read);
    gl.uniform1i(p.advection.uniform('uVelocity'), this.velocity.read.attach(0));
    gl.uniform1i(p.advection.uniform('uSource'), this.velocity.read.attach(0));
    gl.uniform1f(p.advection.uniform('uDt'), dt);
    gl.uniform1f(p.advection.uniform('uDissipation'), this.config.velocityDissipation);
    gl.uniform2f(
      p.advection.uniform('uTexelSize'),
      this.velocity.read.texelSizeX,
      this.velocity.read.texelSizeY
    );
    this.draw(this.velocity.write);
    this.velocity.swap();

    // 2. Corrientes ambientales: el humo nunca queda del todo quieto.
    p.ambient.bind();
    this.bindTexel(p.ambient, this.velocity.read);
    gl.uniform1i(p.ambient.uniform('uVelocity'), this.velocity.read.attach(0));
    gl.uniform1i(p.ambient.uniform('uDensity'), this.density.read.attach(1));
    gl.uniform1f(p.ambient.uniform('uTime'), this.elapsed);
    gl.uniform1f(p.ambient.uniform('uStrength'), this.config.ambient * dt * motion);
    gl.uniform1f(p.ambient.uniform('uAspect'), this.aspect);
    this.draw(this.velocity.write);
    this.velocity.swap();

    // 3. Fuerza del cursor, repartida a lo largo del trayecto recorrido.
    if (pointer && motion > 0.5) {
      const speed = Math.hypot(pointer.dx, pointer.dy);
      if (speed > 0.00015) {
        p.splat.bind();
        this.bindTexel(p.splat, this.velocity.read);
        gl.uniform1i(p.splat.uniform('uTarget'), this.velocity.read.attach(0));
        gl.uniform2f(p.splat.uniform('uPointA'), pointer.prevX, pointer.prevY);
        gl.uniform2f(p.splat.uniform('uPointB'), pointer.x, pointer.y);
        // La velocidad se expresa en téxeles/segundo (el shader de advección la
        // multiplica por el tamaño de téxel), así que la ganancia debe estar
        // holgadamente por encima del campo ambiental para que el gesto se lea.
        // Con techo, para que un movimiento brusco no produzca un estallido.
        const gain = Math.min(speed * 6000, 260);
        gl.uniform2f(
          p.splat.uniform('uForce'),
          (pointer.dx / speed) * gain,
          (pointer.dy / speed) * gain
        );
        gl.uniform1f(p.splat.uniform('uRadius'), this.config.splatRadius);
        gl.uniform1f(p.splat.uniform('uAspect'), this.aspect);
        this.draw(this.velocity.write);
        this.velocity.swap();

        this.pendingErase = { pointer, strength: Math.min(speed * 26, 1) };
      }
    }

    // 4. Curl y vorticity: devuelven los remolinos que la advección disipa.
    p.curl.bind();
    this.bindTexel(p.curl, this.velocity.read);
    gl.uniform1i(p.curl.uniform('uVelocity'), this.velocity.read.attach(0));
    this.draw(this.curlFbo);

    p.vorticity.bind();
    this.bindTexel(p.vorticity, this.velocity.read);
    gl.uniform1i(p.vorticity.uniform('uVelocity'), this.velocity.read.attach(0));
    gl.uniform1i(p.vorticity.uniform('uCurl'), this.curlFbo.attach(1));
    gl.uniform1f(p.vorticity.uniform('uCurlStrength'), this.config.curl * motion);
    gl.uniform1f(p.vorticity.uniform('uDt'), dt);
    this.draw(this.velocity.write);
    this.velocity.swap();

    // 5. Proyección de presión: sin esto el campo tendría fuentes y sumideros,
    //    y el humo se trasladaría en bloque en lugar de fluir.
    p.divergence.bind();
    this.bindTexel(p.divergence, this.velocity.read);
    gl.uniform1i(p.divergence.uniform('uVelocity'), this.velocity.read.attach(0));
    this.draw(this.divergenceFbo);

    // Se atenúa la presión heredada antes de iterar. Sin esto, el campo
    // acumula la perturbación del cursor fotograma tras fotograma y una
    // pulsación local acaba moviendo toda la escena.
    p.clear.bind();
    this.bindTexel(p.clear, this.pressure.read);
    gl.uniform1i(p.clear.uniform('uTexture'), this.pressure.read.attach(0));
    gl.uniform1f(p.clear.uniform('uValue'), this.config.pressureRetention);
    this.draw(this.pressure.write);
    this.pressure.swap();

    p.pressure.bind();
    this.bindTexel(p.pressure, this.pressure.read);
    gl.uniform1i(p.pressure.uniform('uDivergence'), this.divergenceFbo.attach(0));
    for (let i = 0; i < this.config.pressureIterations; i++) {
      gl.uniform1i(p.pressure.uniform('uPressure'), this.pressure.read.attach(1));
      this.draw(this.pressure.write);
      this.pressure.swap();
    }

    p.gradientSubtract.bind();
    this.bindTexel(p.gradientSubtract, this.velocity.read);
    gl.uniform1i(p.gradientSubtract.uniform('uPressure'), this.pressure.read.attach(0));
    gl.uniform1i(p.gradientSubtract.uniform('uVelocity'), this.velocity.read.attach(1));
    this.draw(this.velocity.write);
    this.velocity.swap();

    // 6. La densidad se transporta con la velocidad ya proyectada. Aquí es
    //    donde una nube puede estirarse, partirse o abrirse.
    p.advection.bind();
    this.bindTexel(p.advection, this.density.read);
    gl.uniform2f(
      p.advection.uniform('uTexelSize'),
      this.velocity.read.texelSizeX,
      this.velocity.read.texelSizeY
    );
    gl.uniform1i(p.advection.uniform('uVelocity'), this.velocity.read.attach(0));
    gl.uniform1i(p.advection.uniform('uSource'), this.density.read.attach(1));
    gl.uniform1f(p.advection.uniform('uDt'), dt);
    gl.uniform1f(p.advection.uniform('uDissipation'), this.config.densityDissipation);
    this.draw(this.density.write);
    this.density.swap();

    // 6b. El cursor aparta el humo a su paso: abre un canal a lo largo del
    //     trayecto, que la advección y los emisores vuelven a cerrar solos.
    if (this.pendingErase) {
      const { pointer: pe, strength } = this.pendingErase;
      p.densityErase.bind();
      this.bindTexel(p.densityErase, this.density.read);
      gl.uniform1i(p.densityErase.uniform('uTarget'), this.density.read.attach(0));
      gl.uniform2f(p.densityErase.uniform('uPointA'), pe.prevX, pe.prevY);
      gl.uniform2f(p.densityErase.uniform('uPointB'), pe.x, pe.y);
      gl.uniform1f(p.densityErase.uniform('uRadius'), this.config.splatRadius);
      gl.uniform1f(p.densityErase.uniform('uAmount'), this.config.eraseAmount * strength);
      gl.uniform1f(p.densityErase.uniform('uAspect'), this.aspect);
      this.draw(this.density.write);
      this.density.swap();
      this.pendingErase = null;
    }

    // 7. Aporte lento de materia nueva desde bordes y base.
    p.emitter.bind();
    this.bindTexel(p.emitter, this.density.read);
    gl.uniform1i(p.emitter.uniform('uTarget'), this.density.read.attach(0));
    gl.uniform1f(p.emitter.uniform('uTime'), this.elapsed);
    gl.uniform1f(p.emitter.uniform('uAmount'), this.config.emission * dt);
    gl.uniform1f(p.emitter.uniform('uAspect'), this.aspect);
    this.draw(this.density.write);
    this.density.swap();
  }

  private disposeBuffers() {
    this.velocity?.dispose();
    this.density?.dispose();
    this.pressure?.dispose();
    if (this.divergenceFbo) disposeFbo(this.ctx, this.divergenceFbo);
    if (this.curlFbo) disposeFbo(this.ctx, this.curlFbo);
  }

  dispose() {
    this.disposeBuffers();
    for (const program of Object.values(this.programs)) program.dispose();
  }
}
