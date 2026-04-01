# Adaptadores Oficiais

## Objetivo

Fornecer integração rápida da `R.I.P.P.L.E` em aplicações host, sem duplicar boilerplate de ciclo de vida.

## Adaptador Vanilla JS

Export:

- `createVanillaRippleAdapter(canvas, config, options)`

Capacidades:

- inicialização e teardown da engine;
- loop de animação (`start`/`stop`);
- resize manual;
- atualização de config/obstáculos;
- input programático (`processInput`).

Exemplo:

```ts
import { createVanillaRippleAdapter } from '@nullcipherr/ripple-engine';

const adapter = createVanillaRippleAdapter(canvas, config, {
  autoStart: true,
  autoResize: true,
});
```

Referência completa: `examples/vanilla/`.

## Adaptador para React (orientado a ciclo de vida)

Export:

- `createReactRippleAdapter(initialConfig, options)`

Fluxo sugerido:

1. Criar adapter em escopo estável do componente.
2. Chamar `attachCanvas(ref.current)` no mount.
3. Chamar `start()` após attach.
4. Chamar `destroy()` no unmount.

Exemplo:

```ts
import { createReactRippleAdapter } from '@nullcipherr/ripple-engine';

const adapter = createReactRippleAdapter(config, { enableDomInput: false });
adapter.attachCanvas(canvasElement);
adapter.start();
```

Referência completa: `examples/react/README.md`.
