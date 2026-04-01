export type ViewMode = 'density' | 'velocity' | 'pressure' | 'particles' | 'diffuse';
export type FluidType = 'liquid' | 'gas' | 'smoke' | 'plasma';

export type PresetKey = 'calm' | 'viscous' | 'chaotic' | 'smoke';
export type ProfilingScenarioKey = 'baseline-smoke' | 'stress-vortex';
export type RenderBackend = 'classic' | 'experimental-gpu' | 'webgpu-experimental';

export interface Obstacle {
  id: string;
  type: 'circle' | 'rect';
  x: number; // normalized 0-1
  y: number; // normalized 0-1
  radius?: number; // for circle, normalized
  width?: number; // for rect, normalized
  height?: number; // for rect, normalized
}

export interface SimulationConfig {
  density: number;
  viscosity: number;
  impulseForce: number;
  gridSize: number;
  resolution: number;
  viewMode: ViewMode;
  dissipation: number;
  velocityDissipation: number;
  splatRadius: number;
  showGrid: boolean;
  showTrails: boolean;
  glowIntensity: number;
  colorPalette: 'default' | 'fire' | 'ocean' | 'plasma';
  fluidType: FluidType;
  vorticity: number;
  renderBackend: RenderBackend;
  fluidRealWorldProfiles?: Partial<Record<FluidType, Partial<RealWorldFluidInput>>>;
  autoColorFromTemperature?: boolean;
}

export interface RealWorldFluidInput {
  densityKgM3: number;
  dynamicViscosityPaS: number;
  temperatureC: number;
  ambientTemperatureC: number;
  turbulence: number; // 0..1
  momentumDampingPerSecond: number;
  densityHalfLifeSeconds: number;
  diffusionM2S: number;
}

export interface EngineInputCommand {
  normX: number;
  normY: number;
  normDx?: number;
  normDy?: number;
  injectDensity?: boolean;
  densityAmount?: number;
  reverseForce?: boolean;
  impulseMultiplier?: number;
  emitParticles?: boolean;
  particleAmount?: number;
}

export interface FluidEngineOptions {
  enableDomInput?: boolean;
}

export interface RenderBackendStatus {
  requested: RenderBackend;
  active: RenderBackend;
  isFallback: boolean;
  supportsWebGPU: boolean;
  reason?: string;
}

export interface BenchmarkResult {
  seed: number;
  steps: number;
  dt: number;
  elapsedMs: number;
  avgFrameTimeMs: number;
  fpsEstimate: number;
  checksum: string;
  createdAt: string;
}

export interface BenchmarkComparison {
  scenario: ProfilingScenarioKey;
  baselineFrameTimeMs: number;
  candidateFrameTimeMs: number;
  frameTimeDeltaMs: number;
  frameTimeDeltaPct: number;
  baselineFpsEstimate: number;
  candidateFpsEstimate: number;
  fpsDeltaPct: number;
  improved: boolean;
}

export interface OfficialPreset {
  key: PresetKey;
  name: string;
  description: string;
  config: Pick<
    SimulationConfig,
    | 'density'
    | 'viscosity'
    | 'impulseForce'
    | 'dissipation'
    | 'velocityDissipation'
    | 'vorticity'
    | 'splatRadius'
    | 'colorPalette'
    | 'fluidType'
    | 'showTrails'
    | 'renderBackend'
  >;
}

export interface SimulationState {
  isRunning: boolean;
  fps: number;
  frameTimeMs: number;
  frameTimeHistoryMs: number[];
  isInitialized: boolean;
  obstacles: Obstacle[];
  activeParticles: number;
  estimatedMemoryMB: number;
  computeLoadPct: number;
  benchmarkRunning: boolean;
  lastBenchmarkResult: BenchmarkResult | null;
  resetTrigger: number;
}

export interface CustomPreset {
  id: string;
  name: string;
  config: Pick<
    SimulationConfig,
    | 'density'
    | 'viscosity'
    | 'impulseForce'
    | 'dissipation'
    | 'velocityDissipation'
    | 'vorticity'
    | 'splatRadius'
    | 'colorPalette'
    | 'fluidType'
  >;
}
