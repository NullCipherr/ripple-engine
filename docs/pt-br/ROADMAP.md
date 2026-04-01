# Roadmap 

## Ciclos Concluído

- [x] Distribuição versionada via GitHub Releases.
- [x] Changelog estruturado e política de versionamento.
- [x] Testes de integração da camada de rendering.
- [x] API de input desacoplado do DOM (`enableDomInput` + `processInput`).
- [x] Presets oficiais em módulo dedicado com fallback por chave.
- [x] Profiling padronizado com baseline e comparação.
- [x] Backend alternativo `webgpu-experimental` com fallback seguro para WebGL.
- [x] Adaptadores oficiais para vanilla JS e integração em React.

## Próximo ciclo (curto prazo)

- [x] Implementar pipeline WebGPU nativo (sem fallback) para passagens principais de rendering.
Critério atendido: draw path WebGPU ativo no backend experimental com paridade visual mínima de densidade.
- [x] Adicionar relatório de status de backend na demo (requested/active/fallback).
Critério atendido: demo exibe backend ativo em tempo real no painel de métricas.
- [x] Publicar exemplos completos dos adaptadores oficiais.
Critério atendido: exemplos em `examples/` com setup e teardown documentados para vanilla e React.

## Próximo ciclo (médio prazo)

- [ ] Expandir profiling para suíte comparativa por thresholds de regressão.
Critério de pronto: falha automática quando regressão exceder limite definido por cenário.
- [ ] Introduzir suíte de smoke tests de API pública por versão.
Critério de pronto: validar contratos críticos de integração antes de cada release.
- [ ] Estruturar presets customizáveis com validação de schema.
Critério de pronto: parser/validator com mensagens de erro claras para presets inválidos.

## Visão contínua (longo prazo)

- [ ] Explorar compute shaders/WebGPU para partes da simulação além do rendering.
- [ ] Planejar estratégia opcional de distribuição adicional (além de GitHub), sem comprometer estabilidade atual.
