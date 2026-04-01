import type { RenderBackendStatus, SimulationConfig } from '../../../types/simulation';
import type { FluidSolver } from '../../simulation/FluidSolver';
import type { ObstacleManager } from '../../simulation/ObstacleManager';
import type { ParticleSystem } from '../../simulation/ParticleSystem';
import type { RendererBackend } from '../RendererBackend';
import { WebGLRenderer } from '../WebGLRenderer';
import { getTemperatureEmission } from '../temperatureSpectrum';

const CLEAR_COLOR = { r: 15 / 255, g: 17 / 255, b: 26 / 255, a: 1 };

function isWebGPUAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export class WebGPUExperimentalRenderer implements RendererBackend {
  private canvas: HTMLCanvasElement;
  private width = 0;
  private height = 0;
  private simWidth = 0;
  private simHeight = 0;
  private densityPixels = new Uint8Array(0);
  private densityUploadPixels = new Uint8Array(0);
  private densityUploadBytesPerRow = 0;
  private particleHeat = new Float32Array(0);

  private context: any | null = null;
  private adapter: any | null = null;
  private device: any | null = null;
  private pipeline: any | null = null;
  private bindGroupLayout: any | null = null;
  private bindGroup: any | null = null;
  private sampler: any | null = null;
  private densityTexture: any | null = null;
  private densityTextureView: any | null = null;
  private presentationFormat = 'bgra8unorm';

  private initializePromise: Promise<void> | null = null;
  private initialized = false;
  private fallbackRenderer: WebGLRenderer | null = null;
  private fallbackActive = false;
  private status: RenderBackendStatus;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const supportsWebGPU = isWebGPUAvailable();
    this.status = {
      requested: 'webgpu-experimental',
      active: 'webgpu-experimental',
      isFallback: false,
      supportsWebGPU,
      reason: supportsWebGPU ? undefined : 'WebGPU indisponível no ambiente atual.',
    };
  }

  public getWidth(): number {
    if (this.fallbackActive && this.fallbackRenderer) {
      return this.fallbackRenderer.getWidth();
    }
    return this.width;
  }

  public getHeight(): number {
    if (this.fallbackActive && this.fallbackRenderer) {
      return this.fallbackRenderer.getHeight();
    }
    return this.height;
  }

  public getBackendStatus(): RenderBackendStatus {
    return this.status;
  }

  public initialize(): void {
    if (this.fallbackActive && this.fallbackRenderer) {
      this.fallbackRenderer.initialize();
      return;
    }
    if (this.initializePromise) return;
    this.initializePromise = this.initWebGPU().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha desconhecida ao inicializar WebGPU.';
      this.activateFallback(message);
    });
  }

  private activateFallback(reason: string): void {
    if (!this.fallbackRenderer) {
      try {
        this.fallbackRenderer = new WebGLRenderer(this.canvas);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha ao ativar fallback WebGL.';
        this.status.reason = `${reason} | ${message}`;
        this.initialized = false;
        return;
      }
    }

    this.fallbackActive = true;
    this.status.active = 'classic';
    this.status.isFallback = true;
    this.status.reason = reason;
    this.initialized = false;
    this.initializePromise = null;
    this.fallbackRenderer.initialize();
    this.fallbackRenderer.resize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private async initWebGPU(): Promise<void> {
    if (!isWebGPUAvailable()) {
      throw new Error('WebGPU indisponível: backend webgpu-experimental não possui fallback neste modo.');
    }

    const context = this.canvas.getContext('webgpu') as any;
    if (!context) {
      throw new Error('Não foi possível obter GPUCanvasContext para WebGPU.');
    }

    const adapter = await (navigator as any).gpu.requestAdapter();
    if (!adapter) {
      throw new Error('Falha ao obter GPUAdapter.');
    }

    const device = await adapter.requestDevice();
    const format = (navigator as any).gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: 'opaque',
    });

    this.context = context;
    this.adapter = adapter;
    this.device = device;
    this.presentationFormat = format;
    this.sampler = device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    const shader = device.createShaderModule({
      code: `
        @group(0) @binding(0) var densityTex: texture_2d<f32>;
        @group(0) @binding(1) var densitySampler: sampler;

        struct VsOut {
          @builtin(position) position: vec4<f32>,
          @location(0) uv: vec2<f32>,
        };

        @vertex
        fn vs_main(@builtin(vertex_index) index: u32) -> VsOut {
          var positions = array<vec2<f32>, 3>(
            vec2<f32>(-1.0, -3.0),
            vec2<f32>(-1.0, 1.0),
            vec2<f32>(3.0, 1.0)
          );
          var out: VsOut;
          let p = positions[index];
          out.position = vec4<f32>(p, 0.0, 1.0);
          out.uv = p * 0.5 + vec2<f32>(0.5, 0.5);
          return out;
        }

        @fragment
        fn fs_main(input: VsOut) -> @location(0) vec4<f32> {
          let sampleColor = textureSample(densityTex, densitySampler, input.uv);
          return vec4<f32>(sampleColor.rgb, 1.0);
        }
      `,
    });

    this.bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: (globalThis as any).GPUShaderStage.FRAGMENT,
          texture: { sampleType: 'float' },
        },
        {
          binding: 1,
          visibility: (globalThis as any).GPUShaderStage.FRAGMENT,
          sampler: { type: 'filtering' },
        },
      ],
    });

    this.pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [this.bindGroupLayout],
      }),
      vertex: {
        module: shader,
        entryPoint: 'vs_main',
      },
      fragment: {
        module: shader,
        entryPoint: 'fs_main',
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });

    this.initialized = true;
    this.resize(this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private ensureDensityTexture(width: number, height: number): void {
    if (!this.device) return;
    if (this.simWidth === width && this.simHeight === height && this.densityTexture) return;

    this.simWidth = width;
    this.simHeight = height;
    this.densityPixels = new Uint8Array(width * height * 4);
    this.densityUploadBytesPerRow = Math.ceil((width * 4) / 256) * 256;
    this.densityUploadPixels = new Uint8Array(this.densityUploadBytesPerRow * height);
    this.particleHeat = new Float32Array(width * height);

    if (this.densityTexture) {
      this.densityTexture.destroy();
    }

    this.densityTexture = this.device.createTexture({
      size: { width, height, depthOrArrayLayers: 1 },
      format: 'rgba8unorm',
      usage:
        (globalThis as any).GPUTextureUsage.TEXTURE_BINDING |
        (globalThis as any).GPUTextureUsage.COPY_DST,
    });
    this.densityTextureView = this.densityTexture.createView();
    this.bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: this.densityTextureView },
        { binding: 1, resource: this.sampler },
      ],
    });
  }

  public resize(width: number, height: number): void {
    if (this.fallbackActive && this.fallbackRenderer) {
      this.fallbackRenderer.resize(width, height);
      return;
    }
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    if (this.context && this.device) {
      this.context.configure({
        device: this.device,
        format: this.presentationFormat,
        alphaMode: 'opaque',
      });
    }
  }

  public clear(): void {
    if (this.fallbackActive && this.fallbackRenderer) {
      this.fallbackRenderer.clear();
      return;
    }
    if (!this.initialized || !this.device || !this.context) return;
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: CLEAR_COLOR,
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }

  public getEstimatedMemoryBytes(): number {
    if (this.fallbackActive && this.fallbackRenderer) {
      return this.fallbackRenderer.getEstimatedMemoryBytes();
    }
    if (this.simWidth === 0 || this.simHeight === 0) return 0;
    return this.simWidth * this.simHeight * 4 + this.densityPixels.byteLength;
  }

  public draw(
    solver: FluidSolver,
    _obstacleManager: ObstacleManager,
    particleSystem: ParticleSystem,
    config: SimulationConfig,
  ): void {
    if (this.fallbackActive && this.fallbackRenderer) {
      this.fallbackRenderer.draw(solver, _obstacleManager, particleSystem, config);
      return;
    }

    if (!this.initializePromise) {
      this.initialize();
    }
    if (!this.initialized || !this.device || !this.context || !this.pipeline) {
      return;
    }

    try {
      this.ensureDensityTexture(solver.width, solver.height);
      if (!this.densityTexture || !this.bindGroup) return;

      this.fillPixelsFromViewMode(solver, particleSystem, config);

      this.copyToAlignedUploadBuffer(solver.width, solver.height);
      this.device.queue.writeTexture(
        { texture: this.densityTexture },
        this.densityUploadPixels,
        { bytesPerRow: this.densityUploadBytesPerRow },
        { width: solver.width, height: solver.height, depthOrArrayLayers: 1 },
      );

      const encoder = this.device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: this.context.getCurrentTexture().createView(),
            clearValue: CLEAR_COLOR,
            loadOp: 'clear',
            storeOp: 'store',
          },
        ],
      });

      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.draw(3, 1, 0, 0);
      pass.end();

      this.device.queue.submit([encoder.finish()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha desconhecida durante draw no backend WebGPU.';
      this.activateFallback(message);
    }
  }

  private fillPixelsFromViewMode(solver: FluidSolver, particleSystem: ParticleSystem, config: SimulationConfig): void {
    const count = solver.width * solver.height;
    const emission = getTemperatureEmission(config);
    if (config.viewMode === 'particles') {
      this.fillParticleHeat(solver.width, solver.height, particleSystem);
    }

    for (let i = 0; i < count; i++) {
      let value = 0;
      if (config.viewMode === 'density') {
        value = Math.min(1, Math.max(0, solver.density[i] * 0.8));
      } else if (config.viewMode === 'diffuse') {
        const smoothDensity = this.sampleDiffuseDensity(solver, i);
        const vx = solver.velocityX[i];
        const vy = solver.velocityY[i];
        const flow = Math.min(1, Math.sqrt(vx * vx + vy * vy) * 0.12);
        value = Math.min(1, Math.max(0, smoothDensity * 0.9 + flow * 0.18));
      } else if (config.viewMode === 'velocity') {
        const vx = solver.velocityX[i];
        const vy = solver.velocityY[i];
        value = Math.min(1, Math.sqrt(vx * vx + vy * vy) * 0.25);
      } else if (config.viewMode === 'pressure') {
        value = Math.min(1, Math.abs(solver.velocityX[i]) * 0.2);
      } else if (config.viewMode === 'particles') {
        value = this.particleHeat[i];
      }

      const color = config.viewMode === 'diffuse'
        ? this.mapDiffuseFluidColor(config.fluidType, value, emission.tint, emission.strength)
        : this.mapPalette(config.colorPalette, config.fluidType, value, emission.tint, emission.strength);
      const offset = i * 4;
      this.densityPixels[offset] = color[0];
      this.densityPixels[offset + 1] = color[1];
      this.densityPixels[offset + 2] = color[2];
      this.densityPixels[offset + 3] = 255;
    }
  }

  private sampleDiffuseDensity(solver: FluidSolver, index: number): number {
    const width = solver.width;
    const height = solver.height;
    const x = index % width;
    const y = Math.floor(index / width);

    let total = Math.max(0, solver.density[index]) * 0.3;
    let weight = 0.3;

    const offsets = [
      [-1, 0, 0.11],
      [1, 0, 0.11],
      [0, -1, 0.11],
      [0, 1, 0.11],
      [-1, -1, 0.065],
      [1, -1, 0.065],
      [-1, 1, 0.065],
      [1, 1, 0.065],
    ] as const;

    for (const [dx, dy, w] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const sample = Math.max(0, solver.density[nx + ny * width]);
      total += sample * w;
      weight += w;
    }

    return Math.min(1, Math.max(0, total / Math.max(weight, 1e-6)));
  }

  private copyToAlignedUploadBuffer(width: number, height: number): void {
    const srcBytesPerRow = width * 4;
    if (this.densityUploadBytesPerRow === srcBytesPerRow) {
      this.densityUploadPixels.set(this.densityPixels);
      return;
    }

    this.densityUploadPixels.fill(0);
    for (let row = 0; row < height; row++) {
      const srcOffset = row * srcBytesPerRow;
      const dstOffset = row * this.densityUploadBytesPerRow;
      this.densityUploadPixels.set(this.densityPixels.subarray(srcOffset, srcOffset + srcBytesPerRow), dstOffset);
    }
  }

  private fillParticleHeat(width: number, height: number, particleSystem: ParticleSystem): void {
    this.particleHeat.fill(0);
    const particles = particleSystem.getParticles();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.life <= 0) continue;
      const x = Math.max(0, Math.min(width - 1, Math.floor(p.x * width)));
      const y = Math.max(0, Math.min(height - 1, Math.floor(p.y * height)));
      const idx = x + y * width;
      this.particleHeat[idx] = Math.min(1, this.particleHeat[idx] + 0.25);
    }
  }

  private mapPalette(
    palette: SimulationConfig['colorPalette'],
    fluidType: SimulationConfig['fluidType'],
    value: number,
    emissionTint: [number, number, number],
    emissionStrength: number,
  ): [number, number, number] {
    let v = Math.max(0, Math.min(1, value));
    if (fluidType === 'gas') v = Math.pow(v, 1.35);
    if (fluidType === 'smoke') v = Math.pow(v, 0.68);
    if (fluidType === 'plasma') v = Math.min(1, Math.pow(v, 1.18) * 1.32);
    if (fluidType === 'liquid') v = Math.pow(v, 0.85);

    const floorValue = v > 0 ? 12 : 0;
    let rgb: [number, number, number];
    if (palette === 'fire') rgb = [Math.max(floorValue, Math.floor(255 * v)), Math.max(floorValue, Math.floor(180 * v)), Math.max(0, Math.floor(80 * v))];
    else if (palette === 'ocean') rgb = [Math.max(0, Math.floor(90 * v)), Math.max(floorValue, Math.floor(170 * v)), Math.max(floorValue, Math.floor(255 * v))];
    else if (palette === 'plasma') rgb = [Math.max(floorValue, Math.floor(220 * v)), Math.max(0, Math.floor(80 * v)), Math.max(floorValue, Math.floor(255 * v))];
    else rgb = [Math.max(floorValue, Math.floor(150 * v)), Math.max(floorValue, Math.floor(200 * v)), Math.max(floorValue, Math.floor(255 * v))];

    if (emissionStrength <= 0) {
      return rgb;
    }

    const e = emissionStrength * (0.35 + v * 0.65);
    return [
      Math.min(255, Math.floor(rgb[0] + emissionTint[0] * 255 * e)),
      Math.min(255, Math.floor(rgb[1] + emissionTint[1] * 255 * e)),
      Math.min(255, Math.floor(rgb[2] + emissionTint[2] * 255 * e)),
    ];
  }

  private mapDiffuseFluidColor(
    fluidType: SimulationConfig['fluidType'],
    value: number,
    emissionTint: [number, number, number],
    emissionStrength: number,
  ): [number, number, number] {
    const t = Math.max(0, Math.min(1, value));
    const lerp = (a: number, b: number) => a + (b - a) * t;

    let rgb: [number, number, number];
    if (fluidType === 'liquid') {
      rgb = [Math.floor(lerp(10, 77)), Math.floor(lerp(31, 189)), Math.floor(lerp(56, 255))];
    } else if (fluidType === 'gas') {
      rgb = [Math.floor(lerp(20, 212)), Math.floor(lerp(26, 230)), Math.floor(lerp(36, 255))];
    } else if (fluidType === 'smoke') {
      rgb = [Math.floor(lerp(18, 199)), Math.floor(lerp(18, 199)), Math.floor(lerp(18, 199))];
    } else {
      rgb = [Math.floor(lerp(51, 255)), Math.floor(lerp(15, 194)), Math.floor(lerp(5, 66))];
    }

    if (emissionStrength <= 0) {
      return rgb;
    }

    const e = emissionStrength * (0.35 + t * 0.65);
    return [
      Math.min(255, Math.floor(rgb[0] + emissionTint[0] * 255 * e)),
      Math.min(255, Math.floor(rgb[1] + emissionTint[1] * 255 * e)),
      Math.min(255, Math.floor(rgb[2] + emissionTint[2] * 255 * e)),
    ];
  }

  public dispose(): void {
    if (this.fallbackRenderer) {
      this.fallbackRenderer.dispose();
      this.fallbackRenderer = null;
    }
    this.fallbackActive = false;
    if (this.densityTexture) {
      this.densityTexture.destroy();
      this.densityTexture = null;
    }
    this.bindGroup = null;
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.sampler = null;
    this.device = null;
    this.adapter = null;
    this.context = null;
    this.simWidth = 0;
    this.simHeight = 0;
    this.densityPixels = new Uint8Array(0);
    this.densityUploadPixels = new Uint8Array(0);
    this.densityUploadBytesPerRow = 0;
    this.particleHeat = new Float32Array(0);
    this.initialized = false;
    this.initializePromise = null;
  }
}
