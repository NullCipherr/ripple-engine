# Exemplo Vanilla

## Setup

1. Selecionar `canvas`.
2. Criar `SimulationConfig`.
3. Instanciar `createVanillaRippleAdapter(canvas, config, options)`.

## Teardown

- Chamar `adapter.destroy()` ao desmontar página/rota.

## Fluxo mínimo

```ts
const adapter = createVanillaRippleAdapter(canvas, config, {
  autoStart: true,
  autoResize: true,
});

window.addEventListener('beforeunload', () => adapter.destroy());
```
