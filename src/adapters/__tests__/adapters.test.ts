import { describe, expect, it, vi } from 'vitest';
import type { SimulationConfig } from '../../types/simulation';
import { createReactRippleAdapter } from '../react/createReactRippleAdapter';
import { createVanillaRippleAdapter } from '../vanilla/createVanillaRippleAdapter';

function createConfig(): SimulationConfig {
  return {
    density: 2.0,
    viscosity: 0.001,
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
  };
}

function createMockWebGL2Context(): WebGL2RenderingContext {
  return {
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
    texSubImage2D: vi.fn(),
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
    viewport: vi.fn(),
    clearColor: vi.fn(),
    clear: vi.fn(),
    drawArrays: vi.fn(),
    deleteTexture: vi.fn(),
    deleteProgram: vi.fn(),
    deleteBuffer: vi.fn(),
    deleteVertexArray: vi.fn(),
    enable: vi.fn(),
    blendFunc: vi.fn(),
  } as unknown as WebGL2RenderingContext;
}

function createCanvasMock(gl: WebGL2RenderingContext): HTMLCanvasElement {
  return {
    width: 0,
    height: 0,
    clientWidth: 640,
    clientHeight: 360,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({ width: 640, height: 360 })),
    getContext: vi.fn((type: string) => (type === 'webgl2' ? gl : null)),
  } as unknown as HTMLCanvasElement;
}

describe('Adapters oficiais', () => {
  it('adaptador vanilla inicializa e processa input programático', () => {
    const gl = createMockWebGL2Context();
    const canvas = createCanvasMock(gl);
    const adapter = createVanillaRippleAdapter(canvas, createConfig(), {
      autoStart: false,
      autoResize: false,
      enableDomInput: false,
    });

    adapter.processInput({ normX: 0.5, normY: 0.5, injectDensity: true });
    expect(adapter.getEngine().getRuntimeMetrics().activeParticles).toBeGreaterThan(0);
    adapter.destroy();
  });

  it('adaptador react exige canvas antes de iniciar', () => {
    const adapter = createReactRippleAdapter(createConfig(), { enableDomInput: false });
    expect(() => adapter.start()).toThrowError();
  });
});
