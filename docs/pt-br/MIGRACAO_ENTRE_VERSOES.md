# Migração Entre Versões

## Objetivo

Padronizar atualização da `R.I.P.P.L.E` em projetos consumidores, reduzindo risco de regressão.

## Fluxo recomendado de upgrade

1. Ler `CHANGELOG.md` da versão alvo.
2. Atualizar dependência por tag:

```bash
npm install github:NullCipherr/ripple-engine#vX.Y.Z
```

3. Validar build e testes do projeto consumidor.
4. Executar checklist funcional mínimo.

## Checklist funcional mínimo no consumidor

- inicialização da engine (`initialize`);
- loop principal (`update` + `render`);
- resize de canvas/tela;
- reset e limpeza de recursos (`reset` e `dispose`);
- fluxo de obstáculos;
- troca de configurações em runtime (`updateConfig`).

## Template de notas de migração por versão

Use este bloco no changelog quando houver impacto de integração:

```md
### Migração (vX.Y.Z)
- Impacto: <baixo|médio|alto>
- O que mudou: <resumo objetivo>
- Ação necessária no consumidor: <passos concretos>
- Compatibilidade: <quebra|compatível>
```
