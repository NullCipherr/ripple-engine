# Performance

## Estratégias já aplicadas

- Uso de `Float32Array` e `Uint8Array` para reduzir overhead de memória.
- Reuso de buffers de partículas no renderer.
- Limite de `deltaTime` (`<= 0.033`) para reduzir instabilidade em quedas de FPS.
- Pipeline WebGL2 com texturas single-channel (`R32F` e `R8`) para campos da simulação.

## Métricas disponíveis

A engine expõe `getRuntimeMetrics()` com:

- `activeParticles`
- `estimatedMemoryMB`

## Profiling padronizado

Funções disponíveis:

- `getProfilingScenarioKeys()`: lista cenários oficiais.
- `runStandardBenchmark(scenario, seed)`: executa benchmark determinístico por cenário.
- `compareBenchmarkWithBaseline(baseline, candidate, scenario)`: gera delta percentual e absoluto.

Cenários oficiais:

- `baseline-smoke`: cenário base para comparação recorrente.
- `stress-vortex`: cenário de estresse para identificar regressões em carga mais alta.

Fluxo recomendado:

1. Executar baseline em branch estável.
2. Executar candidato após mudança de performance.
3. Comparar `avgFrameTimeMs`, `fpsEstimate` e `frameTimeDeltaPct`.
4. Aprovar mudança somente quando regressões forem aceitáveis para o objetivo da release.
