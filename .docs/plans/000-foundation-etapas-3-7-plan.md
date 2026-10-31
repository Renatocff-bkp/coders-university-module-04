# Plano — 000-foundation, Etapas 3 a 7

- **Spec:** [.specs/000-foundation.md](../../.specs/000-foundation.md)
- **Planos anteriores:** [Etapas 1 e 2](./000-foundation-plan.md), [Etapa 3](./000-foundation-etapa-3-plan.md)
- **Escopo desta execução:** Etapas 3, 4, 5, 6 e 7
- **Data:** 2026-10-29
- **Status:** aprovado em 2026-10-29 (escopo 3–7; Etapas 8–10 ficam para a próxima rodada)

## Objetivo

Concluir a fundação executável do monorepo: infraestrutura local, API NestJS, schema/RLS com base de autenticação, observabilidade e cliente React + Vite. As Etapas 8–10 (E2E completo, validação final e ADR de consequências) permanecem fora desta execução, exceto pelos ajustes mínimos necessários para as Etapas 3–7 não deixarem tasks quebradas.

## Decisões confirmadas com o produto

| Tema                    | Decisão                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Supabase local          | `supabase start` via CLI, com `docker-compose.yml` apenas para a stack LGTM                                      |
| Coletor LGTM            | **Grafana Alloy** entre a API e Loki/Tempo/Mimir                                                                 |
| Logs                    | Pino → endpoint Loki push do Alloy → Loki                                                                        |
| Métricas e traces       | OpenTelemetry SDK → OTLP no Alloy → Mimir/Tempo                                                                  |
| Acesso ao banco         | **Drizzle ORM** sobre `pg`                                                                                       |
| Migrations              | Schema Drizzle + `drizzle-kit generate` → SQL em `supabase/migrations/`, aplicado pelo Supabase CLI              |
| Base de auth na Etapa 5 | Schema alvo (`auth_users`, `auth_sessions`, `auth_tokens`), Bcrypt, tokens e serviços testáveis, **sem HTTP/UI** |
| RLS                     | `organizations`, `organization_members` e tabela de exemplo `projects`; isolamento por `app.current_user_id`     |
| Cliente                 | React Router + TanStack Query; `requestId` gerado no cliente e enviado em `x-request-id`                         |
| Idioma                  | Produto, código, mensagens e e-mails em en-US; specs e docs do repositório em pt-BR                              |

## Limites de escopo

- Não implementar cadastro, confirmação, login, esqueci a senha ou reset. Isso pertence às specs 001–006.
- A Etapa 5 entrega a base que a 001 consome. A migration criada aqui é a migration de auth da 001; ao implementar a 001, ela verifica/estende o schema em vez de recriá-lo.
- Não instalar nem configurar o Playwright completo. `test:e2e` continua sem fluxo real até a Etapa 8; a task deve continuar saindo com sucesso quando não houver testes.
- Não criar CI/CD, deploy ou rate limiting.
- Não commitar automaticamente. Há mudanças pré-existentes no worktree e o usuário decide quando fechar a unidade de trabalho.

## Pré-requisitos

- Docker Desktop ativo (`docker info` responde). Validado em 2026-10-29.
- Node 24.15.0 e npm 11.12.1.
- Portas livres: 3000 (app), 3001 (docs), 3002 (API), 3003 (Grafana), 3100 (Loki), 3101 (Loki push via Alloy), 3200 (Tempo), 4317/4318 (OTLP), 9009 (Mimir), 12345 (Alloy UI), 54321–54324 (Supabase).
- Primeira subida baixa imagens do Supabase e do LGTM.

## Etapa 3 — Infraestrutura local

### Entregas

1. `supabase` CLI fixado em `devDependencies` e `supabase/config.toml` inicializado com `project_id = "coder-university"`.
2. `docker-compose.yml` com Grafana, Loki, Tempo, Mimir e **Alloy**, tags exatas, volumes nomeados e profiles:
   - `infra:up` / `infra:up:full`: stack completa.
   - `infra:up:core`: Grafana + Loki + Alloy, sem Tempo/Mimir.
3. Configurações em `infra/observability/`:
   - datasources do Grafana;
   - `loki.yaml`, `tempo.yaml`, `mimir.yaml`;
   - `alloy.alloy` com receiver OTLP, receiver Loki push, exporters para Loki/Tempo/Mimir.
4. `packages/env` (`@repo/env`) com Zod:
   - `loadEnv(source = process.env)`;
   - validação de `NODE_ENV`, `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`;
   - mensagem de erro nomeia variáveis sem imprimir segredos;
   - testes com Vitest.
5. `.env.example` sem segredos reais.
6. Scripts raiz `infra:*`, `db:*`, `db:test` e `scripts/infra-health.mjs`.
7. ADR 0003 — Supabase CLI, LGTM em Compose e Alloy.

### Validação

```bash
docker info
npm run infra:up
npm run infra:health
npm run db:migrate
npm run infra:down
npm run lint
npm run check-types
npm run test
npm run build
npm run format:check
```

## Etapa 4 — API NestJS

### Entregas

1. `apps/api` com NestJS 11, TypeScript 7 e preset `node` em `@repo/typescript-config`.
2. Arquitetura em camadas:
   - `src/modules/health/` — health check;
   - `src/modules/ping/` — recurso de exemplo;
   - `src/shared/config/` — carregamento de env;
   - `src/shared/logging/` — logger estruturado;
   - `src/shared/http/` — filtro de erro, middleware de `requestId` e `ValidationPipe`.
3. `GET /health` fora do prefixo e `GET /api/v1/ping`.
4. Erros padronizados, sem stack trace, com `requestId` e lista de campos em 400.
5. Testes unitários dos casos de uso e integração HTTP com Supertest.
6. CORS restrito ao cliente local e exposição de `x-request-id`.
7. ADR 0004 — arquitetura da API, validação de env e formato de erro (se necessário após a implementação).

### Validação

```bash
npm run dev:api
curl http://localhost:3002/health
curl http://localhost:3002/api/v1/ping
npm run lint
npm run check-types
npm run test -- --filter=api
npm run build
```

## Etapa 5 — Dados, RLS e base de auth

### Entregas

1. Drizzle ORM, Drizzle Kit, `pg` e tipos no `apps/api`.
2. Schema em `apps/api/src/shared/database/schema.ts`:
   - `organizations`, `organization_members`, `projects`;
   - `auth_users` (e-mail único case-insensitive por índice em `lower(email)`), `auth_sessions`, `auth_tokens`;
   - índices de FKs, `token_hash` único, expiração/revogação/uso.
3. Migration gerada em `supabase/migrations/` e aplicada por `db:migrate`.
4. RLS:
   - habilitado em todas as tabelas;
   - `anon`/`authenticated` sem acesso direto às tabelas `auth_*`;
   - policies de `organizations`, `organization_members` e `projects` usando `app.current_user_id`;
   - índices nas colunas usadas pelas policies.
5. Teste de RLS em `supabase/tests/rls.sql` (pgTAP) e script `db:test`; o teste prova que duas organizações não se enxergam.
6. Base de auth sem HTTP:
   - `PasswordHasher` + adapter Bcrypt (custo 12);
   - geração de token opaco de 32 bytes e hash SHA-256;
   - repositórios Drizzle de usuário, sessão e token;
   - serviços de criação/validação/revogação de sessão e emissão/consumo de token;
   - testes unitários com repositórios em memória e teste de integração opcional com banco.
7. `db:reset` recria o banco e reaplica migrations.
8. ADR 0005 — Drizzle, migrations e estratégia de RLS.

### Validação

```bash
npm run infra:up
npm run db:migrate
npm run db:test
npm run test -- --filter=api
npm run db:reset
npm run lint
npm run check-types
npm run build
```

## Etapa 6 — Observabilidade

### Entregas

1. Pino + `nestjs-pino` com JSON, `requestId` e `userId` quando houver.
2. Middleware de correlação:
   - aceita `x-request-id` válido ou gera UUID;
   - devolve o header na resposta;
   - propaga para logs e chamadas downstream.
3. OpenTelemetry:
   - traces HTTP para o Alloy (OTLP);
   - métricas de requisição e contadores de negócio (`ping_total`, `http_requests_total`, histograma de duração);
   - resource `service.name = api`.
4. Alloy configurado para receber OTLP e Loki push, encaminhando para Tempo, Mimir e Loki.
5. Dashboard provisionado no Grafana com logs da API e métricas de requisição/ping.
6. Teste de integração confirmando que o `requestId` enviado pelo cliente aparece na resposta e no contexto do log.
7. ADR 0006 — pipeline de observabilidade e correlação.

### Validação

```bash
npm run infra:up
npm run dev:api
npm run infra:health
npm run test -- --filter=api
npm run lint
npm run check-types
npm run build
```

## Etapa 7 — Cliente React + Vite

### Entregas

1. Remover `apps/web` e criar `apps/app`:
   - Vite 7, React 19, TypeScript 7, Tailwind 4;
   - `@repo/ui`, React Router e TanStack Query.
2. `src/shared/api-client.ts`:
   - base URL via `VITE_API_URL`;
   - gera `x-request-id` por requisição e expõe o header da resposta;
   - tratamento de erro padronizado.
3. `src/shared/query-client.ts` e provider no `main.tsx`.
4. Router:
   - `/` redireciona para `/app`;
   - `/app` exibe tela de status;
   - rota desconhecida volta para `/app`.
5. Tela de status consumindo `GET /health` e `GET /api/v1/ping`, com estados de loading/erro/sucesso, acessível e responsiva.
6. Ajustar `apps/docs` e configurações compartilhadas para o novo workspace.
7. Atualizar `.docs/ARCHITECTURE.md`, `.docs/QA.md` e `.docs/DEVELOPMENT.md` com o estado atual.

### Validação

```bash
npm run dev
npm run build
npm run lint
npm run check-types
npm run test
npm run format:check
```

## Arquivos previstos

| Caminho                                                        | Ação   |
| -------------------------------------------------------------- | ------ |
| `supabase/`                                                    | create |
| `docker-compose.yml`                                           | create |
| `infra/observability/**`                                       | create |
| `scripts/infra-health.mjs`                                     | create |
| `packages/env/**`                                              | create |
| `packages/typescript-config/node.json`                         | create |
| `apps/api/**`                                                  | create |
| `apps/app/**`                                                  | create |
| `apps/web/**`                                                  | delete |
| `supabase/tests/rls.sql`                                       | create |
| `.adrs/0003-*` a `.adrs/0006-*`                                | create |
| `.adrs/README.md`                                              | modify |
| `.docs/ARCHITECTURE.md`, `.docs/QA.md`, `.docs/DEVELOPMENT.md` | modify |
| `.env.example`                                                 | create |
| `package.json`, `package-lock.json`, `turbo.json`              | modify |

## Riscos e mitigações

| Risco                                               | Mitigação                                                                      |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Docker/Supabase indisponível no Windows             | `docker info` validado; `supabase start` testado antes do schema               |
| LGTM pesado                                         | Profile `core` sem Tempo/Mimir; subir stack completa só na Etapa 6             |
| Alloy com configuração incorreta                    | `infra:health` valida Alloy e endpoints; dashboard só é aceito se houver dados |
| Drizzle Kit gerar migration fora do padrão Supabase | Validar nome/timestamp e testar `db:reset` do zero                             |
| RLS recursiva ou permissiva demais                  | Policies simples, teste pgTAP com duas organizações e negação explícita        |
| Base de auth da Etapa 5 divergir da 001             | Schema alvo da 001; 001 consome a migration e só estende o que faltar          |
| Remoção de `apps/web` quebrar docs/build            | Rodar `build` e `check-types` após a troca; preservar fontes/tokens úteis      |
| `test:e2e` sem testes                               | Não instalar Playwright agora; garantir que a task continue saindo com 0       |
| Mudanças pré-existentes no worktree                 | Não commitar nem reverter arquivos alheios; revisar diff antes de editar       |

## Critérios de aceite desta execução

- [ ] `npm run infra:up` sobe Supabase e LGTM completo; `infra:down` derruba sem containers órfãos.
- [ ] `npm run infra:health` responde todos os serviços, incluindo Alloy.
- [ ] `loadEnv()` falha nomeando variáveis e não vaza segredos.
- [ ] `GET /health` e `GET /api/v1/ping` respondem; erros 400 são padronizados e sem stack.
- [ ] `npm run db:migrate` e `npm run db:reset` funcionam; RLS isola organizações.
- [ ] Cadastro via serviço cria usuário com hash Bcrypt e não cria sessão (base da 001).
- [ ] Logs JSON têm `requestId`; o mesmo valor volta no header e aparece no log.
- [ ] Grafana tem dashboard com logs e métricas da API.
- [ ] `npm run dev` sobe API, app e docs; tela `/app` mostra status da API.
- [ ] `npm run lint`, `check-types`, `test`, `build` e `format:check` passam.
- [ ] Nenhum segredo real versionado.

## Consenso desta execução (2026-10-29)

### Escopo

- Executar **somente as Etapas 3–7**. Etapas 8–10 (Playwright/E2E, validação final isolada e ADR de consequências) ficam para a próxima rodada.
- Nenhum código de cadastro/login/confirmação/reset: isso pertence às specs 001–006. A Etapa 5 entrega apenas a base de domínio, persistência, RLS e serviços de auth sem HTTP.
- Mudanças pré-existentes no worktree (`.agents/`, `.specs/001-006`, `.docs/plans/*`) não serão editadas nem revertidas.

### Commits

- Um único commit ao final da execução, com **stage seletivo** apenas dos arquivos da fundação.
- Mensagem em Conventional Commits; trailer `Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>`.
- O push depende de remote configurado; se não houver, reportar em vez de falhar silenciosamente.

### Versões fixadas (RNF-01)

| Pacote                                 | Versão                                  | Motivo                                                               |
| -------------------------------------- | --------------------------------------- | -------------------------------------------------------------------- |
| `@nestjs/*`                            | 11.2.8                                  | Maior documentado em ARCHITECTURE.md (12.x já existe, fora do plano) |
| `@nestjs/cli`                          | 11.0.24                                 | Build/watch com `tsc`, compatível com decorators                     |
| `vite`                                 | 7.3.7                                   | Maior documentado em ARCHITECTURE.md (8.x já existe, fora do plano)  |
| `@vitejs/plugin-react`                 | 5.2.0                                   | Última linha compatível com Vite 7                                   |
| `vitest` / `coverage-v8`               | 5.0.5                                   | Suporta Vite 7 e Node 24                                             |
| `unplugin-swc` / `@swc/core`           | 2.0.0 / 1.16.20                         | Necessário para `emitDecoratorMetadata` nos testes Vitest da API     |
| `drizzle-orm` / `drizzle-kit`          | 0.45.4 / 0.31.11                        | ORM e geração de migrations                                          |
| `supabase` (CLI)                       | 2.122.0                                 | Determinismo (devDependency, não `npx latest`)                       |
| Grafana / Loki / Tempo / Mimir / Alloy | 13.3.0 / 3.7.9 / 3.1.1 / 3.2.3 / 1.21.3 | Tags exatas verificadas nos releases                                 |

### Decisões técnicas adicionais

| Tema           | Decisão                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Testes da API  | Vitest + `unplugin-swc` (o transform padrão não emite metadata de decorators, quebrando a DI do Nest)                            |
| Build da API   | `@nestjs/cli` (`nest build`/`nest start --watch`) em vez de `tsc` puro                                                           |
| Logs para Loki | Pino com destino customizado para o endpoint Loki push do Alloy; sem `pino-loki` se o destino customizado for suficiente         |
| RLS            | Função `security definer` `app.is_organization_member(uuid)` para evitar recursão entre `organizations` e `organization_members` |
| Migrations     | Drizzle Kit gera SQL em `supabase/migrations/`; aplicação via `supabase migration up`                                            |
| `test:e2e`     | Continua sem Playwright; a task deve sair com 0 quando não houver testes                                                         |
| TypeScript     | 7.0.2 nativo; `experimentalDecorators` + `emitDecoratorMetadata` verificados antes de iniciar                                    |

### Critérios de parada

- Se `supabase start` ou as imagens LGTM falharem por ambiente (Docker/WSL2/rede), registrar o bloqueio, entregar o que compila/testa sem infra e reportar explicitamente — sem mascarar a falha.
- Se uma versão fixada se mostrar incompatível, ajustar para o patch mais próximo da mesma major e registrar o desvio no plano e no ADR da etapa.

## Ordem de execução

1. Etapa 3 (infra + env).
2. Etapa 4 (API).
3. Etapa 5 (Drizzle + schema + RLS + auth base).
4. Etapa 6 (Pino/OTel/Alloy/Grafana).
5. Etapa 7 (Vite + app + docs + limpeza).
6. QA completo e relatório final.
7. `/commit-and-push` com stage seletivo.
