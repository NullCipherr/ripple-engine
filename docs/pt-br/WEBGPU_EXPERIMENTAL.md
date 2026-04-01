# WebGPU Experimental

## Estado atual

- A API aceita `renderBackend: 'webgpu-experimental'`.
- O backend experimental usa pipeline WebGPU nativo para o draw principal.
- O backend experimental identifica suporte a WebGPU no ambiente e reporta status em runtime.

## Como consultar status em runtime

```ts
const status = engine.getRenderBackendStatus();
// requested, active, isFallback, supportsWebGPU, reason
```

## Observações de operação

- Sem fallback automático para WebGL neste modo.
- Se o ambiente não suportar WebGPU, o status deve ser tratado pela aplicação host.
