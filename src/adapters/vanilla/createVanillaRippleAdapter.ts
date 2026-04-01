import type { EngineInputCommand, FluidEngineOptions, Obstacle, SimulationConfig } from '../../types/simulation';
import { FluidEngine } from '../../engine/core/FluidEngine';

export interface VanillaRippleAdapterOptions extends FluidEngineOptions {
  autoStart?: boolean;
  autoResize?: boolean;
  onMetrics?: (metrics: ReturnType<FluidEngine['getRuntimeMetrics']>) => void;
  metricsIntervalMs?: number;
}

export interface VanillaRippleAdapter {
  start(): void;
  stop(): void;
  resize(): void;
  updateConfig(nextConfig: SimulationConfig): void;
  updateObstacles(obstacles: Obstacle[]): void;
  processInput(command: EngineInputCommand): void;
  reset(): void;
  getEngine(): FluidEngine;
  destroy(): void;
}

export function createVanillaRippleAdapter(
  canvas: HTMLCanvasElement,
  config: SimulationConfig,
  options: VanillaRippleAdapterOptions = {},
): VanillaRippleAdapter {
  const autoStart = options.autoStart ?? true;
  const autoResize = options.autoResize ?? true;
  const metricsIntervalMs = options.metricsIntervalMs ?? 250;
  const engine = new FluidEngine(canvas, config, { enableDomInput: options.enableDomInput });
  let running = false;
  let rafId = 0;
  let lastFrame = performance.now();
  let metricsAccumMs = 0;
  const hasWindow = typeof window !== 'undefined';
  const hasRaf = typeof requestAnimationFrame === 'function';

  const scheduleFrame = (cb: FrameRequestCallback): number => {
    if (hasRaf) return requestAnimationFrame(cb);
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  };

  const cancelFrame = (id: number) => {
    if (hasRaf) {
      cancelAnimationFrame(id);
      return;
    }
    clearTimeout(id);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    engine.resize(Math.max(1, Math.floor(rect.width)), Math.max(1, Math.floor(rect.height)));
  };

  const tick = (now: number) => {
    if (!running) return;
    const dt = (now - lastFrame) / 1000;
    lastFrame = now;
    engine.update(dt);
    engine.render();

    if (options.onMetrics) {
      metricsAccumMs += dt * 1000;
      if (metricsAccumMs >= metricsIntervalMs) {
        metricsAccumMs = 0;
        options.onMetrics(engine.getRuntimeMetrics());
      }
    }

    rafId = scheduleFrame(tick);
  };

  engine.initialize();
  if (autoResize && hasWindow) {
    resize();
    window.addEventListener('resize', resize);
  }
  if (autoStart) {
    running = true;
    rafId = scheduleFrame(tick);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastFrame = performance.now();
      rafId = scheduleFrame(tick);
    },
    stop() {
      if (!running) return;
      running = false;
      cancelFrame(rafId);
    },
    resize,
    updateConfig(nextConfig: SimulationConfig) {
      engine.updateConfig(nextConfig);
    },
    updateObstacles(obstacles: Obstacle[]) {
      engine.updateObstacles(obstacles);
    },
    processInput(command: EngineInputCommand) {
      engine.processInput(command);
    },
    reset() {
      engine.reset();
    },
    getEngine() {
      return engine;
    },
    destroy() {
      running = false;
      cancelFrame(rafId);
      if (autoResize && hasWindow) {
        window.removeEventListener('resize', resize);
      }
      engine.dispose();
    },
  };
}
