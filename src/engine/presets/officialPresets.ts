import type { OfficialPreset, PresetKey, SimulationConfig } from '../../types/simulation';

export const OFFICIAL_PRESETS: Readonly<Record<PresetKey, OfficialPreset>> = {
  calm: {
    key: 'calm',
    name: 'Calm Flow',
    description: 'Movimento suave com baixa turbulência e dissipação estável.',
    config: {
      density: 1.6,
      viscosity: 0.0025,
      impulseForce: 7,
      dissipation: 0.989,
      velocityDissipation: 0.995,
      vorticity: 0.8,
      splatRadius: 0.018,
      colorPalette: 'ocean',
      fluidType: 'liquid',
      showTrails: false,
      renderBackend: 'classic',
    },
  },
  viscous: {
    key: 'viscous',
    name: 'Viscous',
    description: 'Fluido denso, com movimentos mais lentos e arrasto elevado.',
    config: {
      density: 2.5,
      viscosity: 0.006,
      impulseForce: 8,
      dissipation: 0.992,
      velocityDissipation: 0.997,
      vorticity: 0.6,
      splatRadius: 0.022,
      colorPalette: 'default',
      fluidType: 'liquid',
      showTrails: false,
      renderBackend: 'classic',
    },
  },
  chaotic: {
    key: 'chaotic',
    name: 'Chaotic',
    description: 'Alta energia, vórtices fortes e resposta mais agressiva ao input.',
    config: {
      density: 2.2,
      viscosity: 0.0008,
      impulseForce: 13,
      dissipation: 0.981,
      velocityDissipation: 0.989,
      vorticity: 3.6,
      splatRadius: 0.024,
      colorPalette: 'plasma',
      fluidType: 'plasma',
      showTrails: true,
      renderBackend: 'classic',
    },
  },
  smoke: {
    key: 'smoke',
    name: 'Smoke',
    description: 'Perfil visual para plumas e dispersão gradual com trilhas.',
    config: {
      density: 1.9,
      viscosity: 0.0012,
      impulseForce: 9,
      dissipation: 0.987,
      velocityDissipation: 0.993,
      vorticity: 2.2,
      splatRadius: 0.021,
      colorPalette: 'fire',
      fluidType: 'smoke',
      showTrails: true,
      renderBackend: 'classic',
    },
  },
};

export function resolveOfficialPresetKey(key: string, fallback: PresetKey = 'calm'): PresetKey {
  if (key in OFFICIAL_PRESETS) {
    return key as PresetKey;
  }
  return fallback;
}

export function getOfficialPreset(key: PresetKey): OfficialPreset {
  return OFFICIAL_PRESETS[key];
}

export function applyOfficialPreset(baseConfig: SimulationConfig, presetOrKey: PresetKey | OfficialPreset): SimulationConfig {
  const preset = typeof presetOrKey === 'string' ? OFFICIAL_PRESETS[presetOrKey] : presetOrKey;
  return {
    ...baseConfig,
    ...preset.config,
  };
}
