import {
  FluidEngine,
  cloneDefaultRealWorldFluidInputs,
  type Obstacle,
  type RealWorldFluidInput,
  type SimulationConfig,
} from '../src/index';

const canvas = document.querySelector<HTMLCanvasElement>('#fluid-canvas');
if (!canvas) {
  throw new Error('Canvas da demo não encontrado.');
}

const controls = {
  viewMode: document.querySelector<HTMLSelectElement>('#view-mode'),
  palette: document.querySelector<HTMLSelectElement>('#palette'),
  fluidType: document.querySelector<HTMLSelectElement>('#fluid-type'),
  rwAutoColorTemperature: document.querySelector<HTMLInputElement>('#rw-auto-color-temperature'),
  rwDensity: document.querySelector<HTMLInputElement>('#rw-density'),
  rwViscosity: document.querySelector<HTMLInputElement>('#rw-viscosity'),
  rwTemperature: document.querySelector<HTMLInputElement>('#rw-temperature'),
  rwAmbientTemperature: document.querySelector<HTMLInputElement>('#rw-ambient-temperature'),
  rwTurbulence: document.querySelector<HTMLInputElement>('#rw-turbulence'),
  rwMomentumDamping: document.querySelector<HTMLInputElement>('#rw-momentum-damping'),
  rwDensityHalfLife: document.querySelector<HTMLInputElement>('#rw-density-half-life'),
  rwDiffusion: document.querySelector<HTMLInputElement>('#rw-diffusion'),
  renderBackend: document.querySelector<HTMLSelectElement>('#render-backend'),
  impulseForce: document.querySelector<HTMLInputElement>('#impulse-force'),
  impulseForceValue: document.querySelector<HTMLElement>('#impulse-force-value'),
  viscosity: document.querySelector<HTMLInputElement>('#viscosity'),
  viscosityValue: document.querySelector<HTMLElement>('#viscosity-value'),
  vorticity: document.querySelector<HTMLInputElement>('#vorticity'),
  vorticityValue: document.querySelector<HTMLElement>('#vorticity-value'),
  showGrid: document.querySelector<HTMLInputElement>('#show-grid'),
  showTrails: document.querySelector<HTMLInputElement>('#show-trails'),
  addCircle: document.querySelector<HTMLButtonElement>('#add-circle'),
  addRect: document.querySelector<HTMLButtonElement>('#add-rect'),
  clearObstacles: document.querySelector<HTMLButtonElement>('#clear-obstacles'),
  resetEngine: document.querySelector<HTMLButtonElement>('#reset-engine'),
  autoScenarioToggle: document.querySelector<HTMLButtonElement>('#auto-scenarios-toggle'),
  autoScenarioStatus: document.querySelector<HTMLElement>('#auto-scenarios-status'),
  fps: document.querySelector<HTMLElement>('#metric-fps'),
  frame: document.querySelector<HTMLElement>('#metric-frame'),
  particles: document.querySelector<HTMLElement>('#metric-particles'),
  memory: document.querySelector<HTMLElement>('#metric-memory'),
  backend: document.querySelector<HTMLElement>('#metric-backend'),
};

for (const [name, element] of Object.entries(controls)) {
  if (!element) {
    throw new Error(`Elemento obrigatório ausente na demo: ${name}`);
  }
}

const config: SimulationConfig = {
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
  glowIntensity: 0.55,
  colorPalette: 'default',
  fluidType: 'liquid',
  vorticity: 2,
  renderBackend: 'classic',
  fluidRealWorldProfiles: cloneDefaultRealWorldFluidInputs(),
  autoColorFromTemperature: true,
};

const fluidLoopOrder: SimulationConfig['fluidType'][] = ['liquid', 'gas', 'smoke', 'plasma'];
const autoScenarioDurationMs = 6000;

const engine = new FluidEngine(canvas, config);
let obstacles: Obstacle[] = [
  { id: 'init-circle', type: 'circle', x: 0.34, y: 0.52, radius: 0.06 },
  { id: 'init-rect', type: 'rect', x: 0.65, y: 0.45, width: 0.14, height: 0.09 },
];

engine.initialize();
engine.updateObstacles(obstacles);

const resize = () => {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(280, Math.floor(rect.height));
  engine.resize(width, height);
};

const resizeObserver = new ResizeObserver(() => resize());
resizeObserver.observe(canvas);
window.addEventListener('resize', resize);
resize();

engine.onObstacleChange = (updated) => {
  obstacles = updated;
};

function updateConfig(partial: Partial<SimulationConfig>) {
  const next: SimulationConfig = { ...config, ...partial };
  Object.assign(config, partial);
  engine.updateConfig(next);
}

function updateSliderValues() {
  controls.impulseForceValue.textContent = Number(config.impulseForce).toFixed(0);
  controls.viscosityValue.textContent = Number(config.viscosity).toFixed(4);
  controls.vorticityValue.textContent = Number(config.vorticity).toFixed(1);
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getActiveRealWorldProfile(): RealWorldFluidInput {
  const activeType = config.fluidType;
  const profiles = config.fluidRealWorldProfiles ?? {};
  const profile = profiles[activeType];
  if (!profile) {
    throw new Error(`Perfil real ausente para ${activeType}`);
  }
  return profile as RealWorldFluidInput;
}

function updateRealWorldInputValues(): void {
  const profile = getActiveRealWorldProfile();
  controls.rwDensity.value = profile.densityKgM3.toString();
  controls.rwViscosity.value = profile.dynamicViscosityPaS.toString();
  controls.rwTemperature.value = profile.temperatureC.toString();
  controls.rwAmbientTemperature.value = profile.ambientTemperatureC.toString();
  controls.rwTurbulence.value = profile.turbulence.toString();
  controls.rwMomentumDamping.value = profile.momentumDampingPerSecond.toString();
  controls.rwDensityHalfLife.value = profile.densityHalfLifeSeconds.toString();
  controls.rwDiffusion.value = profile.diffusionM2S.toString();
}

function updateActiveRealWorldProfile(partial: Partial<RealWorldFluidInput>): void {
  const activeType = config.fluidType;
  const currentProfiles = config.fluidRealWorldProfiles ?? cloneDefaultRealWorldFluidInputs();
  const currentProfile = (currentProfiles[activeType] ?? {}) as RealWorldFluidInput;

  updateConfig({
    fluidRealWorldProfiles: {
      ...currentProfiles,
      [activeType]: {
        ...currentProfile,
        ...partial,
      },
    },
  });
}

function updateAutoScenarioStatus(): void {
  const currentIndex = fluidLoopOrder.indexOf(config.fluidType);
  const label = `${currentIndex + 1}/${fluidLoopOrder.length} - ${config.fluidType}`;
  controls.autoScenarioStatus.textContent = autoScenarioEnabled ? `Ativo (${label})` : `Pausado (${label})`;
  controls.autoScenarioToggle.textContent = autoScenarioEnabled ? 'Pausar auto cenários' : 'Retomar auto cenários';
}

function applyFluidTypeScenario(fluidType: SimulationConfig['fluidType']): void {
  updateConfig({ fluidType });
  controls.fluidType.value = fluidType;
  updateRealWorldInputValues();
  engine.reset();
  engine.updateObstacles(obstacles);
  updateAutoScenarioStatus();
}

controls.viewMode.addEventListener('change', () => {
  updateConfig({ viewMode: controls.viewMode.value as SimulationConfig['viewMode'] });
});

controls.palette.addEventListener('change', () => {
  updateConfig({ colorPalette: controls.palette.value as SimulationConfig['colorPalette'] });
});

controls.fluidType.addEventListener('change', () => {
  const selected = controls.fluidType.value as SimulationConfig['fluidType'];
  updateConfig({ fluidType: selected });
  updateRealWorldInputValues();
  autoScenarioIndex = Math.max(0, fluidLoopOrder.indexOf(selected));
  autoScenarioElapsedMs = 0;
  updateAutoScenarioStatus();
});

controls.rwDensity.addEventListener('input', () => {
  updateActiveRealWorldProfile({ densityKgM3: Math.max(0.01, Number(controls.rwDensity.value)) });
});

controls.rwViscosity.addEventListener('input', () => {
  updateActiveRealWorldProfile({ dynamicViscosityPaS: Math.max(0.0000001, Number(controls.rwViscosity.value)) });
});

controls.rwTemperature.addEventListener('input', () => {
  updateActiveRealWorldProfile({ temperatureC: Number(controls.rwTemperature.value) });
});

controls.rwAmbientTemperature.addEventListener('input', () => {
  updateActiveRealWorldProfile({ ambientTemperatureC: Number(controls.rwAmbientTemperature.value) });
});

controls.rwTurbulence.addEventListener('input', () => {
  const value = Number(controls.rwTurbulence.value);
  updateActiveRealWorldProfile({ turbulence: Math.max(0, Math.min(1, value)) });
});

controls.rwMomentumDamping.addEventListener('input', () => {
  updateActiveRealWorldProfile({ momentumDampingPerSecond: Math.max(0.01, Number(controls.rwMomentumDamping.value)) });
});

controls.rwDensityHalfLife.addEventListener('input', () => {
  updateActiveRealWorldProfile({ densityHalfLifeSeconds: Math.max(0.1, Number(controls.rwDensityHalfLife.value)) });
});

controls.rwDiffusion.addEventListener('input', () => {
  updateActiveRealWorldProfile({ diffusionM2S: Math.max(0.0000000001, Number(controls.rwDiffusion.value)) });
});

controls.rwAutoColorTemperature.addEventListener('change', () => {
  updateConfig({ autoColorFromTemperature: controls.rwAutoColorTemperature.checked });
});

controls.renderBackend.addEventListener('change', () => {
  const selected = controls.renderBackend.value as SimulationConfig['renderBackend'];
  updateConfig({ renderBackend: selected });
  const status = engine.getRenderBackendStatus();
  if (selected === 'webgpu-experimental' && !status.supportsWebGPU) {
    updateConfig({ renderBackend: 'classic' });
    controls.renderBackend.value = 'classic';
    console.warn(`[Demo] WebGPU indisponível. Retornando para backend classic. Motivo: ${status.reason ?? 'não informado'}`);
  }
});

controls.impulseForce.addEventListener('input', () => {
  const value = Number(controls.impulseForce.value);
  updateConfig({ impulseForce: value });
  updateSliderValues();
});

controls.viscosity.addEventListener('input', () => {
  const value = Number(controls.viscosity.value);
  updateConfig({ viscosity: value });
  updateSliderValues();
});

controls.vorticity.addEventListener('input', () => {
  const value = Number(controls.vorticity.value);
  updateConfig({ vorticity: value });
  updateSliderValues();
});

controls.showGrid.addEventListener('change', () => {
  updateConfig({ showGrid: controls.showGrid.checked });
});

controls.showTrails.addEventListener('change', () => {
  updateConfig({ showTrails: controls.showTrails.checked });
});

controls.addCircle.addEventListener('click', () => {
  obstacles = [
    ...obstacles,
    {
      id: `circle-${crypto.randomUUID()}`,
      type: 'circle',
      x: randomBetween(0.2, 0.8),
      y: randomBetween(0.2, 0.8),
      radius: randomBetween(0.04, 0.08),
    },
  ];
  engine.updateObstacles(obstacles);
});

controls.addRect.addEventListener('click', () => {
  obstacles = [
    ...obstacles,
    {
      id: `rect-${crypto.randomUUID()}`,
      type: 'rect',
      x: randomBetween(0.2, 0.8),
      y: randomBetween(0.2, 0.8),
      width: randomBetween(0.09, 0.16),
      height: randomBetween(0.06, 0.12),
    },
  ];
  engine.updateObstacles(obstacles);
});

controls.clearObstacles.addEventListener('click', () => {
  obstacles = [];
  engine.updateObstacles(obstacles);
});

controls.resetEngine.addEventListener('click', () => {
  engine.reset();
  engine.updateObstacles(obstacles);
});

updateSliderValues();
updateRealWorldInputValues();
controls.rwAutoColorTemperature.checked = config.autoColorFromTemperature ?? false;

let frameCount = 0;
let fps = 0;
let fpsAccumMs = 0;
let lastFrame = performance.now();
let autoScenarioEnabled = true;
let autoScenarioIndex = Math.max(0, fluidLoopOrder.indexOf(config.fluidType));
let autoScenarioElapsedMs = 0;
let autoEmissionPhase = 0;

controls.autoScenarioToggle.addEventListener('click', () => {
  autoScenarioEnabled = !autoScenarioEnabled;
  updateAutoScenarioStatus();
});

function emitAutoScenarioPulse(dt: number): void {
  autoEmissionPhase += dt;
  const orbitX = Math.cos(autoEmissionPhase * 1.05) * 0.27;
  const orbitY = Math.sin(autoEmissionPhase * 1.47) * 0.23;
  const x = 0.5 + orbitX;
  const y = 0.5 + orbitY;
  const dirX = -Math.sin(autoEmissionPhase * 1.05) * 0.04;
  const dirY = Math.cos(autoEmissionPhase * 1.47) * 0.04;

  engine.processInput({
    normX: x,
    normY: y,
    normDx: dirX,
    normDy: dirY,
    injectDensity: true,
    densityAmount: 1.1,
    emitParticles: true,
    particleAmount: 60,
    impulseMultiplier: 1.2,
  });
}

updateAutoScenarioStatus();

function tick(now: number) {
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;

  if (autoScenarioEnabled) {
    autoScenarioElapsedMs += dt * 1000;
    emitAutoScenarioPulse(dt);

    if (autoScenarioElapsedMs >= autoScenarioDurationMs) {
      autoScenarioElapsedMs = 0;
      autoScenarioIndex = (autoScenarioIndex + 1) % fluidLoopOrder.length;
      applyFluidTypeScenario(fluidLoopOrder[autoScenarioIndex]);
    }
  }

  engine.update(dt);
  engine.render();

  frameCount += 1;
  fpsAccumMs += dt * 1000;

  if (fpsAccumMs >= 250) {
    fps = (frameCount * 1000) / fpsAccumMs;
    frameCount = 0;
    fpsAccumMs = 0;

    const metrics = engine.getRuntimeMetrics();
    const backend = engine.getRenderBackendStatus();
    controls.fps.textContent = Math.round(fps).toString();
    controls.frame.textContent = (1000 / Math.max(fps, 1)).toFixed(2);
    controls.particles.textContent = metrics.activeParticles.toString();
    controls.memory.textContent = metrics.estimatedMemoryMB.toFixed(2);
    controls.backend.textContent = `${backend.requested} -> ${backend.active}${backend.isFallback ? ' (fallback)' : ''}`;
  }

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);

window.addEventListener('beforeunload', () => {
  resizeObserver.disconnect();
  engine.dispose();
});
