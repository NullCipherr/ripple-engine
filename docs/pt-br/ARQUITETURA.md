# Arquitetura

## Objetivo

A `R.I.P.P.L.E` é um pacote TypeScript focado exclusivamente em simulação e renderização, sem acoplamento com React ou com a UI do simulador.

## Camadas

- `engine/core`: orquestração do ciclo de vida da engine.
- `engine/simulation`: solver numérico, partículas e obstáculos.
- `engine/rendering`: renderização WebGL2 e shaders.
- `types`: contratos públicos de tipos.

## Fluxo principal

1. Consumidor cria `new FluidEngine(canvas, config)`.
2. Chama `initialize()` para preparar renderer, solver e input.
3. No loop de animação externo, chama `update(dt)` e `render()`.
4. Alterações de parâmetros usam `updateConfig()` e `updateObstacles()`.
5. No teardown, chama `dispose()`.

## Decisões arquiteturais

- A engine não conhece estado de framework (React, Angular, Vue).
- Parsing e normalização de dados devem ocorrer fora da engine.
- O loop de animação pertence ao consumidor (simulador/aplicação host).
