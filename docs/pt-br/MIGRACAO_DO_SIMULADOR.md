# Migração do Simulador

## Objetivo

Consumir a engine como dependência externa e remover a lógica interna duplicada no projeto do simulador.

## Passos recomendados

1. Publicar ou linkar localmente a `R.I.P.P.L.E`.
2. Substituir imports internos (`src/engine/...`) por `@nullcipherr/ripple-engine`.
3. Manter no simulador apenas UI, estado global, hooks de tela e composição.
4. Preservar o loop de animação no simulador para controle de FPS e UX.
5. Validar comportamentos críticos: resize, reset, troca de preset e obstáculos.

## Fronteira de responsabilidade

- `R.I.P.P.L.E`: simulação, rendering, partículas e input de canvas.
- `WebGL-Fluid-Simulator`: layout, painéis, persistência de preferências, métricas de interface e fluxos de produto.
