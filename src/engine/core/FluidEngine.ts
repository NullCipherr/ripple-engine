import {
  EngineInputCommand,
  FluidEngineOptions,
  RenderBackend,
  RenderBackendStatus,
  SimulationConfig,
  Obstacle,
} from '../../types/simulation';
import { RendererBackend } from '../rendering/RendererBackend';
import { WebGLRenderer } from '../rendering/WebGLRenderer';
import { WebGPUExperimentalRenderer } from '../rendering/webgpu/WebGPUExperimentalRenderer';
import { FluidSolver } from '../simulation/FluidSolver';
import { ObstacleManager } from '../simulation/ObstacleManager';
import { ParticleSystem } from '../simulation/ParticleSystem';
import { InputController } from './InputController';

export interface RuntimeMetrics {
  activeParticles: number;
  estimatedMemoryMB: number;
}

/**
 * Core Fluid Engine class.
 * Orchestrates the simulation state, renderer, and input controller.
 */
export class FluidEngine {
  private canvas: HTMLCanvasElement;
  private solver: FluidSolver;
  private renderer: RendererBackend;
  private inputController: InputController | null;
  private obstacleManager: ObstacleManager;
  private particleSystem: ParticleSystem;
  private config: SimulationConfig;
  private options: Required<FluidEngineOptions>;
  public onObstacleChange?: (obstacles: Obstacle[]) => void;

  constructor(canvas: HTMLCanvasElement, config: SimulationConfig, options: FluidEngineOptions = {}) {
    this.canvas = canvas;
    this.config = config;
    this.options = {
      enableDomInput: options.enableDomInput ?? true,
    };
    this.obstacleManager = new ObstacleManager();
    this.solver = new FluidSolver(config, this.obstacleManager);
    this.particleSystem = new ParticleSystem(15000);
    this.renderer = this.createRenderer(config.renderBackend);
    this.inputController = this.options.enableDomInput ? new InputController(canvas, this) : null;
  }

  private createRenderer(backend: RenderBackend): RendererBackend {
    if (backend === 'webgpu-experimental') {
      return new WebGPUExperimentalRenderer(this.canvas);
    }
    return new WebGLRenderer(this.canvas);
  }

  public initialize(): void {
    console.log('[FluidEngine] Initializing...');
    this.renderer.initialize();
    this.solver.initialize();
    this.solver.resize(this.renderer.getWidth(), this.renderer.getHeight());
    this.inputController?.initialize();
  }

  public update(deltaTime: number): void {
    // Cap deltaTime to avoid instability on lag spikes
    const dt = Math.min(deltaTime, 0.033); 
    this.solver.step(dt);
    this.particleSystem.update(this.solver, dt);
  }

  public render(): void {
    this.renderer.draw(this.solver, this.obstacleManager, this.particleSystem, this.config);
  }

  public reset(): void {
    console.log('[FluidEngine] Resetting...');
    this.solver.reset();
    this.particleSystem.reset();
    this.renderer.clear();
  }

  public resize(width: number, height: number): void {
    this.renderer.resize(width, height);
    this.solver.resize(width, height);
  }

  public applyForce(x: number, y: number, forceX: number, forceY: number): void {
    this.solver.addVelocity(x, y, forceX * this.config.impulseForce * 1000, forceY * this.config.impulseForce * 1000, this.config.splatRadius);
    this.particleSystem.emit(x, y, 50);
  }

  public injectDensity(x: number, y: number, amount: number): void {
    this.solver.addDensity(x, y, amount * this.config.density, this.config.splatRadius);
  }

  public processInput(command: EngineInputCommand): void {
    const x = Math.max(0, Math.min(1, command.normX));
    const y = Math.max(0, Math.min(1, command.normY));
    const dx = command.normDx ?? 0;
    const dy = command.normDy ?? 0;

    const forceDirection = command.reverseForce ? -1 : 1;
    const impulseScale = command.impulseMultiplier ?? 1;
    const emitParticles = command.emitParticles ?? true;
    const particleAmount = command.particleAmount ?? 50;
    const injectDensity = command.injectDensity ?? true;
    const densityAmount = command.densityAmount ?? 1;

    if (dx !== 0 || dy !== 0) {
      this.solver.addVelocity(
        x,
        y,
        dx * forceDirection * this.config.impulseForce * 1000 * impulseScale,
        dy * forceDirection * this.config.impulseForce * 1000 * impulseScale,
        this.config.splatRadius,
      );
    }

    if (emitParticles && particleAmount > 0) {
      this.particleSystem.emit(x, y, particleAmount);
    }

    if (injectDensity) {
      this.solver.addDensity(x, y, densityAmount * this.config.density, this.config.splatRadius);
    }
  }

  public updateConfig(newConfig: SimulationConfig): void {
    const oldGridSize = this.config.gridSize;
    const oldBackend = this.config.renderBackend;
    this.config = newConfig;
    this.solver.updateConfig(newConfig);
    
    if (oldGridSize !== newConfig.gridSize) {
      this.solver.resize(this.renderer.getWidth(), this.renderer.getHeight());
    }

    if (oldBackend !== newConfig.renderBackend) {
      const width = this.renderer.getWidth();
      const height = this.renderer.getHeight();
      const previousRenderer = this.renderer;
      try {
        previousRenderer.dispose();
        this.renderer = this.createRenderer(newConfig.renderBackend);
        this.renderer.initialize();
        this.renderer.resize(width, height);
        this.solver.resize(width, height);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Falha desconhecida ao trocar backend.';
        console.warn(`[FluidEngine] Falha ao trocar backend para "${newConfig.renderBackend}": ${message}`);
        this.renderer = this.createRenderer(oldBackend);
        this.renderer.initialize();
        this.renderer.resize(width, height);
        this.solver.resize(width, height);
        this.config = { ...this.config, renderBackend: oldBackend };
      }
    }
  }

  public updateObstacles(obstacles: Obstacle[]): void {
    this.obstacleManager.setObstacles(obstacles);
  }

  public getObstacleManager(): ObstacleManager {
    return this.obstacleManager;
  }

  public moveObstacleByIndex(index: number, normX: number, normY: number): Obstacle[] {
    const obstacles = [...this.obstacleManager.getObstacles()];
    if (index < 0 || index >= obstacles.length) {
      return obstacles;
    }

    obstacles[index] = {
      ...obstacles[index],
      x: Math.max(0, Math.min(1, normX)),
      y: Math.max(0, Math.min(1, normY)),
    };

    this.obstacleManager.setObstacles(obstacles);
    if (this.onObstacleChange) {
      this.onObstacleChange(obstacles);
    }
    return obstacles;
  }

  public getRuntimeMetrics(): RuntimeMetrics {
    const bytes =
      this.solver.getEstimatedMemoryBytes() +
      this.renderer.getEstimatedMemoryBytes() +
      this.obstacleManager.getObstacleGridByteSize();

    return {
      activeParticles: this.particleSystem.getActiveCount(),
      estimatedMemoryMB: bytes / (1024 * 1024),
    };
  }

  public getRenderBackendStatus(): RenderBackendStatus {
    const status = this.renderer.getBackendStatus();
    if (this.config.renderBackend !== 'webgpu-experimental') {
      return {
        requested: this.config.renderBackend,
        active: this.config.renderBackend,
        isFallback: false,
        supportsWebGPU: status.supportsWebGPU,
      };
    }
    return status;
  }

  public dispose(): void {
    this.inputController?.dispose();
    this.renderer.dispose();
    this.solver.dispose();
    this.particleSystem.dispose();
    this.obstacleManager.dispose();
  }
}
