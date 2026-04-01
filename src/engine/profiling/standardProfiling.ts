import type { BenchmarkComparison, BenchmarkResult, ProfilingScenarioKey, SimulationConfig } from '../../types/simulation';
import { FluidSolver } from '../simulation/FluidSolver';
import { ObstacleManager } from '../simulation/ObstacleManager';

interface ProfilingScenario {
  key: ProfilingScenarioKey;
  name: string;
  steps: number;
  dt: number;
  config: SimulationConfig;
}

const DEFAULT_CONFIG: SimulationConfig = {
  density: 2,
  viscosity: 0.001,
  impulseForce: 10,
  gridSize: 128,
  resolution: 1,
  viewMode: 'density',
  dissipation: 0.985,
  velocityDissipation: 0.992,
  splatRadius: 0.02,
  showGrid: false,
  showTrails: true,
  glowIntensity: 0.5,
  colorPalette: 'default',
  fluidType: 'liquid',
  vorticity: 2,
  renderBackend: 'classic',
};

const SCENARIOS: Record<ProfilingScenarioKey, ProfilingScenario> = {
  'baseline-smoke': {
    key: 'baseline-smoke',
    name: 'Baseline Smoke',
    steps: 360,
    dt: 1 / 60,
    config: {
      ...DEFAULT_CONFIG,
      colorPalette: 'fire',
      fluidType: 'smoke',
      dissipation: 0.988,
      vorticity: 2,
      impulseForce: 9,
    },
  },
  'stress-vortex': {
    key: 'stress-vortex',
    name: 'Stress Vortex',
    steps: 480,
    dt: 1 / 90,
    config: {
      ...DEFAULT_CONFIG,
      vorticity: 3.4,
      impulseForce: 13,
      velocityDissipation: 0.988,
      splatRadius: 0.024,
      colorPalette: 'plasma',
      fluidType: 'plasma',
    },
  },
};

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

export function getProfilingScenarioKeys(): ProfilingScenarioKey[] {
  return Object.keys(SCENARIOS) as ProfilingScenarioKey[];
}

export function runStandardBenchmark(
  scenarioKey: ProfilingScenarioKey = 'baseline-smoke',
  seed: number = 1337,
): BenchmarkResult {
  const scenario = SCENARIOS[scenarioKey];
  const random = seeded(seed);
  const obstacleManager = new ObstacleManager();
  const solver = new FluidSolver(scenario.config, obstacleManager);
  solver.resize(1280, 720);

  const start = performance.now();

  for (let step = 0; step < scenario.steps; step++) {
    const t = step / scenario.steps;
    const x = 0.2 + 0.6 * t;
    const y = 0.5 + (random() - 0.5) * 0.3;
    const fx = (random() - 0.5) * 10;
    const fy = (random() - 0.5) * 10;
    const radius = 0.015 + random() * 0.015;
    solver.addDensity(x, y, 4 + random() * 6, radius);
    solver.addVelocity(x, y, fx, fy, radius);
    solver.step(scenario.dt);
  }

  const elapsedMs = performance.now() - start;
  const avgFrameTimeMs = elapsedMs / scenario.steps;
  const fpsEstimate = 1000 / Math.max(avgFrameTimeMs, 0.000001);

  const sampleStride = Math.max(1, Math.floor(solver.size / 64));
  let checksumValue = 0;
  for (let i = 0; i < solver.size; i += sampleStride) {
    checksumValue += solver.density[i] * 13.37 + solver.velocityX[i] * 7.11 + solver.velocityY[i] * 5.73;
  }

  solver.dispose();
  obstacleManager.dispose();

  return {
    seed,
    steps: scenario.steps,
    dt: scenario.dt,
    elapsedMs,
    avgFrameTimeMs,
    fpsEstimate,
    checksum: checksumValue.toFixed(6),
    createdAt: new Date().toISOString(),
  };
}

export function compareBenchmarkWithBaseline(
  baseline: BenchmarkResult,
  candidate: BenchmarkResult,
  scenario: ProfilingScenarioKey,
): BenchmarkComparison {
  const frameTimeDeltaMs = candidate.avgFrameTimeMs - baseline.avgFrameTimeMs;
  const frameTimeDeltaPct = baseline.avgFrameTimeMs === 0 ? 0 : (frameTimeDeltaMs / baseline.avgFrameTimeMs) * 100;
  const fpsDeltaPct = baseline.fpsEstimate === 0 ? 0 : ((candidate.fpsEstimate - baseline.fpsEstimate) / baseline.fpsEstimate) * 100;

  return {
    scenario,
    baselineFrameTimeMs: baseline.avgFrameTimeMs,
    candidateFrameTimeMs: candidate.avgFrameTimeMs,
    frameTimeDeltaMs,
    frameTimeDeltaPct,
    baselineFpsEstimate: baseline.fpsEstimate,
    candidateFpsEstimate: candidate.fpsEstimate,
    fpsDeltaPct,
    improved: frameTimeDeltaMs < 0,
  };
}
