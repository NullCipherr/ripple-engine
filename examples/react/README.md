# Exemplo React (orientado a ciclo de vida)

## Setup

1. Criar o adapter com `createReactRippleAdapter(config)`.
2. No `useEffect`, chamar `attachCanvas` e `start`.
3. Em cleanup, chamar `destroy`.

## Teardown

- Sempre usar `destroy()` no retorno do `useEffect` para liberar renderer, listeners e buffers.

## Exemplo de uso

```tsx
import { useEffect, useMemo, useRef } from 'react';
import { createReactRippleAdapter, type SimulationConfig } from '@nullcipherr/ripple-engine';

const config: SimulationConfig = {
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
  vorticity: 2,
  renderBackend: 'classic',
};

export function RippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const adapter = useMemo(
    () => createReactRippleAdapter(config, { enableDomInput: true }),
    [],
  );

  useEffect(() => {
    if (!canvasRef.current) return;
    adapter.attachCanvas(canvasRef.current);
    adapter.start();
    adapter.resize();

    return () => {
      adapter.destroy();
    };
  }, [adapter]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
```
