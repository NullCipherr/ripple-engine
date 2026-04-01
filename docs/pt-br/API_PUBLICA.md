# API Pública

## Classes exportadas

- `FluidEngine`: fachada principal para simulação e renderização.
- `FluidSolver`: solver de fluido em grade 2D.
- `ObstacleManager`: grade de obstáculos e hit-test.
- `ParticleSystem`: emissão e atualização de partículas.
- `WebGLRenderer`: renderização WebGL2 com shaders.
- `WebGPUExperimentalRenderer`: backend alternativo experimental com fallback seguro.

## Tipos exportados

- `SimulationConfig`
- `RenderBackend`
- `RenderBackendStatus`
- `FluidEngineOptions`
- `EngineInputCommand`
- `Obstacle`
- `ViewMode`
- `RuntimeMetrics`
- `Particle`
- `OfficialPreset`
- `ProfilingScenarioKey`
- `BenchmarkResult`
- `BenchmarkComparison`

## Utilitários exportados

- Presets oficiais:
- `OFFICIAL_PRESETS`;
- `getOfficialPreset`;
- `applyOfficialPreset`;
- `resolveOfficialPresetKey`.
- Profiling:
- `getProfilingScenarioKeys`;
- `runStandardBenchmark`;
- `compareBenchmarkWithBaseline`.
- Adaptadores oficiais:
- `createVanillaRippleAdapter`;
- `createReactRippleAdapter`.

## Contrato mínimo de uso

```ts
import { FluidEngine, type SimulationConfig } from '@nullcipherr/ripple-engine';

const config: SimulationConfig = {
  density: 2,
  viscosity: 0,
  impulseForce: 10,
  gridSize: 128,
  resolution: 1,
  viewMode: 'density',
  dissipation: 0.98,
  velocityDissipation: 0.99,
  splatRadius: 0.02,
  showGrid: false,
  showTrails: true,
  glowIntensity: 0.5,
  colorPalette: 'default',
  fluidType: 'liquid',
  vorticity: 2,
  renderBackend: 'classic',
};

const engine = new FluidEngine(canvas, config);
engine.initialize();
```

## Input desacoplado do DOM (opcional)

```ts
import { FluidEngine, type EngineInputCommand } from '@nullcipherr/ripple-engine';

const engine = new FluidEngine(canvas, config, { enableDomInput: false });
engine.initialize();

const input: EngineInputCommand = {
  normX: 0.52,
  normY: 0.44,
  normDx: 0.01,
  normDy: -0.008,
  injectDensity: true,
};

engine.processInput(input);
```

## Presets oficiais com fallback

```ts
import { applyOfficialPreset, resolveOfficialPresetKey } from '@nullcipherr/ripple-engine';

const key = resolveOfficialPresetKey(userPresetKeyFromStorage, 'calm');
const nextConfig = applyOfficialPreset(config, key);
engine.updateConfig(nextConfig);
```

## Profiling com baseline e comparação

```ts
import {
  compareBenchmarkWithBaseline,
  runStandardBenchmark,
} from '@nullcipherr/ripple-engine';

const baseline = runStandardBenchmark('baseline-smoke', 1337);
const candidate = runStandardBenchmark('baseline-smoke', 1337);
const comparison = compareBenchmarkWithBaseline(baseline, candidate, 'baseline-smoke');
```

## Backend alternativo (WebGPU experimental)

```ts
const engine = new FluidEngine(canvas, {
  ...config,
  renderBackend: 'webgpu-experimental',
});

const backend = engine.getRenderBackendStatus();
// backend.requested / backend.active / backend.isFallback / backend.reason
```

## Instalação para consumo externo

```bash
npm install github:NullCipherr/ripple-engine#v1.0.0
```

- O pacote é distribuído inicialmente via GitHub Releases (sem publicação no npm).
- O import permanece `@nullcipherr/ripple-engine`, conforme nome do `package.json`.
