# Changelog

Todas as mudanças relevantes deste projeto serão registradas aqui.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- Pipeline de release no GitHub acionado por tag `v*`, com build/testes e publicação automática de release.
- Documentação de consumo externo da engine via URL do repositório no GitHub.
- Testes de integração para `WebGLRenderer` com mock de `WebGL2RenderingContext`.
- Documentação de política de releases/versionamento e guia de migração entre versões.
- Script `npm run quality:gate` para gate local de release (lint + testes + build).
- API de input programático desacoplado do DOM (`enableDomInput` + `processInput`).
- Módulo de presets oficiais com fallback de compatibilidade (`officialPresets`).
- Módulo de profiling padronizado com baseline e comparação (`standardProfiling`).
- Testes adicionais para input desacoplado, presets e profiling.
- Backend `webgpu-experimental` com pipeline nativo de draw e status de backend em runtime.
- Adaptadores oficiais `createVanillaRippleAdapter` e `createReactRippleAdapter`.
- Novo roadmap substituído por ciclo estratégico atualizado.
- Pipeline WebGPU nativo para draw principal do backend experimental (sem fallback automático).
- Painel da demo com status do backend (`requested -> active`).
- Exemplos oficiais publicados em `examples/` para adapters vanilla e React com setup/teardown.
- Correções de robustez no backend WebGPU: upload alinhado de textura, shader RGB completo e fallback automático para WebGL em falhas.
- Correção de input contínuo com mouse pressionado ao mover fora/na borda do canvas.
- Novos modos de fluido para visualização e testes: `liquid`, `gas`, `smoke`, `plasma`.

## [1.0.0] - 2026-03-31

### Added

- Extração da engine para repositório dedicado.
- Public API com exports centralizados em `src/index.ts`.
- Build de biblioteca TypeScript com geração de tipos (`dist/*.d.ts`).
- Testes de invariantes do solver com Vitest.
- Pipeline de CI com lint, testes e build.
- Documentação técnica modular em `docs/pt-br/`.
- Arquivos de governança: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.

[Unreleased]: https://github.com/NullCipherr/ripple-engine/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/NullCipherr/ripple-engine/releases/tag/v1.0.0
