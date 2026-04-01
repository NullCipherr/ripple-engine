import { describe, expect, it } from 'vitest';
import type { SimulationConfig } from '../../../types/simulation';
import { cloneDefaultRealWorldFluidInputs } from '../fluidRealism';
import { ObstacleManager } from '../ObstacleManager';
import { FluidSolver } from '../FluidSolver';

function createConfig(overrides: Partial<SimulationConfig> = {}): SimulationConfig {
  return {
    density: 2.0,
    viscosity: 0.0,
    impulseForce: 10.0,
    gridSize: 128,
    resolution: 1.0,
    viewMode: 'density',
    dissipation: 0.98,
    velocityDissipation: 0.99,
    splatRadius: 0.02,
    showGrid: false,
    showTrails: true,
    glowIntensity: 0.5,
    colorPalette: 'default',
    fluidType: 'liquid',
    vorticity: 2.0,
    renderBackend: 'classic',
    ...overrides,
  };
}

function createSolver(configOverrides: Partial<SimulationConfig> = {}) {
  const obstacleManager = new ObstacleManager();
  const solver = new FluidSolver(createConfig(configOverrides), obstacleManager);
  solver.resize(800, 600);
  return { solver, obstacleManager };
}

function sum(values: Float32Array): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    total += values[i];
  }
  return total;
}

function densityCentroidYNormalized(solver: FluidSolver): number {
  let weighted = 0;
  let total = 0;
  for (let y = 0; y < solver.height; y++) {
    for (let x = 0; x < solver.width; x++) {
      const idx = x + y * solver.width;
      const d = Math.max(0, solver.density[idx]);
      weighted += d * y;
      total += d;
    }
  }

  if (total <= 1e-8) return 0;
  return weighted / total / Math.max(1, solver.height - 1);
}

function kineticEnergy(solver: FluidSolver): number {
  let total = 0;
  for (let i = 0; i < solver.size; i++) {
    const vx = solver.velocityX[i];
    const vy = solver.velocityY[i];
    total += vx * vx + vy * vy;
  }
  return total;
}

describe('FluidSolver invariantes', () => {
  it('aloca buffers consistentes ao redimensionar', () => {
    const { solver } = createSolver({ gridSize: 160 });

    expect(solver.width).toBe(160);
    expect(solver.height).toBeGreaterThan(0);
    expect(solver.size).toBe(solver.width * solver.height);
    expect(solver.density.length).toBe(solver.size);
    expect(solver.velocityX.length).toBe(solver.size);
    expect(solver.velocityY.length).toBe(solver.size);
  });

  it('injeta densidade em células válidas sem gerar NaN', () => {
    const { solver } = createSolver();

    solver.addDensity(0.5, 0.5, 10, 0.05);

    expect(sum(solver.density)).toBeGreaterThan(0);
    expect([...solver.density].every(Number.isFinite)).toBe(true);
  });

  it('reset limpa os campos da simulação', () => {
    const { solver } = createSolver();

    solver.addDensity(0.5, 0.5, 20, 0.05);
    solver.addVelocity(0.5, 0.5, 8, -3, 0.05);
    solver.step(1 / 60);
    solver.reset();

    expect(sum(solver.density)).toBe(0);
    expect(sum(solver.velocityX)).toBe(0);
    expect(sum(solver.velocityY)).toBe(0);
  });

  it('não injeta densidade dentro de células marcadas como obstáculo', () => {
    const { solver, obstacleManager } = createSolver();
    obstacleManager.setObstacles([{ id: 'center', type: 'circle', x: 0.5, y: 0.5, radius: 0.15 }]);

    solver.addDensity(0.5, 0.5, 50, 0.02);

    const centerX = Math.floor(solver.width * 0.5);
    const centerY = Math.floor(solver.height * 0.5);
    const centerIdx = centerX + centerY * solver.width;

    expect(obstacleManager.isObstacle(centerX, centerY)).toBe(true);
    expect(solver.density[centerIdx]).toBe(0);
  });

  it('mantém campos numéricos finitos após múltiplos passos', () => {
    const { solver } = createSolver();

    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      solver.addVelocity(0.2 + t * 0.6, 0.4, 5, -3, 0.03);
      solver.addDensity(0.2 + t * 0.6, 0.6, 6, 0.03);
      solver.step(1 / 60);
    }

    expect([...solver.density].every(Number.isFinite)).toBe(true);
    expect([...solver.velocityX].every(Number.isFinite)).toBe(true);
    expect([...solver.velocityY].every(Number.isFinite)).toBe(true);
  });

  it('smoke apresenta ascensão mais evidente que liquid', () => {
    const smoke = createSolver({ fluidType: 'smoke', viscosity: 0.001 });
    const liquid = createSolver({ fluidType: 'liquid', viscosity: 0.001 });

    smoke.solver.addDensity(0.5, 0.78, 26, 0.08);
    liquid.solver.addDensity(0.5, 0.78, 26, 0.08);

    for (let i = 0; i < 90; i++) {
      smoke.solver.step(1 / 60);
      liquid.solver.step(1 / 60);
    }

    const smokeCentroid = densityCentroidYNormalized(smoke.solver);
    const liquidCentroid = densityCentroidYNormalized(liquid.solver);
    expect(smokeCentroid).toBeLessThan(liquidCentroid - 0.04);
  });

  it('plasma apresenta resposta energética diferente de liquid no mesmo estímulo', () => {
    const plasma = createSolver({ fluidType: 'plasma', viscosity: 0.001, vorticity: 3.5 });
    const liquid = createSolver({ fluidType: 'liquid', viscosity: 0.001, vorticity: 3.5 });

    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const x = 0.2 + t * 0.6;
      const y = 0.5 + Math.sin(t * Math.PI * 2) * 0.08;
      plasma.solver.addVelocity(x, y, 9, -7, 0.03);
      plasma.solver.addDensity(x, y, 6, 0.03);
      liquid.solver.addVelocity(x, y, 9, -7, 0.03);
      liquid.solver.addDensity(x, y, 6, 0.03);
      plasma.solver.step(1 / 60);
      liquid.solver.step(1 / 60);
    }

    const plasmaEnergy = kineticEnergy(plasma.solver);
    const liquidEnergy = kineticEnergy(liquid.solver);
    const relativeDelta = Math.abs(plasmaEnergy - liquidEnergy) / Math.max(liquidEnergy, 1e-6);
    expect(relativeDelta).toBeGreaterThan(0.2);
  });

  it('permite sobrescrever parâmetros reais e alterar o comportamento do fluido', () => {
    const energeticProfiles = cloneDefaultRealWorldFluidInputs();
    energeticProfiles.smoke.turbulence = 1;
    energeticProfiles.smoke.momentumDampingPerSecond = 0.2;

    const dampedProfiles = cloneDefaultRealWorldFluidInputs();
    dampedProfiles.smoke.turbulence = 0;
    dampedProfiles.smoke.momentumDampingPerSecond = 4.2;

    const energeticSmoke = createSolver({
      fluidType: 'smoke',
      fluidRealWorldProfiles: energeticProfiles,
    });
    const dampedSmoke = createSolver({
      fluidType: 'smoke',
      fluidRealWorldProfiles: dampedProfiles,
    });

    for (let i = 0; i < 30; i++) {
      const t = i / 29;
      const x = 0.2 + t * 0.6;
      const y = 0.5 + Math.sin(t * Math.PI * 2) * 0.08;
      energeticSmoke.solver.addVelocity(x, y, 8, -6, 0.03);
      energeticSmoke.solver.addDensity(x, y, 6, 0.03);
      dampedSmoke.solver.addVelocity(x, y, 8, -6, 0.03);
      dampedSmoke.solver.addDensity(x, y, 6, 0.03);
      energeticSmoke.solver.step(1 / 60);
      dampedSmoke.solver.step(1 / 60);
    }

    const energeticEnergy = kineticEnergy(energeticSmoke.solver);
    const dampedEnergy = kineticEnergy(dampedSmoke.solver);
    const relativeDelta = Math.abs(energeticEnergy - dampedEnergy) / Math.max(dampedEnergy, 1e-6);
    expect(relativeDelta).toBeGreaterThan(0.25);
  });
});
