import type { EngineInputCommand, Obstacle, SimulationConfig } from '../../types/simulation';
import { createVanillaRippleAdapter, type VanillaRippleAdapter, type VanillaRippleAdapterOptions } from '../vanilla/createVanillaRippleAdapter';

export interface ReactRippleAdapter {
  attachCanvas(canvas: HTMLCanvasElement): void;
  detachCanvas(): void;
  start(): void;
  stop(): void;
  resize(): void;
  updateConfig(nextConfig: SimulationConfig): void;
  updateObstacles(obstacles: Obstacle[]): void;
  processInput(command: EngineInputCommand): void;
  reset(): void;
  destroy(): void;
}

export interface ReactRippleAdapterOptions extends Omit<VanillaRippleAdapterOptions, 'autoStart' | 'autoResize'> {}

export function createReactRippleAdapter(
  initialConfig: SimulationConfig,
  options: ReactRippleAdapterOptions = {},
): ReactRippleAdapter {
  let adapter: VanillaRippleAdapter | null = null;
  let canvasRef: HTMLCanvasElement | null = null;
  let configRef: SimulationConfig = initialConfig;

  const ensureAdapter = () => {
    if (!canvasRef) {
      throw new Error('Canvas não conectado. Chame attachCanvas(canvas) antes de usar o adaptador React.');
    }
    if (!adapter) {
      adapter = createVanillaRippleAdapter(canvasRef, configRef, {
        ...options,
        autoStart: false,
        autoResize: false,
      });
    }
    return adapter;
  };

  return {
    attachCanvas(canvas: HTMLCanvasElement) {
      if (canvasRef === canvas && adapter) return;
      if (adapter) {
        adapter.destroy();
        adapter = null;
      }
      canvasRef = canvas;
    },
    detachCanvas() {
      if (adapter) {
        adapter.destroy();
        adapter = null;
      }
      canvasRef = null;
    },
    start() {
      ensureAdapter().start();
    },
    stop() {
      if (!adapter) return;
      adapter.stop();
    },
    resize() {
      ensureAdapter().resize();
    },
    updateConfig(nextConfig: SimulationConfig) {
      configRef = nextConfig;
      ensureAdapter().updateConfig(nextConfig);
    },
    updateObstacles(obstacles: Obstacle[]) {
      ensureAdapter().updateObstacles(obstacles);
    },
    processInput(command: EngineInputCommand) {
      ensureAdapter().processInput(command);
    },
    reset() {
      ensureAdapter().reset();
    },
    destroy() {
      if (adapter) {
        adapter.destroy();
        adapter = null;
      }
      canvasRef = null;
    },
  };
}

