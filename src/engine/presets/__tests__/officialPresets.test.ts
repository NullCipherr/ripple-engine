import { describe, expect, it } from 'vitest';
import type { SimulationConfig } from '../../../types/simulation';
import { applyOfficialPreset, getOfficialPreset, OFFICIAL_PRESETS, resolveOfficialPresetKey } from '../officialPresets';

function baseConfig(): SimulationConfig {
  return {
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
}

describe('OfficialPresets', () => {
  it('expõe presets oficiais esperados', () => {
    expect(Object.keys(OFFICIAL_PRESETS).sort()).toEqual(['calm', 'chaotic', 'smoke', 'viscous']);
  });

  it('resolve chave inválida com fallback', () => {
    expect(resolveOfficialPresetKey('calm')).toBe('calm');
    expect(resolveOfficialPresetKey('invalid-key')).toBe('calm');
    expect(resolveOfficialPresetKey('invalid-key', 'smoke')).toBe('smoke');
  });

  it('aplica preset sem perder campos não gerenciados pelo preset', () => {
    const base = baseConfig();
    const calm = getOfficialPreset('calm');
    const next = applyOfficialPreset(base, calm);

    expect(next.gridSize).toBe(base.gridSize);
    expect(next.viewMode).toBe(base.viewMode);
    expect(next.glowIntensity).toBe(base.glowIntensity);
    expect(next.colorPalette).toBe(calm.config.colorPalette);
    expect(next.viscosity).toBe(calm.config.viscosity);
  });
});
