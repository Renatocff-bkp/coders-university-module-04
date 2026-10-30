# Arquitetura

Monorepo gerenciado por [Turborepo](https://turborepo.dev) com workspaces npm.

> **Status da stack:** este documento descreve a arquitetura **alvo** do projeto, conforme definida em `.specs/000-foundation.md` e nos ADRs. O repositório hoje contém parte da fundação executada (ver [Estado atual](#estado-atual)); trate a divergência como trabalho pendente, não como descuido.

## Estrutura alvo

```
.
├── apps/
│   ├── api/            # API REST (NestJS)
│   ├── app/            # Cliente web (React + Vite)
│   ├── docs/           # Documentação (Next.js)
│   └── ...
├── packages/
│   ├── eslint-config/      # Configuração ESLint compartilhada
│   ├── typescript-config/  # Configurações TypeScript compartilhadas
│   └── ui/                  # Design system (@repo/ui)
├── supabase/              # Migrations e testes RLS
├── infra/                 # Configurações LGTM (Alloy, Loki, Tempo, Mimir, Grafana)
├── docker-compose.yml    # Stack LGTM local
├── scripts/               # Health check da infraestrutura
├── turbo.json             # Pipeline de tasks do Turborepo
├── package.json           # Workspaces e scripts raiz
└── .adrs/                 # Architecture Decision Records
```

## Estado atual

O repositório nasceu de um `create-turbo` (dois apps Next.js) e a fundação foi
reestruturada para a arquitetura alvo. As Etapas 1 a 7 da spec `000-foundation`
foram executadas até o momento:

| Caminho                      | Estado                  | Observação                                                                                      |
| ---------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------- |
| `apps/api`                   | **Existe**              | NestJS com health/ping, auth base, Drizzle, RLS, observability e testes HTTP (Etapas 4 a 6)     |
| `apps/app`                   | **Existe**              | React 19 + Vite 7 + Tailwind 4 + React Router + TanStack Query; tela de status `/app` (Etapa 7) |
| `apps/docs`                  | Existe (Next.js)        | Vitrine do design system                                                                        |
| `packages/ui`                | Existe                  | shadcn/ui sobre Tailwind 4, tokens de `DESIGN.md`, build ESM em dist/                           |
| `packages/eslint-config`     | Existe                  | Funcional                                                                                       |
| `packages/typescript-config` | Existe                  | Funcional                                                                                       |
| Supabase (auth/db/storage)   | **Existe**              | Postgres/Auth/Storage local, migrations Drizzle via Supabase CLI, RLS (Etapas 3 a 5)            |
| Testes (Vitest/Playwright)   | **Existe parcialmente** | Vitest cobre API e app (unit/integration); `test:e2e` segue sem runner até a Etapa 8            |
| Observabilidade (LGTM)       | **Existe**              | Alloy → Loki/Tempo/Mimir + Grafana dashboard `api-overview` (Etapa 6)                           |

## Front-End

| Tecnologia     | Versão | Papel                                               |
| -------------- | ------ | --------------------------------------------------- |
| React          | 19.2   | Criação de UIs                                      |
| React Router   | 7.18   | Rotas da SPA                                        |
| TanStack Query | 5.105  | Queries, mutations e cache de servidor              |
| Vite           | 7.3    | Dev server e build do cliente (SPA)                 |
| TypeScript     | 6.0.3  | Tipagem (alinhado com o requisito do `@nestjs/cli`) |
| TailwindCSS    | 4.3    | Estilização / tokens de design                      |
| shadcn/ui      | —      | Design system sobre Radix UI                        |
| Next.js        | 16     | Apenas em `apps/docs`                               |

## Back-End

| Tecnologia    | Versão    | Papel                                 |
| ------------- | --------- | ------------------------------------- |
| NestJS        | 11.2      | API REST, módulos e DI                |
| Drizzle ORM   | 0.45      | ORM sobre Postgres                    |
| Drizzle Kit   | 0.31      | Geração de migrations                 |
| Supabase      | —         | Auth + banco de dados + storage       |
| Bcrypt        | 6         | Hash de senhas                        |
| OpenTelemetry | 1.x/0.300 | Traces e métricas via OTLP para Alloy |

## Banco de dados

PostgreSQL via Supabase, com RLS habilitado por padrão. Migrations versionadas e aplicadas via `db:migrate`.

## Infraestrutura

| Serviço        | Papel                                       |
| -------------- | ------------------------------------------- |
| Grafana        | Dashboards e queries sobre Loki/Tempo/Mimir |
| Loki           | Logs (push via Alloy)                       |
| Tempo          | Traces (OTLP via Alloy)                     |
| Mimir          | Métricas (OTLP via Alloy / Prometheus)      |
| Alloy          | Coletor único: OTLP + Loki push             |
| Docker Compose | Stack LGTM local                            |
| Supabase       | Postgres, Auth e Storage                    |

## Tasks do Turborepo

| Task          | Comando raiz          | Descrição                                           |
| ------------- | --------------------- | --------------------------------------------------- |
| `dev`         | `npm run dev`         | Sobe API, app, docs e infra em modo desenvolvimento |
| `build`       | `npm run build`       | Build de produção (depende de `^build`)             |
| `lint`        | `npm run lint`        | ESLint em todos os pacotes                          |
| `check-types` | `npm run check-types` | Verificação de tipos TypeScript                     |
| `test`        | `npm run test`        | Testes unitários e de integração                    |
| `test:e2e`    | `npm run test:e2e`    | Testes E2E (sem runner até a Etapa 8)               |

## Pacotes compartilhados

- **`@repo/ui`** — Design system. Componentes acessíveis sobre shadcn/ui + Radix. Importa-se via `@repo/ui/{component}`.
- **`@repo/eslint-config`** — Regras ESLint compartilhadas (`base`, `next-js`, `react-internal`).
- **`@repo/typescript-config`** — Configurações `tsconfig` compartilhadas (`base`, `nextjs`, `react-library`, `node`).

## Decisões arquiteturais

Decisões formais com contexto e trade-offs estão em [`.adrs/`](../.adrs/README.md). As vigentes:

- **Cliente SPA, não SSR** — O cliente é React + Vite (SPA). Next.js é usado apenas em `apps/docs`.
- **Backend NestJS modular** — API em monólito modular com NestJS, não microsserviços.
- **Supabase como backend-as-a-service** — Auth, Postgres e Storage gerenciados.
- **Arquitetura em camadas** — application / domain / infrastructure / interface. Ver [DEVELOPMENT.md](./DEVELOPMENT.md).
- **Vertical slices** — Código fatiado por domínio de negócio, não por camada técnica.
- **Testes desde o dia zero** — TDD. Cobertura de lógica de negócio obrigatória.
- **Observabilidade desde o dia zero** — Logs estruturados com correlação, enviados para a stack LGTM.
- **CSS com Tailwind + tokens** — TailwindCSS 4 com tokens de design; shadcn/ui como base do design system.
- **`@repo/ui` em ESM** — Build com `tsc` emitindo ESM (`"type": "module"`) para consumo correto do Vite.
- **TypeScript 6.0.3** — Alinhado com o requisito do `@nestjs/cli`, que ainda não suporta o API do TypeScript 7.

## Referências

- [BUSINESS.md](./BUSINESS.md) — Domínio e personas
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Convenções e arquitetura em camadas
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — Componentes e UI
- [QA.md](./QA.md) — Verificações
- [RULES.md](./RULES.md) — Fluxo de trabalho
- [`.adrs/`](../.adrs/README.md) — Decisões arquiteturais
