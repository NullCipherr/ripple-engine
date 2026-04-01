export type {
  BenchmarkComparison,
  BenchmarkResult,
  CustomPreset,
  EngineInputCommand,
  FluidType,
  FluidEngineOptions,
  RealWorldFluidInput,
  OfficialPreset,
  Obstacle,
  PresetKey,
  ProfilingScenarioKey,
  RenderBackend,
  RenderBackendStatus,
  SimulationConfig,
  SimulationState,
  ViewMode,
} from './types/simulation';

export { FluidEngine } from './engine/core/FluidEngine';
export type { RuntimeMetrics } from './engine/core/FluidEngine';

export { FluidSolver } from './engine/simulation/FluidSolver';
export { ObstacleManager } from './engine/simulation/ObstacleManager';
export { ParticleSystem } from './engine/simulation/ParticleSystem';
export type { Particle } from './engine/simulation/ParticleSystem';
export { DEFAULT_REAL_WORLD_FLUID_INPUTS, cloneDefaultRealWorldFluidInputs } from './engine/simulation/fluidRealism';

export { WebGLRenderer } from './engine/rendering/WebGLRenderer';
export { WebGPUExperimentalRenderer } from './engine/rendering/webgpu/WebGPUExperimentalRenderer';

export {
  OFFICIAL_PRESETS,
  applyOfficialPreset,
  getOfficialPreset,
  resolveOfficialPresetKey,
} from './engine/presets/officialPresets';

export {
  compareBenchmarkWithBaseline,
  getProfilingScenarioKeys,
  runStandardBenchmark,
} from './engine/profiling/standardProfiling';

export {
  createVanillaRippleAdapter,
  type VanillaRippleAdapter,
  type VanillaRippleAdapterOptions,
} from './adapters/vanilla/createVanillaRippleAdapter';

export {
  createReactRippleAdapter,
  type ReactRippleAdapter,
  type ReactRippleAdapterOptions,
} from './adapters/react/createReactRippleAdapter';
