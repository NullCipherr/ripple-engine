import { createVanillaRippleAdapter, type SimulationConfig } from '../../src/index';

const canvas = document.querySelector<HTMLCanvasElement>('#canvas');
if (!canvas) {
  throw new Error('Canvas não encontrado no exemplo vanilla.');
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
  glowIntensity: 0.5,
  colorPalette: 'default',
  fluidType: 'liquid',
  vorticity: 2,
  renderBackend: 'classic',
};

const adapter = createVanillaRippleAdapter(canvas, config, {
  autoStart: true,
  autoResize: true,
});

window.addEventListener('beforeunload', () => {
  adapter.destroy();
});
