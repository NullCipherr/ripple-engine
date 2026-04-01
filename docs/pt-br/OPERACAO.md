# Operação

## Requisitos

- Node.js 20+
- npm 10+

## Setup local

```bash
npm install
npm run lint
npm run test
npm run build
```

## Consumo da engine em outros projetos

Instale por URL do GitHub apontando para uma tag de release:

```bash
npm install github:NullCipherr/ripple-engine#v1.0.0
```

Recomendação operacional:

- usar sempre tags (`vX.Y.Z`) em vez de branch para evitar quebra inesperada;
- registrar no projeto consumidor a versão exata adotada;
- atualizar apenas após validar changelog e testes locais.

## Publicação de release no GitHub

Fluxo mínimo para disponibilizar nova versão:

```bash
# após atualizar CHANGELOG e validar build/testes
npm run quality:gate
git tag v1.0.1
git push origin v1.0.1
```

Ao enviar a tag, o workflow `.github/workflows/release.yml` executa lint, testes, build e cria a release automaticamente com artefato `.tgz`.

Referências:

- [Releases e Versionamento](./RELEASES_E_VERSIONAMENTO.md)
- [Migração Entre Versões](./MIGRACAO_ENTRE_VERSOES.md)

## Uso no simulador

- O simulador deve controlar o loop (`requestAnimationFrame`).
- A UI deve manter estado e passar apenas `config`/eventos para a engine.
- O desligamento da tela/rota deve chamar `engine.dispose()`.
- Para ambientes sem eventos de canvas, usar `enableDomInput: false` e enviar comandos via `processInput`.
- Para perfil de tuning previsível, aplicar presets oficiais e registrar comparativo de benchmark por cenário padrão.
- Para `renderBackend: webgpu-experimental`, validar `engine.getRenderBackendStatus()` e registrar se houve fallback.
