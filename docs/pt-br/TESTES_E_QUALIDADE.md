# Testes e Qualidade

## Validações locais

- `npm run lint`: valida tipos e contratos TypeScript.
- `npm run test`: executa testes unitários e de integração de rendering com Vitest.
- `npm run build`: garante geração dos artefatos distribuíveis em `dist/`.

## Cobertura atual

A suíte cobre:

- invariantes essenciais do `FluidSolver`;
- alocação consistente de buffers;
- injeção de densidade sem `NaN`;
- reset completo de campos;
- bloqueio de injeção em obstáculos;
- estabilidade numérica após múltiplos passos;
- integração de `WebGLRenderer` com contexto WebGL mockado;
- inicialização de estado gráfico e viewport;
- upload de texturas e cálculo de memória estimada;
- controle de renderização de partículas por configuração;
- limpeza de recursos em `dispose`;
- input programático desacoplado de DOM com `enableDomInput: false`;
- presets oficiais com fallback de compatibilidade;
- profiling padronizado com cenários e comparação baseline x candidato.
- backend alternativo `webgpu-experimental` com verificação de fallback;
- adaptadores oficiais para integração vanilla e React.

## Próximas melhorias

- testes de regressão para métricas de memória;
- teste de contrato para mudança dinâmica de `gridSize`;
- suíte dedicada de regressão de performance por thresholds da release.
