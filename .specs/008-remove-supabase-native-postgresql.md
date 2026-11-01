# 008 — Remove Supabase, use native PostgreSQL

## Metadado

| Campo         | Valor                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| Status        | `refined`                                                              |
| Prioridade    | `high`                                                                 |
| Criado em     | 2026-11-01                                                             |
| Atualizado em | 2026-11-01                                                             |
| Responsável   | Renato                                                                 |
| ADR           | ADR-0015 — PostgreSQL nativo via Docker e Drizzle migrations (a criar) |

## Resumo

Remover a infraestrutura e as configurações do Supabase CLI, substituindo por um container PostgreSQL nativo gerenciado via Docker Compose. A API passa a depender apenas de `DATABASE_URL`, com migrations Drizzle aplicadas por `drizzle-kit migrate`. RLS e os testes pgTAP são preservados sobre o Postgres nativo.

## Contexto

A fundação (spec `000-foundation`) adotou o Supabase CLI como eixo de coleta (ADR-0003): migrations em `supabase/migrations/`, schema e aplicação local via `supabase start`, `supabase migration up`, `supabase db reset`, além de Auth/Storage/Studio. As migrations Drizzle usam prefixo `supabase` (ADR-0005) e gravam em `supabase/migrations/`.

O estado real do código, porém, não usa o Supabase como BaaS:

- A autenticação é própria, com Bearer + sessão única (ADR-0007); não há referência a `@supabase/supabase-js` nem a `SUPABASE_AUTH_*`.
- O storage do Supabase não é usado em nenhum módulo.
- A API consome apenas `DATABASE_URL` via Drizzle ORM + driver `pg` (`apps/api/src/shared/database/database.module.ts`).
- As variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são validadas no env, mas não consumidas por nenhum código de negócio.

O Supabase, portanto, atua apenas como wrapper de Postgres local e CLI de migrations, adicionando `config.toml`, roles, Studio, Auth e Storage sem benefício. Esta spec remove essa camada, mantendo RLS (RNF-06) e os testes de isolamento por organização.

## Escopo

### Dentro do escopo

- Remover o diretório `supabase/` (`config.toml`, `migrations/`, `tests/rls.sql`, `seed.sql`).
- Mover as migrations SQL existentes para `migrations/` na raiz.
- Adicionar serviço `postgres:17` ao `docker-compose.yml` (porta `54322`, volume persistente, healthcheck, credenciais `postgres/postgres`, db `postgres`).
- Criar os roles `anon`, `authenticated` e `service_role` via init/migration, preservando as policies RLS atuais.
- Instalar a extensão `pgTAP` via init script para viabilizar `db:test`.
- Mover/adaptar `supabase/tests/rls.sql` para `db/tests/rls.sql`.
- Atualizar `apps/api/drizzle.config.ts` (`out`, prefixo).
- Remover `SUPABASE_*` do schema de env (`@repo/env`) e dos testes (`vitest.config.mts`, `server.test.ts`).
- Atualizar scripts npm (`infra:*`, `db:*`) e `scripts/infra-health.mjs`.
- Atualizar `infra/observability/grafana/dashboards/api-observability.json` (remover referências a Supabase).
- Atualizar `.docs/ARCHITECTURE.md` e `.docs/QA.md`.
- Criar ADR-0015 e marcar ADR-0003 e ADR-0005 como `superseded`.
- Remover a dependência `supabase` do `package.json` (e entradas do lock).
- Atualizar `.env` e `.env.example`.

### Fora do escopo

- Mudanças no código de negócio da API (auth, etc.) — não usam Supabase.
- Implementação de storage de arquivos (não usado; fora do escopo).
- CI/CD e deploy.
- Reescrita da spec `000-foundation` (mantida como registro histórico).

## Requisitos funcionais

| ID    | Requisito           | Descrição                                                                                     |
| ----- | ------------------- | --------------------------------------------------------------------------------------------- |
| RF-01 | Postgres no Compose | Serviço `postgres:17` no `docker-compose.yml`, porta `54322`, volume persistente, healthcheck |
| RF-02 | Credenciais         | Usuário/senha/db padrão `postgres`/`postgres`/`postgres`; `DATABASE_URL` default inalterado   |
| RF-03 | Migrations          | `db:migrate` executa `drizzle-kit migrate` aplicando `./migrations`                           |
| RF-04 | Geração             | `db:generate` (api) gera novas migrations em `./migrations`                                   |
| RF-05 | Reset               | `db:reset` derruba o volume, sobe o Postgres, aplica migrations (e seed, se houver)           |
| RF-06 | Roles               | Init/migration cria os roles `anon`, `authenticated`, `service_role`                          |
| RF-07 | RLS                 | Policies e RLS habilitados mantidos; helper `app.is_organization_member` preservado           |
| RF-08 | Testes RLS          | `db:test` executa `db/tests/rls.sql` via pgTAP no container Postgres                          |
| RF-09 | pgTAP               | Extensão instalada via init script (primeiro boot) ou imagem customizada                      |
| RF-10 | Env                 | Apenas `DATABASE_URL` (e demais vars não-Supabase); remover `SUPABASE_*` do schema            |
| RF-11 | Scripts             | `infra:up`, `infra:down`, `infra:status`, `infra:health` atualizados para Postgres + LGTM     |
| RF-12 | Health check        | `infra-health.mjs` verifica Postgres via TCP na porta `54322` (substitui Supabase API/Studio) |
| RF-13 | Docs                | `ARCHITECTURE.md` e `QA.md` refletem Postgres nativo                                          |
| RF-14 | ADR                 | Criar ADR-0015; marcar ADR-0003 e ADR-0005 como `superseded by ADR-0015`                      |
| RF-15 | Grafana             | Dashboard `api-observability` sem referências a Supabase nos títulos/labels                   |

## Requisitos não-funcionais

| ID     | Requisito         | Descrição                                                    |
| ------ | ----------------- | ------------------------------------------------------------ |
| RNF-01 | Determinismo      | Versão do Postgres fixada (`postgres:17`)                    |
| RNF-02 | Segurança         | RLS habilitado por padrão; segredos apenas via env           |
| RNF-03 | Reprodutibilidade | `db:reset` recria o banco do zero e reaplica migrations      |
| RNF-04 | Tipagem           | `npm run check-types` passa sem erros                        |
| RNF-05 | Qualidade         | `lint`, `test`, `build`, `format:check` passam               |
| RNF-06 | Observabilidade   | Logs/métricas inalterados; apenas rótulos de dashboard mudam |

## Critérios de aceite

- [ ] `npm run infra:up` sobe Postgres + LGTM sem Supabase
- [ ] `npm run db:migrate` aplica migrations no Postgres nativo
- [ ] `npm run db:reset` recria o banco do zero
- [ ] `npm run db:test` valida RLS (pgTAP)
- [ ] `npm run infra:health` passa incluindo Postgres
- [ ] `.env.example` não contém `SUPABASE_*`
- [ ] `packages/env` não referencia `SUPABASE_*`
- [ ] `apps/api/vitest.config.mts` não referencia `SUPABASE_*`
- [ ] Diretório `supabase/` removido
- [ ] ADR-0015 criado; ADR-0003 e ADR-0005 marcados como superseded
- [ ] `ARCHITECTURE.md` atualizado (stack, estado atual, decisões)
- [ ] `npm run lint`, `check-types`, `test`, `build`, `format:check` passam

## Impacto técnico

### Arquivos afetados

| Arquivo/Caminho                                                 | Ação     | Descrição                                                             |
| --------------------------------------------------------------- | -------- | --------------------------------------------------------------------- |
| `supabase/`                                                     | `delete` | Todo o diretório (config, migrations, tests, seed)                    |
| `migrations/`                                                   | `create` | Mover migrations SQL de `supabase/migrations/`                        |
| `migrations/meta/`                                              | `create` | Mover journal/snapshot do Drizzle                                     |
| `db/tests/rls.sql`                                              | `create` | Mover/adaptar `supabase/tests/rls.sql`                                |
| `db/seed.sql`                                                   | `create` | Seed (pode ficar vazio)                                               |
| `docker-compose.yml`                                            | `modify` | Adicionar serviço `postgres:17` + volume + healthcheck                |
| `infra/postgres/init/`                                          | `create` | Init scripts (roles, pgTAP) montados em `/docker-entrypoint-initdb.d` |
| `apps/api/drizzle.config.ts`                                    | `modify` | `out` → `./migrations` (ajustar path relativo); prefixo default       |
| `apps/api/vitest.config.mts`                                    | `modify` | Remover vars `SUPABASE_*`                                             |
| `packages/env/src/server.ts`                                    | `modify` | Remover `SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY`                      |
| `packages/env/src/server.test.ts`                               | `modify` | Remover refs e casos de teste Supabase                                |
| `package.json`                                                  | `modify` | Scripts `infra:*`/`db:*`; remover dep `supabase`                      |
| `.env`                                                          | `modify` | Remover `SUPABASE_*`                                                  |
| `.env.example`                                                  | `modify` | Remover `SUPABASE_*` e comentário de Supabase                         |
| `scripts/infra-health.mjs`                                      | `modify` | Verificar Postgres via TCP; remover Supabase API/Studio               |
| `infra/observability/grafana/dashboards/api-observability.json` | `modify` | Remover refs Supabase nos títulos/labels/queries                      |
| `.docs/ARCHITECTURE.md`                                         | `modify` | Stack, estado atual, decisões, infraestrutura                         |
| `.docs/QA.md`                                                   | `modify` | Comandos de infra/db                                                  |
| `.adrs/0003-supabase-cli-eixo-de-coleta.md`                     | `modify` | Status → `superseded by ADR-0015`                                     |
| `.adrs/0005-drizzle-migrations-e-rls.md`                        | `modify` | Status → `superseded by ADR-0015`                                     |
| `.adrs/0015-postgresql-nativo-docker-drizzle.md`                | `create` | Novo ADR                                                              |

### Dependências

- **Remover:** `supabase` (2.122.0) do `package.json` e do lock.
- **Adicionar (infra):** imagem Docker `postgres:17`.
- **Manter:** `drizzle-orm`, `drizzle-kit`, `pg`, `@repo/env`.

### Componentes de UI

n/a — mudança de infraestrutura/back-end, sem UI.

## Plano de implementação

### Etapa 1: Postgres no Compose + init scripts

Adicionar serviço `postgres:17` ao `docker-compose.yml` (porta `54322`, volume `postgres-data`, healthcheck `pg_isready`). Criar `infra/postgres/init/` com scripts para criar roles `anon/authenticated/service_role` e instalar `pgTAP`.

```bash
docker compose up -d postgres
```

### Etapa 2: Mover migrations

Mover `supabase/migrations/*` para `migrations/` (incluindo `meta/`). Atualizar `apps/api/drizzle.config.ts` (`out`, remover `prefix: "supabase"`). Validar `drizzle-kit migrate`.

### Etapa 3: Mover testes RLS

Mover `supabase/tests/rls.sql` para `db/tests/rls.sql`. Adaptar roles/grants se necessário (roles agora criados via init). Configurar `db:test` para rodar via `psql`/`pg_prove` no container.

### Etapa 4: Env e testes

Remover `SUPABASE_*` de `packages/env/src/server.ts` e `server.test.ts`. Atualizar `apps/api/vitest.config.mts`. Atualizar `.env` e `.env.example`.

### Etapa 5: Scripts e health check

Atualizar `package.json` (`infra:up`, `infra:down`, `infra:status`, `db:migrate`, `db:reset`, `db:test`, `db:generate`). Atualizar `scripts/infra-health.mjs` (Postgres TCP).

### Etapa 6: Remover Supabase

Remover diretório `supabase/`, dependência `supabase` do `package.json` e entradas do lock. Atualizar `README`/docs de comandos.

### Etapa 7: Docs e ADRs

Atualizar `.docs/ARCHITECTURE.md` e `.docs/QA.md`. Criar ADR-0015. Marcar ADR-0003 e ADR-0005 como `superseded by ADR-0015`.

### Etapa 8: Grafana dashboard

Remover referências a Supabase em `api-observability.json` (títulos/labels/queries).

### Etapa 9: QA final

```bash
npm run lint && npm run check-types && npm run test && npm run build && npm run format:check
```

## Riscos e ressalvas

| Risco                                                            | Probabilidade | Impacto  | Mitigação                                                                       |
| ---------------------------------------------------------------- | ------------- | -------- | ------------------------------------------------------------------------------- |
| Init scripts do pgTAP só rodam no primeiro boot                  | `medium`      | `medium` | `db:reset` deve derrubar o volume (`docker compose down -v`) antes de subir     |
| Mover arquivos de migration quebra o `_journal.json` do Drizzle  | `medium`      | `high`   | Mover `meta/` junto; validar com `drizzle-kit migrate`; regenerar se necessário |
| Roles `anon/authenticated/service_role` inexistentes quebram RLS | `medium`      | `high`   | Criar roles no init script antes de aplicar migrations/policies                 |
| Conflito de porta 54322 com Supabase ainda rodando               | `low`         | `medium` | Garantir `supabase stop`/remover CLI antes de subir o novo container            |
| Testes de RLS dependentes de `set_config('app.current_user_id')` | `low`         | `medium` | Preservar função `app.current_user_id()`; validar no pgTAP                      |
| Divergência docs/código                                          | `medium`      | `medium` | Atualizar ARCHITECTURE.md e QA.md na mesma entrega; ADR-0015 registrado         |

## Referências

- ADR-0003 — Supabase CLI, stack LGTM (a ser superseded)
- ADR-0005 — Drizzle migrations e RLS (a ser superseded)
- ADR-0007 — Auth própria com Bearer
- `.docs/ARCHITECTURE.md`
- `.docs/QA.md`
- `.docs/DEVELOPMENT.md`
- `.specs/000-foundation.md`
- `.adrs/README.md`
