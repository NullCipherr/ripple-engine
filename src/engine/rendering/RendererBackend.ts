import type { RenderBackendStatus, SimulationConfig } from '../../types/simulation';
import type { FluidSolver } from '../simulation/FluidSolver';
import type { ObstacleManager } from '../simulation/ObstacleManager';
import type { ParticleSystem } from '../simulation/ParticleSystem';

export interface RendererBackend {
  getWidth(): number;
  getHeight(): number;
  initialize(): void;
  resize(width: number, height: number): void;
  clear(): void;
  getEstimatedMemoryBytes(): number;
  draw(
    solver: FluidSolver,
    obstacleManager: ObstacleManager,
    particleSystem: ParticleSystem,
    config: SimulationConfig,
  ): void;
  dispose(): void;
  getBackendStatus(): RenderBackendStatus;
}

