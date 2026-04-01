import type { FluidType, SimulationConfig } from '../../types/simulation';
import { DEFAULT_REAL_WORLD_FLUID_INPUTS } from '../simulation/fluidRealism';

interface TemperatureEmission {
  tint: [number, number, number];
  strength: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function kelvinToRgb(kelvin: number): [number, number, number] {
  const temp = clamp(kelvin, 1000, 40000) / 100;

  let red: number;
  let green: number;
  let blue: number;

  if (temp <= 66) {
    red = 255;
    green = 99.4708025861 * Math.log(temp) - 161.1195681661;
    blue = temp <= 19 ? 0 : 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  } else {
    red = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
    green = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
    blue = 255;
  }

  return [clamp(red, 0, 255) / 255, clamp(green, 0, 255) / 255, clamp(blue, 0, 255) / 255];
}

function getActiveFluidTemperature(config: SimulationConfig): { temperatureC: number; ambientTemperatureC: number } {
  const type = config.fluidType;
  const defaults = DEFAULT_REAL_WORLD_FLUID_INPUTS[type];
  const overrides = config.fluidRealWorldProfiles?.[type];
  return {
    temperatureC: overrides?.temperatureC ?? defaults.temperatureC,
    ambientTemperatureC: overrides?.ambientTemperatureC ?? defaults.ambientTemperatureC,
  };
}

export function getTemperatureEmission(config: SimulationConfig): TemperatureEmission {
  if (!config.autoColorFromTemperature) {
    return { tint: [1, 1, 1], strength: 0 };
  }

  const { temperatureC, ambientTemperatureC } = getActiveFluidTemperature(config);
  const delta = temperatureC - ambientTemperatureC;
  const kelvin = temperatureC + 273.15;
  const tint = kelvinToRgb(kelvin);

  const baseStrength = clamp((delta - 40) / 1800, 0, 1);
  const fluidBoostByType: Record<FluidType, number> = {
    liquid: 0.45,
    gas: 0.75,
    smoke: 0.9,
    plasma: 1.2,
  };
  const boosted = baseStrength * fluidBoostByType[config.fluidType];
  const strength = clamp(boosted, 0, 1);

  return { tint, strength };
}
