# 000 — Foundation

## Metadado

| Campo         | Valor                                                                |
| ------------- | -------------------------------------------------------------------- |
| Status        | `approved`                                                           |
| Prioridade    | `critical`                                                           |
| Criado em     | 2026-09-28                                                           |
| Atualizado em | 2026-09-29                                                           |
| Responsável   | Renato                                                               |
| ADR           | [0001 — Estado-alvo da stack](../.adrs/0001-estado-alvo-da-stack.md) |

## Resumo

Fundação do monorepo full-stack: API NestJS, cliente React com Vite, docs Next.js, Supabase para auth e dados, design system shadcn/ui sobre Tailwind, testes e observabilidade — pronta para as features de agentes.

## Contexto

O repositório foi inicializado com `create-turbo`, que gera apenas dois apps Next.js. A intenção de projeto, registrada na spec original e na arquitetura original, era substancialmente maior.

Uma tentativa anterior de refinar esta spec reescreveu-a para descrever apenas o que o template gerou, apagando a intenção sem decisão registrada. Isso deixou o repositório com duas arquiteturas concorrentes. O [ADR 0001](../.adrs/0001-estado-alvo-da-stack.md) registra a decisão de tratar a documentação como estado-alvo e o scaffold como divergência a corrigir.

Esta spec executa essa decisão. É grande de propósito: a fundação precisa entregar a plataforma completa, não um esqueleto de front-end.

## Escopo

### Dentro do escopo

**Estrutura**

- `apps/api` — API REST NestJS com arquitetura em camadas e módulos por domínio
- `apps/app` — Cliente web React.js + Vite (SPA), substituindo o boilerplate `apps/web`
- `apps/docs` — App de documentação Next.js
- `packages/ui` — Design system shadcn/ui sobre TailwindCSS
- `packages/eslint-config`, `packages/typescript-config` — Configurações compartilhadas
- `packages/typescript-config` — Preset `node` para o backend NestJS

**Backend e dados**

- Supabase local via Docker Compose (Postgres, Auth, Storage)
- Autenticação base com Bcrypt para hash de senha
- RLS habilitado no schema inicial, com policies e testes que as verificam
- Migrations versionadas e aplicadas via `db:migrate`
- Validação de DTOs com class-validator e de env com Zod

**Observabilidade**

- Logs estruturados em JSON com `requestId` e `userId`
- Stack LGTM local via Docker Compose (Grafana, Loki, Tempo, Mimir)
- Métricas de negócio nos caminhos críticos
- Comandos `infra:up`, `infra:down`, `infra:logs`, `db:migrate`, `db:reset`

**Design system**

- shadcn/ui inicializado em `packages/ui` com TailwindCSS 4
- Tokens de design de `DESIGN.md` mapeados para o Tailwind
- Componentes base: button, input, label, card, dialog, dropdown-menu, select, table, toast, skeleton
- Resíduos de boilerplate removidos (prop `appName` com `alert()`, UTM hardcoded com URL inválida)

**Qualidade**

- Vitest configurado com testes unitários e de integração, cobrindo `domain` e `application`
- Playwright configurado em `apps/app` com `webServer` subindo a aplicação automaticamente
- Lint, tipagem e build passando em todos os workspaces

### Fora do escopo

- Implementação de features de negócio (agentes, conectores, conversas, billing)
- Casos de uso reais — a API responde health check e um recurso de exemplo
- UI final do produto — o cliente exibe uma tela de status, não telas reais
- CI/CD e deploy contínuo
- Autenticação social (OAuth) e recuperação de senha
- Multi-tenant e RLS por organização — o schema é preparado, as policies por tenant vêm depois
- Fila e cache distribuídos

## Requisitos funcionais

### Estrutura e tooling

| ID    | Requisito          | Descrição                                                      |
| ----- | ------------------ | -------------------------------------------------------------- |
| RF-01 | Monorepo           | Turborepo com workspaces `apps/*` e `packages/*`               |
| RF-02 | API NestJS         | `apps/api` com módulos, DI e validação, organizado por domínio |
| RF-03 | Cliente Vite       | `apps/app` como SPA React.js + Vite, tipado, com Tailwind      |
| RF-04 | Docs Next.js       | `apps/docs` em App Router, funcionando                         |
| RF-05 | Tasks do Turborepo | `dev`, `build`, `lint`, `check-types`, `test`, `test:e2e`      |
| RF-06 | Formatação         | Prettier com `format` e `format:check`                         |

### Dados e autenticação

| ID    | Requisito           | Descrição                                                                     |
| ----- | ------------------- | ----------------------------------------------------------------------------- |
| RF-07 | Supabase local      | Docker Compose com Postgres, Auth e Storage, sob `infra:up`                   |
| RF-08 | Schema e migrations | Estrutura versionada, aplicada por `db:migrate`, com `db:reset`               |
| RF-09 | RLS                 | Policies habilitadas no schema inicial, com testes que verificam o isolamento |
| RF-10 | Auth base           | Cadastro e login com hash Bcrypt; senhas nunca em texto plano                 |
| RF-11 | Validação de env    | Schema Zod falhando no boot se variáveis obrigatórias estiverem ausentes      |

### Observabilidade

| ID    | Requisito           | Descrição                                                               |
| ----- | ------------------- | ----------------------------------------------------------------------- |
| RF-12 | Logs estruturados   | JSON com `requestId` e `userId`; erros de fronteira sempre com contexto |
| RF-13 | Correlação          | `requestId` propagado do cliente até a API e serviços downstream        |
| RF-14 | Stack LGTM          | Grafana, Loki, Tempo e Mimir locais, com dashboards mínimos             |
| RF-15 | Métricas de negócio | Contadores e histogramas nos caminhos críticos                          |

### Design system

| ID    | Requisito           | Descrição                                                                         |
| ----- | ------------------- | --------------------------------------------------------------------------------- |
| RF-16 | shadcn inicializado | `packages/ui` com shadcn/ui e TailwindCSS 4, `components.json` válido             |
| RF-17 | Tokens mapeados     | Cores de `DESIGN.md` expostas como tokens do Tailwind                             |
| RF-18 | Componentes base    | button, input, label, card, dialog, dropdown-menu, select, table, toast, skeleton |
| RF-19 | Boilerplate limpo   | Sem `alert()` de demo, sem prop `appName`, sem UTM hardcoded                      |
| RF-20 | Acessibilidade      | Variantes e estados conformes a WCAG AA, testadas                                 |

### Qualidade

| ID    | Requisito            | Descrição                                                                      |
| ----- | -------------------- | ------------------------------------------------------------------------------ |
| RF-21 | Testes unitários     | Vitest cobrindo regras de domínio e casos de uso                               |
| RF-22 | Testes de integração | Casos de uso com repositório mockado                                           |
| RF-23 | Testes E2E           | Playwright com `webServer` subindo a aplicação, sem `dev` manual               |
| RF-24 | Qualidade do runner  | Falha proposital é detectada e reportada com código de saída diferente de zero |

## Requisitos não-funcionais

| ID     | Requisito             | Descrição                                                                |
| ------ | --------------------- | ------------------------------------------------------------------------ |
| RNF-01 | Determinismo          | Versões fixadas, sem `^` em produção; build reproduzível                 |
| RNF-02 | Tipagem estrita       | `strict` e `noUncheckedIndexedAccess` em todos os workspaces             |
| RNF-03 | Acessibilidade        | WCAG AA em todos os componentes; navegação por teclado completa          |
| RNF-04 | Responsividade        | Mobile-first, validado de 320px a 2560px                                 |
| RNF-05 | Performance de build  | Cache do Turborepo functioning; `dev` com HMR em ambos os apps           |
| RNF-06 | Segurança             | RLS habilitado por padrão; segredos apenas por env; Bcrypt para senhas   |
| RNF-07 | Observabilidade       | Toda requisição produz log correlacionado; erro não some silenciosamente |
| RNF-08 | Acessibilidade da API | Health check, erros padronizados e sem stack trace em resposta           |

## Critérios de aceite

### Estrutura

- [ ] `npm run dev` sobe `apps/api`, `apps/app` e `apps/docs` sem erro
- [ ] `npm run build` passa em todos os workspaces
- [ ] `npm run lint` passa sem warnings
- [ ] `npm run check-types` passa sem erros
- [ ] `npm run format:check` não reporta divergências

### API

- [ ] `GET /health` responde 200 com status do serviço
- [ ] `GET /api/v1/ping` responde JSON com mensagem de pong
- [ ] Requisição sem token válido responde 401
- [ ] Erro de validação responde 400 com lista de campos, sem stack trace

### Dados e auth

- [ ] `npm run infra:up` sobe Postgres, Auth, Storage e LGTM; `infra:down` derruba
- [ ] `npm run db:migrate` aplica migrations; `db:reset` recria do zero
- [ ] Cadastro cria usuário com senha hasheada; a senha não aparece em log nem em resposta
- [ ] Teste demonstra que RLS bloqueia leitura entre organizações distintas

### Observabilidade

- [ ] Cada requisição gera um log JSON com `requestId` presente
- [ ] O mesmo `requestId` aparece nos logs da API e do serviço chamado
- [ ] `npm run infra:logs` acompanha os logs da stack
- [ ] Grafana exibe ao menos um dashboard com logs e métricas da API

### Design system

- [ ] `packages/ui` tem `components.json` válido e compila com Tailwind
- [ ] Tokens de `DESIGN.md` acessíveis como classes do Tailwind
- [ ] Os 10 componentes base renderizam com todos os estados
- [ ] Nenhum componente contém `alert()` de demo ou UTM de template
- [ ] Auditoria de acessibilidade passa nos componentes base

### Qualidade

- [ ] `npm run test` passa com cobertura de `domain` e `application`
- [ ] `npm run test:e2e` passa sem `npm run dev` rodando previamente
- [ ] Quebrar um teste propositalmente faz `npm run test` falhar com código de saída não zero

## Impacto técnico

### Arquivos afetados

| Caminho                                | Ação   | Descrição                                              |
| -------------------------------------- | ------ | ------------------------------------------------------ |
| `package.json`                         | modify | Tasks de teste, `format:check`, `infra:*`, `db:*`      |
| `turbo.json`                           | modify | Tasks `test` e `test:e2e`; inputs de env               |
| `apps/web/`                            | delete | Boilerplate Next.js substituído por `apps/app`         |
| `apps/app/`                            | create | Cliente React + Vite + Tailwind                        |
| `apps/api/`                            | create | API NestJS em camadas                                  |
| `apps/api/src/modules/{domain}/`       | create | Módulos por domínio                                    |
| `apps/api/src/shared/`                 | create | Logging, config, filtros de erro                       |
| `apps/docs/`                           | modify | Ajustes de lint e tipos para conviver com o novo setup |
| `packages/ui/`                         | modify | shadcn + Tailwind; remover resíduos de boilerplate     |
| `packages/ui/components.json`          | create | Configuração do shadcn CLI                             |
| `packages/typescript-config/node.json` | create | Preset Node para o backend                             |
| `docker-compose.yml`                   | create | Supabase local + LGTM                                  |
| `supabase/migrations/`                 | create | Migrations versionadas                                 |
| `supabase/tests/`                      | create | Testes de RLS                                          |
| `packages/ui/src/**/*.test.tsx`        | create | Testes unitários de componentes e variantes            |
| `apps/app/e2e/`                        | create | Testes Playwright                                      |
| `.github/workflows/ci.yml`             | create | Pipeline: lint, tipos, testes, build                   |

### Dependências

**Runtime** — Node.js >= 24, npm 11.12.1

**API** — `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `class-validator`, `class-transformer`, `bcrypt`, `zod`, `@supabase/supabase-js`, `reflect-metadata`, `rxjs`

**Cliente** — `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tanstack/react-query`, `@tanstack/react-table`, `date-fns`

**Design system** — `@radix-ui/*` (via shadcn), `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`

**Qualidade** — `vitest`, `@vitest/coverage-v8`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `@playwright/test`, `supertest`, `eslint-plugin-only-warn`, `prettier`

**Infra** — `supabase` CLI, Docker Compose

## Plano de implementação

Cada etapa é um commit. Todas as verificações de [QA.md](../.docs/QA.md) passam ao fim de cada uma.

### Etapa 1 — Baseline e scripts

Consolidar o que existe, remover resíduos e alinhar os comandos à documentação.

```bash
npx turbo run build lint check-types
```

- Adicionar `format:check` e tasks `test`/`test:e2e` a `turbo.json`
- Remover o script quebrado `generate:component` de `packages/ui` (invoca `turbo gen` inexistente)
- Documentar o comportamento do `only-warn` em QA.md

### Etapa 2 — Design system

- Inicializar shadcn/ui em `packages/ui` com TailwindCSS 4
- Mapear os tokens de `DESIGN.md` para o Tailwind
- Adicionar os 10 componentes base
- Remover `alert()` e prop `appName` de `Button`; remover UTM e corrigir URL de `Card`
- Testes unitários de variantes e estados

### Etapa 3 — Infraestrutura local

```bash
npm run infra:up
npm run db:migrate
```

- `docker-compose.yml` com Postgres, Auth, Storage e LGTM
- Scripts `infra:up`, `infra:down`, `infra:logs`
- Validar env com Zod, falhando no boot se incompleto

### Etapa 4 — API NestJS

- Criar `apps/api` com arquitetura em camadas: `domain`, `application`, `infrastructure`, `interface`
- Preset `node` em `@repo/typescript-config`
- `shared/`: config, logger estruturado, filtro de erro padronizado
- `GET /health` e `GET /api/v1/ping`
- Testes unitários dos casos de uso e de integração com repositório mockado

### Etapa 5 — Dados e autenticação

- Schema inicial com RLS habilitado desde a primeira migration
- Policies por organização, com testes em `supabase/tests` comprovando isolamento
- Cadastro e login com Bcrypt
- `db:migrate` e `db:reset`

### Etapa 6 — Observabilidade

- Logger JSON com `requestId` e `userId`
- Middleware de correlação no cliente e na API
- Dashboards mínimos no Grafana; métricas de negócio
- Teste de integração confirmando propagação do `requestId`

### Etapa 7 — Cliente React + Vite

- Remover `apps/web`; criar `apps/app` com Vite e TypeScript
- Tailwind consumindo os tokens de `packages/ui`
- TanStack Query configurado com o base URL da API
- `requestId` gerado e propagado em cada requisição
- Tela de status consumindo `GET /health` e `GET /api/v1/ping`

### Etapa 8 — Testes E2E

```bash
npx playwright install
npm run test:e2e
```

- Playwright com `webServer` subindo API e cliente automaticamente
- Fluxos: saúde da aplicação, autenticação, propagação de `requestId`
- Validar que falha proposital é detectada

### Etapa 9 — Validação final

```bash
npm run lint
npm run check-types
npm run test
npm run test:e2e
npm run build
npm run format:check
```

### Etapa 10 — ADR de consequências

Registrar em `.adrs/` as decisões tomadas durante a implementação que não estavam previstas aqui: estratégia de migrations, escolha de biblioteca de métricas, padrão de correlação.

## Riscos e ressalvas

| Risco                                                          | Probabilidade | Impacto    | Mitigação                                                                                     |
| -------------------------------------------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Escopo amplo demais para uma spec                              | `high`        | `high`     | Etapas independentes e committáveis; a API e o cliente não dependem um do outro para compilar |
| Migração de `apps/web` para `apps/app` perde configuração útil | `medium`      | `medium`   | Extrair o que serve (fontes, tokens) antes de remover; commit por etapa                       |
| Supabase CLI exige Docker em Windows                           | `medium`      | `medium`   | Validar Docker no início da Etapa 3, antes de construir schema em cima                        |
| RLS correta em testes e errada em produção                     | `medium`      | `high`     | Testes de RLS rodam no CI contra o mesmo schema das migrations                                |
| TanStack Query e Vite exigem configuração específica de SSR    | `low`         | `low`      | Cliente é SPA, sem SSR — não aplicar padrões de SSR do Next.js                                |
| Playwright falha por porta ocupada                             | `medium`      | `medium`   | Usar `webServer`; não depender de `dev` manual                                                |
| Cache do Turborepo mascarar falha                              | `medium`      | `medium`   | Validar com `--force` antes de concluir                                                       |
| `only-warn` mascara erros como warnings                        | `high`        | `low`      | Documentado em QA.md; o build continua falhando por `--max-warnings 0`                        |
| Credenciais de Supabase versionadas por engano                 | `low`         | `critical` | `.env.example` versionado, `.env` no gitignore, verificação no CI                             |
| LGTM pesada em máquinas modestas                               | `medium`      | `low`      | Profiles no Compose; `infra:up` sobe só o necessário para a tarefa                            |

## Referências

- [ADR 0001 — Estado-alvo da stack](../.adrs/0001-estado-alvo-da-stack.md)
- [ARCHITECTURE.md](../.docs/ARCHITECTURE.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [DESIGN_SYSTEM.md](../.docs/DESIGN_SYSTEM.md)
- [QA.md](../.docs/QA.md)
- [RULES.md](../.docs/RULES.md)
- [Skill `supabase-postgres-best-practices`](../.agents/skills/supabase-postgres-best-practices) — obrigatória nas Etapas 3 e 5
