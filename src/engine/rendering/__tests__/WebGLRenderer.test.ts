import { describe, expect, it, vi } from 'vitest';
import type { SimulationConfig } from '../../../types/simulation';
import { ObstacleManager } from '../../simulation/ObstacleManager';
import { ParticleSystem } from '../../simulation/ParticleSystem';
import { FluidSolver } from '../../simulation/FluidSolver';
import { WebGLRenderer } from '../WebGLRenderer';

function createConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    density: 2.0,
    viscosity: 0.0,
    impulseForce: 10.0,
    gridSize: 128,
    resolution: 1.0,
    viewMode: 'density',
    dissipation: 0.98,
    velocityDissipation: 0.99,
    splatRadius: 0.02,
    showGrid: false,
    showTrails: true,
    glowIntensity: 0.5,
    colorPalette: 'default',
    fluidType: 'liquid',
    vorticity: 2.0,
    renderBackend: 'classic',
    ...overrides,
  };
}

function createMockWebGL2Context() {
  const viewport = vi.fn();
  const enable = vi.fn();
  const blendFunc = vi.fn();
  const texSubImage2D = vi.fn();
  const drawArrays = vi.fn();
  const deleteTexture = vi.fn();
  const deleteProgram = vi.fn();
  const deleteBuffer = vi.fn();
  const deleteVertexArray = vi.fn();

  const gl = {
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    BLEND: 0x0be2,
    SRC_ALPHA: 0x0302,
    ONE_MINUS_SRC_ALPHA: 0x0303,
    ONE: 1,
    ARRAY_BUFFER: 0x8892,
    STATIC_DRAW: 0x88e4,
    DYNAMIC_DRAW: 0x88e8,
    FLOAT: 0x1406,
    TEXTURE_2D: 0x0de1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    LINEAR: 0x2601,
    CLAMP_TO_EDGE: 0x812f,
    R32F: 0x822e,
    RED: 0x1903,
    R8: 0x8229,
    UNSIGNED_BYTE: 0x1401,
    COLOR_BUFFER_BIT: 0x4000,
    TRIANGLES: 0x0004,
    POINTS: 0x0000,
    TEXTURE0: 0x84c0,
    VERTEX_SHADER: 0x8b31,
    FRAGMENT_SHADER: 0x8b30,
    COMPILE_STATUS: 0x8b81,
    LINK_STATUS: 0x8b82,

    getExtension: vi.fn(() => ({})),
    pixelStorei: vi.fn(),
    createVertexArray: vi.fn(() => ({} as WebGLVertexArrayObject)),
    bindVertexArray: vi.fn(),
    createBuffer: vi.fn(() => ({} as WebGLBuffer)),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    createTexture: vi.fn(() => ({} as WebGLTexture)),
    bindTexture: vi.fn(),
    texParameteri: vi.fn(),
    texImage2D: vi.fn(),
    texSubImage2D,
    activeTexture: vi.fn(),
    createShader: vi.fn(() => ({} as WebGLShader)),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getShaderInfoLog: vi.fn(() => ''),
    deleteShader: vi.fn(),
    createProgram: vi.fn(() => ({} as WebGLProgram)),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    getProgramInfoLog: vi.fn(() => ''),
    useProgram: vi.fn(),
    getUniformLocation: vi.fn(() => ({} as WebGLUniformLocation)),
    uniform1i: vi.fn(),
    uniform1f: vi.fn(),
    uniform2f: vi.fn(),
    uniform3f: vi.fn(),
    viewport,
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays,
    deleteTexture,
    deleteProgram,
    deleteBuffer,
    deleteVertexArray,
    enable,
    blendFunc,
  } as unknown as WebGL2RenderingContext;

  return {
    gl,
    spies: { viewport, enable, blendFunc, texSubImage2D, drawArrays, deleteTexture, deleteProgram, deleteBuffer, deleteVertexArray },
  };
}

function createCanvasMock(gl: WebGL2RenderingContext, width: number = 800, height: number = 600): HTMLCanvasElement {
  const canvas = {
    width: 0,
    height: 0,
    clientWidth: width,
    clientHeight: height,
    getContext: vi.fn((type: string) => {
      if (type === 'webgl2') return gl;
      return null;
    }),
  };

  return canvas as unknown as HTMLCanvasElement;
}

function createSimulation(configOverrides: Partial<SimulationConfig> = {}) {
  const obstacleManager = new ObstacleManager();
  const solver = new FluidSolver(createConfig(configOverrides), obstacleManager);
  solver.resize(800, 600);
  const particleSystem = new ParticleSystem(10);
  return { obstacleManager, solver, particleSystem };
}

describe('WebGLRenderer integração', () => {
  it('inicializa viewport e estado base de blend', () => {
    const { gl, spies } = createMockWebGL2Context();
    const canvas = createCanvasMock(gl, 900, 500);
    const renderer = new WebGLRenderer(canvas);

    renderer.initialize();

    expect(renderer.getWidth()).toBe(900);
    expect(renderer.getHeight()).toBe(500);
    expect(canvas.width).toBe(900);
    expect(canvas.height).toBe(500);
    expect(spies.viewport).toHaveBeenCalledWith(0, 0, 900, 500);
    expect(spies.enable).toHaveBeenCalledWith(gl.BLEND);
    expect(spies.blendFunc).toHaveBeenCalledWith(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  });

  it('faz upload das texturas e calcula memória estimada da rendering', () => {
    const { gl, spies } = createMockWebGL2Context();
    const canvas = createCanvasMock(gl);
    const renderer = new WebGLRenderer(canvas);
    renderer.initialize();

    const { obstacleManager, solver, particleSystem } = createSimulation();
    const particles = particleSystem.getParticles();
    particles[0].life = 1;
    particles[0].maxLife = 1;

    renderer.draw(solver, obstacleManager, particleSystem, createConfig());

    expect(spies.texSubImage2D).toHaveBeenCalledTimes(4);
    expect(renderer.getEstimatedMemoryBytes()).toBe(160024);
  });

  it('não desenha partículas quando viewMode não exige e trilhas estão desligadas', () => {
    const { gl, spies } = createMockWebGL2Context();
    const canvas = createCanvasMock(gl);
    const renderer = new WebGLRenderer(canvas);
    renderer.initialize();

    const { obstacleManager, solver, particleSystem } = createSimulation();
    renderer.draw(solver, obstacleManager, particleSystem, createConfig({ viewMode: 'velocity', showTrails: false }));

    const particleDrawCalls = spies.drawArrays.mock.calls.filter((call) => call[0] === gl.POINTS);
    expect(particleDrawCalls.length).toBe(0);
  });

  it('não desenha partículas no modo difuso quando trilhas estão desligadas', () => {
    const { gl, spies } = createMockWebGL2Context();
    const canvas = createCanvasMock(gl);
    const renderer = new WebGLRenderer(canvas);
    renderer.initialize();

    const { obstacleManager, solver, particleSystem } = createSimulation();
    renderer.draw(solver, obstacleManager, particleSystem, createConfig({ viewMode: 'diffuse', showTrails: false }));

    const particleDrawCalls = spies.drawArrays.mock.calls.filter((call) => call[0] === gl.POINTS);
    expect(particleDrawCalls.length).toBe(0);
  });

  it('libera recursos gráficos em dispose', () => {
    const { gl, spies } = createMockWebGL2Context();
    const canvas = createCanvasMock(gl);
    const renderer = new WebGLRenderer(canvas);
    renderer.initialize();

    const { obstacleManager, solver, particleSystem } = createSimulation();
    renderer.draw(solver, obstacleManager, particleSystem, createConfig());
    renderer.dispose();

    expect(spies.deleteTexture).toHaveBeenCalledTimes(4);
    expect(spies.deleteProgram).toHaveBeenCalledTimes(4);
    expect(spies.deleteBuffer).toHaveBeenCalled();
    expect(spies.deleteVertexArray).toHaveBeenCalled();
    expect(renderer.getEstimatedMemoryBytes()).toBe(0);
  });
});
