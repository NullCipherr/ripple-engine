# Releases e Versionamento

## Estratégia de distribuição

- Distribuição inicial via GitHub Releases.
- Instalação em projetos consumidores via tag:

```bash
npm install github:NullCipherr/ripple-engine#vX.Y.Z
```

## Política de versionamento

O projeto segue Semantic Versioning (`MAJOR.MINOR.PATCH`):

- `MAJOR`: quebra de compatibilidade na API pública.
- `MINOR`: funcionalidades novas compatíveis com versões anteriores.
- `PATCH`: correções sem quebra de contrato.

Regras operacionais:

- usar sempre tags no formato `vX.Y.Z`;
- manter `CHANGELOG.md` atualizado antes de publicar a tag;
- evitar reutilizar tag já publicada.

## Checklist de release

Antes de publicar:

1. Atualizar `CHANGELOG.md` (seção `Unreleased` e nova versão).
2. Validar qualidade local:

```bash
npm run quality:gate
```

3. Revisar documentação afetada por mudanças de API/comportamento.

Publicação:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Após publicação:

1. Confirmar release gerada no GitHub com artefato `.tgz`.
2. Confirmar instrução de upgrade no changelog.
3. Validar instalação da nova tag em pelo menos um projeto consumidor.
