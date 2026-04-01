<div align="center">
  <h1>R.I.P.P.L.E</h1>
  <p><i>Real-time Integrated Physics & Particle Liquid Engine</i></p>

  <p>
    <a href="https://github.com/NullCipherr/ripple-engine/actions/workflows/main.yml"><img src="https://github.com/NullCipherr/ripple-engine/actions/workflows/main.yml/badge.svg" alt="CI" /></a>
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/WebGL-2-990000?style=flat-square" alt="WebGL2" />
    <img src="https://img.shields.io/badge/License-Apache--2.0-2E7D32?style=flat-square" alt="License" />
  </p>
</div>

<p align="center">
  🇺🇸 <a href="./README.md">English</a> | 🇧🇷 <strong>Português (Brasil)</strong>
</p>

---

## Visão Geral

A **R.I.P.P.L.E** isola a lógica de simulação/renderização da camada de interface da aplicação.

Este repositório contém apenas:

- solver numérico de fluido;
- sistema de obstáculos e partículas;
- renderer WebGL2 e shaders;
- contratos públicos de tipos para integração.

A camada de UI (React e componentes) não faz parte deste pacote.

---

## Documentação

- [Índice da documentação](docs/README.md)
- [Arquitetura](docs/pt-br/ARQUITETURA.md)
- [API Pública](docs/pt-br/API_PUBLICA.md)
- [Operação](docs/pt-br/OPERACAO.md)
- [Performance](docs/pt-br/PERFORMANCE.md)
- [Adaptadores Oficiais](docs/pt-br/ADAPTADORES_OFICIAIS.md)
- [WebGPU Experimental](docs/pt-br/WEBGPU_EXPERIMENTAL.md)
- [Testes e Qualidade](docs/pt-br/TESTES_E_QUALIDADE.md)
- [Releases e Versionamento](docs/pt-br/RELEASES_E_VERSIONAMENTO.md)
- [Roadmap](docs/pt-br/ROADMAP.md)
- [Migração do Simulador](docs/pt-br/MIGRACAO_DO_SIMULADOR.md)
- [Migração Entre Versões](docs/pt-br/MIGRACAO_ENTRE_VERSOES.md)
- [Exemplos Oficiais](examples/README.md)

---

## Instalação

```bash
npm install github:NullCipherr/ripple-engine#v1.0.0
```

Este projeto **não é publicado no npm inicialmente**. O consumo externo é distribuído via tags/releases do GitHub.

Para desenvolvimento local:

```bash
npm install
npm run lint
npm run test
npm run build
```

### Rodar a Demo (testes locais)

```bash
npm install
npm run demo
```

A demo ficará disponível na URL exibida no terminal (ex.: `http://localhost:5173/`) com:

- canvas de simulação em tempo real;
- métricas (FPS, frame time, partículas, memória estimada);
- controles de visualização, paleta, backend e física;
- ações para adicionar/limpar obstáculos e resetar a simulação.

---

## Exemplo de Uso

```ts
import { FluidEngine, type SimulationConfig } from '@nullcipherr/ripple-engine';

const canvas = document.querySelector('canvas') as HTMLCanvasElement;

const config: SimulationConfig = {
  density: 2,
  viscosity: 0,
  impulseForce: 10,
  gridSize: 128,
  resolution: 1,
  viewMode: 'density',
  dissipation: 0.98,
  velocityDissipation: 0.99,
  splatRadius: 0.02,
  showGrid: false,
  showTrails: true,
  glowIntensity: 0.5,
  colorPalette: 'default',
  fluidType: 'liquid',
  vorticity: 2,
  renderBackend: 'classic',
};

const engine = new FluidEngine(canvas, config);
engine.initialize();

let last = performance.now();
function tick(now: number) {
  const dt = (now - last) / 1000;
  last = now;

  engine.update(dt);
  engine.render();

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
```

> Mesmo instalado via URL do GitHub, os imports continuam usando o nome do pacote definido no `package.json`: `@nullcipherr/ripple-engine`.

---

## Scripts

- `npm run lint`: validação de tipos do projeto.
- `npm run test`: testes unitários e de integração com Vitest.
- `npm run build`: build da biblioteca em TypeScript.
- `npm run quality:gate`: lint + testes + build em sequência.
- `npm run demo`: inicia a demo da engine com Vite.
- `npm run clean`: remove o diretório `dist/`.

---

## Estrutura

```text
.
├── .github/workflows/main.yml
├── docs/
│   ├── README.md
│   └── pt-br/
├── src/
│   ├── engine/
│   │   ├── core/
│   │   ├── rendering/
│   │   └── simulation/
│   ├── types/
│   └── index.ts
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
├── package.json
├── tsconfig.build.json
└── tsconfig.json
```

---

## Licença

Licenciado sob **Apache-2.0**. Consulte [LICENSE](LICENSE).

---

## Governança

- [Contribuição](CONTRIBUTING.md)
- [Código de Conduta](CODE_OF_CONDUCT.md)
- [Política de Segurança](SECURITY.md)
- [Changelog](CHANGELOG.md)
