import { RenderBackendStatus, SimulationConfig } from '../../types/simulation';
import { FluidSolver } from '../simulation/FluidSolver';
import { ObstacleManager } from '../simulation/ObstacleManager';
import { ParticleSystem } from '../simulation/ParticleSystem';
import { RendererBackend } from './RendererBackend';
import { ShaderProgram } from './webgl/ShaderProgram';
import { Texture } from './webgl/Texture';
import { quadVert } from './shaders/quad.vert';
import { fluidFrag } from './shaders/fluid.frag';
import { fluidExperimentalFrag } from './shaders/fluid.experimental.frag';
import { particleVert } from './shaders/particle.vert';
import { particleFrag } from './shaders/particle.frag';
import { obstacleFrag } from './shaders/obstacle.frag';
import { getTemperatureEmission } from './temperatureSpectrum';

export class WebGLRenderer implements RendererBackend {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private width: number = 0;
  private height: number = 0;

  private fluidProgram!: ShaderProgram;
  private fluidExperimentalProgram!: ShaderProgram;
  private particleProgram!: ShaderProgram;
  private obstacleProgram!: ShaderProgram;

  private quadVao!: WebGLVertexArrayObject;
  private quadVbo!: WebGLBuffer;

  private densityTex!: Texture;
  private velocityXTex!: Texture;
  private velocityYTex!: Texture;
  private obstacleTex!: Texture;

  private particleVao!: WebGLVertexArrayObject;
  private particleVbo!: WebGLBuffer;
  private particleData!: Float32Array;

  private simWidth: number = 0;
  private simHeight: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    
    // Enable float textures
    this.gl.getExtension('EXT_color_buffer_float');
    this.gl.getExtension('OES_texture_float_linear');

    // Flip Y for texture uploads to match our solver's top-down coordinate system
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
  }

  public getWidth(): number { return this.width; }
  public getHeight(): number { return this.height; }
  public getBackendStatus(): RenderBackendStatus {
    return {
      requested: 'classic',
      active: 'classic',
      isFallback: false,
      supportsWebGPU: typeof navigator !== 'undefined' && 'gpu' in navigator,
    };
  }

  public initialize(): void {
    this.initShaders();
    this.initQuad();
    this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
    
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }

  private initShaders(): void {
    this.fluidProgram = new ShaderProgram(this.gl, quadVert, fluidFrag);
    this.fluidExperimentalProgram = new ShaderProgram(this.gl, quadVert, fluidExperimentalFrag);
    this.particleProgram = new ShaderProgram(this.gl, particleVert, particleFrag);
    this.obstacleProgram = new ShaderProgram(this.gl, quadVert, obstacleFrag);
  }

  private initQuad(): void {
    this.quadVao = this.gl.createVertexArray()!;
    this.gl.bindVertexArray(this.quadVao);

    this.quadVbo = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadVbo);
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
    ]);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    this.gl.enableVertexAttribArray(0);
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.bindVertexArray(null);
  }

  private initTextures(width: number, height: number): void {
    if (this.densityTex) this.densityTex.dispose();
    if (this.velocityXTex) this.velocityXTex.dispose();
    if (this.velocityYTex) this.velocityYTex.dispose();
    if (this.obstacleTex) this.obstacleTex.dispose();

    this.simWidth = width;
    this.simHeight = height;

    this.densityTex = new Texture(this.gl, width, height, this.gl.R32F, this.gl.RED, this.gl.FLOAT);
    this.velocityXTex = new Texture(this.gl, width, height, this.gl.R32F, this.gl.RED, this.gl.FLOAT);
    this.velocityYTex = new Texture(this.gl, width, height, this.gl.R32F, this.gl.RED, this.gl.FLOAT);
    this.obstacleTex = new Texture(this.gl, width, height, this.gl.R8, this.gl.RED, this.gl.UNSIGNED_BYTE);
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  public clear(): void {
    this.gl.clearColor(15/255, 17/255, 26/255, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  public getEstimatedMemoryBytes(): number {
    if (this.simWidth === 0 || this.simHeight === 0) return 0;

    const pixelCount = this.simWidth * this.simHeight;
    const densityBytes = pixelCount * 4;
    const velocityXBytes = pixelCount * 4;
    const velocityYBytes = pixelCount * 4;
    const obstacleBytes = pixelCount;
    const particleBufferBytes = this.particleData ? this.particleData.byteLength : 0;

    return densityBytes + velocityXBytes + velocityYBytes + obstacleBytes + particleBufferBytes;
  }

  public draw(solver: FluidSolver, obstacleManager: ObstacleManager, particleSystem: ParticleSystem, config: SimulationConfig): void {
    if (solver.width !== this.simWidth || solver.height !== this.simHeight) {
      this.initTextures(solver.width, solver.height);
    }

    // Upload data
    this.densityTex.updateData(solver.density);
    this.velocityXTex.updateData(solver.velocityX);
    this.velocityYTex.updateData(solver.velocityY);
    this.obstacleTex.updateData(obstacleManager.getObstacleGrid());

    // Clear screen
    this.gl.clearColor(15/255, 17/255, 26/255, 1.0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    let viewModeInt = 0;
    if (config.viewMode === 'velocity') viewModeInt = 1;
    if (config.viewMode === 'pressure') viewModeInt = 2;
    if (config.viewMode === 'particles') viewModeInt = 3;
    if (config.viewMode === 'diffuse') viewModeInt = 4;

    // Draw Fluid (always, to show grid or density)
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    const activeFluidProgram =
      config.renderBackend === 'experimental-gpu' ? this.fluidExperimentalProgram : this.fluidProgram;

    activeFluidProgram.bind();
    
    this.densityTex.bind(0);
    this.velocityXTex.bind(1);
    this.velocityYTex.bind(2);
    
    activeFluidProgram.setUniform1i('uDensityTex', 0);
    activeFluidProgram.setUniform1i('uVelocityXTex', 1);
    activeFluidProgram.setUniform1i('uVelocityYTex', 2);
    activeFluidProgram.setUniform1i('uViewMode', viewModeInt);
    
    let paletteInt = 0;
    if (config.colorPalette === 'fire') paletteInt = 1;
    if (config.colorPalette === 'ocean') paletteInt = 2;
    if (config.colorPalette === 'plasma') paletteInt = 3;
    activeFluidProgram.setUniform1i('uPalette', paletteInt);

    let fluidTypeInt = 0;
    if (config.fluidType === 'gas') fluidTypeInt = 1;
    if (config.fluidType === 'smoke') fluidTypeInt = 2;
    if (config.fluidType === 'plasma') fluidTypeInt = 3;
    activeFluidProgram.setUniform1i('uFluidType', fluidTypeInt);

    activeFluidProgram.setUniform1i('uShowGrid', config.showGrid ? 1 : 0);
    activeFluidProgram.setUniform1f('uGridSize', 32.0); // Fixed grid size for better visibility
    const emission = getTemperatureEmission(config);
    activeFluidProgram.setUniform3f('uEmissionTint', emission.tint[0], emission.tint[1], emission.tint[2]);
    activeFluidProgram.setUniform1f('uEmissionStrength', emission.strength);

    this.gl.bindVertexArray(this.quadVao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

    // Draw Particles (Always draw if enabled or in density mode)
    if (config.viewMode === 'particles' || config.viewMode === 'density' || config.showTrails) { 
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE); // Additive blending for particles
      this.drawParticles(particleSystem);
    }

    // Draw Obstacles
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    this.obstacleProgram.bind();
    this.obstacleTex.bind(0);
    this.obstacleProgram.setUniform1i('uObstacleTex', 0);
    this.gl.bindVertexArray(this.quadVao);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  private drawParticles(particleSystem: ParticleSystem): void {
    const particles = particleSystem.getParticles();
    const count = particles.length;
    
    if (!this.particleVao) {
      this.particleVao = this.gl.createVertexArray()!;
      this.particleVbo = this.gl.createBuffer()!;
      this.particleData = new Float32Array(count * 7); // x, y, life, r, g, b, size
    } else if (this.particleData.length < count * 7) {
      this.particleData = new Float32Array(count * 7);
    }

    let idx = 0;
    let activeCount = 0;
    for (let i = 0; i < count; i++) {
      const p = particles[i];
      if (p.life <= 0) continue;
      
      this.particleData[idx++] = p.x;
      this.particleData[idx++] = p.y;
      this.particleData[idx++] = p.life / p.maxLife;
      this.particleData[idx++] = p.colorR;
      this.particleData[idx++] = p.colorG;
      this.particleData[idx++] = p.colorB;
      this.particleData[idx++] = p.size;
      activeCount++;
    }

    if (activeCount === 0) return;

    this.gl.bindVertexArray(this.particleVao);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.particleVbo);
    
    // Use bufferSubData for better performance than bufferData
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.particleData.subarray(0, activeCount * 7), this.gl.DYNAMIC_DRAW);

    const stride = 7 * 4; // 7 floats * 4 bytes
    this.gl.enableVertexAttribArray(0); // aPosition
    this.gl.vertexAttribPointer(0, 2, this.gl.FLOAT, false, stride, 0);
    
    this.gl.enableVertexAttribArray(1); // aLife
    this.gl.vertexAttribPointer(1, 1, this.gl.FLOAT, false, stride, 2 * 4);
    
    this.gl.enableVertexAttribArray(2); // aColor
    this.gl.vertexAttribPointer(2, 3, this.gl.FLOAT, false, stride, 3 * 4);
    
    this.gl.enableVertexAttribArray(3); // aSize
    this.gl.vertexAttribPointer(3, 1, this.gl.FLOAT, false, stride, 6 * 4);

    this.particleProgram.bind();
    this.gl.drawArrays(this.gl.POINTS, 0, activeCount);
    
    this.gl.bindVertexArray(null);
  }

  public dispose(): void {
    if (this.densityTex) this.densityTex.dispose();
    if (this.velocityXTex) this.velocityXTex.dispose();
    if (this.velocityYTex) this.velocityYTex.dispose();
    if (this.obstacleTex) this.obstacleTex.dispose();

    if (this.fluidProgram) this.fluidProgram.dispose();
    if (this.fluidExperimentalProgram) this.fluidExperimentalProgram.dispose();
    if (this.particleProgram) this.particleProgram.dispose();
    if (this.obstacleProgram) this.obstacleProgram.dispose();

    if (this.quadVbo) this.gl.deleteBuffer(this.quadVbo);
    if (this.quadVao) this.gl.deleteVertexArray(this.quadVao);
    if (this.particleVbo) this.gl.deleteBuffer(this.particleVbo);
    if (this.particleVao) this.gl.deleteVertexArray(this.particleVao);

    this.particleData = new Float32Array(0);
    this.simWidth = 0;
    this.simHeight = 0;
  }
}
