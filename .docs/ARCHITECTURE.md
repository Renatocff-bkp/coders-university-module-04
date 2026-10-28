# Arquitetura

Monorepo gerenciado por [Turborepo](https://turborepo.dev) com workspaces npm.

> **Status da stack:** este documento descreve a arquitetura **alvo** do projeto, conforme definida em `.specs/000-foundation.md` e nos ADRs. O repositório hoje contém apenas parte dela (veja [Estado atual](#estado-atual)). Trate a diferença como trabalho pendente, não como descuido.

## Estrutura alvo

```
.
├── apps/
│   ├── api/            # API REST (NestJS)
│   ├── app/            # Cliente web (React.js + Vite)
│   └── docs/           # Documentação (Next.js)
├── packages/
│   ├── eslint-config/      # Configuração ESLint compartilhada
│   ├── typescript-config/  # Configurações TypeScript compartilhadas
│   └── ui/                 # Design system (@repo/ui)
├── .adrs/              # Architecture Decision Records
├── turbo.json          # Pipeline de tasks do Turborepo
└── package.json        # Workspaces e scripts raiz
```

## Estado atual

O repositório foi inicializado com `create-turbo`. As Etapas 1 e 2 da spec `000-foundation` já foram executadas:

| Caminho                      | Estado           | Observação                                                                                |
| ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------- |
| `apps/web`                   | Existe (Next.js) | Placeholder com o design system aplicado. Deve virar `apps/app` (React + Vite) na Etapa 7 |
| `apps/docs`                  | Existe (Next.js) | Vitrine do design system                                                                  |
| `packages/ui`                | Existe           | shadcn/ui sobre Tailwind 4 — 10 componentes, tokens de `DESIGN.md`, build para `dist/`    |
| `packages/eslint-config`     | Existe           | Funcional                                                                                 |
| `packages/typescript-config` | Existe           | Funcional                                                                                 |
| `apps/api`                   | **Não existe**   | Criar com NestJS                                                                          |
| Supabase (auth/db/storage)   | **Não existe**   | Adicionar                                                                                 |
| Testes (Vitest/Playwright)   | **Não existe**   | Tasks `test` e `test:e2e` existem no `turbo.json`, mas sem runner instalado               |
| Observabilidade (LGTM)       | **Não existe**   | Adicionar desde o dia zero                                                                |

## Front-End

| Tecnologia     | Versão | Papel                                  |
| -------------- | ------ | -------------------------------------- |
| React.js       | 19.x   | Criação de UIs                         |
| Vite           | 7.x    | Dev server e build do cliente (SPA)    |
| TypeScript     | 7.x    | Tipagem                                |
| TailwindCSS    | 4.x    | Estilização / tokens de design         |
| shadcn/ui      | —      | Design system sobre Radix UI           |
| TanStack Query | 5.x    | Queries, mutations e cache de servidor |
| TanStack Table | 8.x    | Tabelas de dados                       |
| TanStack Chart | 8.x    | Gráficos                               |
| date-fns       | 4.x    | Manipulação de datas                   |
| Next.js        | 16.x   | Apenas em `apps/docs`                  |

## Back-End

| Tecnologia      | Versão | Papel                                       |
| --------------- | ------ | ------------------------------------------- |
| NestJS          | 11.x   | API REST, módulos e DI                      |
| TypeScript      | 7.x    | Tipagem                                     |
| Supabase        | —      | Autenticação + banco de dados + storage     |
| Bcrypt          | 6.x    | Hash de senhas                              |
| class-validator | —      | Validação de DTOs                           |
| Zod             | 4.x    | Validação de env e contratos compartilhados |

## Banco de dados

PostgreSQL via Supabase, com RLS habilitado por padrão. Migrations versionadas e aplicadas via `db:migrate`.

## Infraestrutura

| Serviço                                  | Papel                                                  |
| ---------------------------------------- | ------------------------------------------------------ |
| Vercel                                   | Deploy da API (`apps/api`)                             |
| Vercel                                   | Deploy do cliente (`apps/app`) e da docs (`apps/docs`) |
| Supabase                                 | Postgres, Auth e Storage gerenciados                   |
| LGTM stack (Grafana, Loki, Tempo, Mimir) | Observabilidade — obrigatória desde o dia zero         |
| Docker Compose                           | Infra local de desenvolvimento                         |

## Tasks do Turborepo

| Task          | Comando raiz          | Descrição                                            |
| ------------- | --------------------- | ---------------------------------------------------- |
| `dev`         | `npm run dev`         | Sobe todos os apps e a infra em modo desenvolvimento |
| `build`       | `npm run build`       | Build de produção (depende de `^build`)              |
| `lint`        | `npm run lint`        | ESLint em todos os pacotes                           |
| `check-types` | `npm run check-types` | Verificação de tipos TypeScript                      |
| `test`        | `npm run test`        | Testes unitários e de integração                     |
| `test:e2e`    | `npm run test:e2e`    | Testes E2E                                           |

## Pacotes compartilhados

- **`@repo/ui`** — Design system. Componentes acessíveis sobre shadcn/ui + Radix. Importação via `@repo/ui/{component}`.
- **`@repo/eslint-config`** — Regras ESLint compartilhadas (`base`, `next-js`, `react-internal`).
- **`@repo/typescript-config`** — Configurações `tsconfig` compartilhadas (`base`, `nextjs`, `react-library`, `node`).

## Decisões arquiteturais

Decisões formais com contexto e trade-offs estão em [`.adrs/`](../.adrs/README.md). As vigentes:

- **Cliente SPA, não SSR** — O cliente é React + Vite (SPA). Next.js é usado apenas em `apps/docs`, onde SSR não é necessário.
- **Backend NestJS modular** — A API é um monólito modular com NestJS, não microsserviços.
- **Supabase como backend-as-a-service** — Auth, Postgres e Storage gerenciados evitam operar infraestrutura própria.
- **Arquitetura em camadas** — Separação application / domain / infrastructure / interface. Ver [DEVELOPMENT.md](./DEVELOPMENT.md).
- **Vertical slices** — O código é fatiado por domínio de negócio, não por camada técnica.
- **Testes desde o dia zero** — TDD. Cobertura de lógica de negócio é obrigatória.
- **Observabilidade desde o dia zero** — Logs estruturados com correlação, enviados à stack LGTM. Não é item de backlog.
- **CSS com Tailwind + tokens** — TailwindCSS 4 com tokens de design em `globals.css`; shadcn/ui como base do design system.

## Referências

- [BUSINESS.md](./BUSINESS.md) — Domínio e personas
- [DEVELOPMENT.md](./DEVELOPMENT.md) — Convenções e arquitetura em camadas
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — Componentes e UI
- [QA.md](./QA.md) — Verificações
- [RULES.md](./RULES.md) — Fluxo de trabalho
- [`.adrs/`](../.adrs/README.md) — Decisões arquiteturais
