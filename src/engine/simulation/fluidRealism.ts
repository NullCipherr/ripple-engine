import type { FluidType, RealWorldFluidInput } from '../../types/simulation';

export const DEFAULT_REAL_WORLD_FLUID_INPUTS: Readonly<Record<FluidType, RealWorldFluidInput>> = {
  liquid: {
    densityKgM3: 997,
    dynamicViscosityPaS: 0.00089,
    temperatureC: 20,
    ambientTemperatureC: 20,
    turbulence: 0.2,
    momentumDampingPerSecond: 1.4,
    densityHalfLifeSeconds: 9,
    diffusionM2S: 1e-9,
  },
  gas: {
    densityKgM3: 1.225,
    dynamicViscosityPaS: 0.0000181,
    temperatureC: 35,
    ambientTemperatureC: 20,
    turbulence: 0.45,
    momentumDampingPerSecond: 2.8,
    densityHalfLifeSeconds: 4.5,
    diffusionM2S: 0.00002,
  },
  smoke: {
    densityKgM3: 1.1,
    dynamicViscosityPaS: 0.000023,
    temperatureC: 95,
    ambientTemperatureC: 20,
    turbulence: 0.65,
    momentumDampingPerSecond: 2.2,
    densityHalfLifeSeconds: 6,
    diffusionM2S: 0.000035,
  },
  plasma: {
    densityKgM3: 0.08,
    dynamicViscosityPaS: 0.000001,
    temperatureC: 6000,
    ambientTemperatureC: 20,
    turbulence: 0.9,
    momentumDampingPerSecond: 3.6,
    densityHalfLifeSeconds: 2.8,
    diffusionM2S: 0.00012,
  },
};

export function cloneDefaultRealWorldFluidInputs(): Record<FluidType, RealWorldFluidInput> {
  return {
    liquid: { ...DEFAULT_REAL_WORLD_FLUID_INPUTS.liquid },
    gas: { ...DEFAULT_REAL_WORLD_FLUID_INPUTS.gas },
    smoke: { ...DEFAULT_REAL_WORLD_FLUID_INPUTS.smoke },
    plasma: { ...DEFAULT_REAL_WORLD_FLUID_INPUTS.plasma },
  };
}
