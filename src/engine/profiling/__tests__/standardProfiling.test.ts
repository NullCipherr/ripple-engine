import { describe, expect, it } from 'vitest';
import { compareBenchmarkWithBaseline, getProfilingScenarioKeys, runStandardBenchmark } from '../standardProfiling';

describe('standardProfiling', () => {
  it('lista cenários de profiling suportados', () => {
    expect(getProfilingScenarioKeys().sort()).toEqual(['baseline-smoke', 'stress-vortex']);
  });

  it('executa benchmark padrão com métricas válidas', () => {
    const result = runStandardBenchmark('baseline-smoke', 2026);
    expect(result.steps).toBeGreaterThan(0);
    expect(result.avgFrameTimeMs).toBeGreaterThan(0);
    expect(result.fpsEstimate).toBeGreaterThan(0);
    expect(Number.isFinite(Number(result.checksum))).toBe(true);
  });

  it('compara baseline vs candidato com deltas numéricos', () => {
    const baseline = runStandardBenchmark('stress-vortex', 123);
    const candidate = runStandardBenchmark('stress-vortex', 124);
    const diff = compareBenchmarkWithBaseline(baseline, candidate, 'stress-vortex');

    expect(diff.scenario).toBe('stress-vortex');
    expect(Number.isFinite(diff.frameTimeDeltaMs)).toBe(true);
    expect(Number.isFinite(diff.frameTimeDeltaPct)).toBe(true);
    expect(Number.isFinite(diff.fpsDeltaPct)).toBe(true);
  });
});

