# Plano — 000-foundation, Etapa 3 (infraestrutura local)

- **Spec:** [.specs/000-foundation.md](../../.specs/000-foundation.md)
- **Plano anterior:** [000-foundation-plan.md](./000-foundation-plan.md) (Etapas 1 e 2)
- **Escopo desta execução:** Etapa 3 apenas
- **Data:** 2026-10-28

## Objetivo

Deixar a infraestrutura local executável por comando: Supabase (Postgres, Auth, Storage, Studio) e stack LGTM (Grafana, Loki, Tempo, Mimir), com validação de env em Zod e scripts `infra:*` / `db:*`.

## Estado verificado

| Item                                             | Resultado                                                         |
| ------------------------------------------------ | ----------------------------------------------------------------- |
| Etapas 1 e 2                                     | Concluídas — `turbo run lint check-types test test:e2e build` 9/9 |
| `format:check`                                   | Limpo                                                             |
| Node ativo                                       | v24.15.0 / npm 11.12.1 (após `nvm use 24.15.0`)                   |
| Docker CLI                                       | 29.8.0, Compose v5.5.1                                            |
| Docker daemon                                    | **Parado** — `com.docker.service` está `Stopped`/`Manual`         |
| Supabase CLI                                     | 2.122.0 disponível via `npx`; não instalado no projeto            |
| Portas 3000/3001                                 | Ocupadas por `apps/web` e `apps/docs`                             |
| Portas 3002, 3100, 3200, 5432, 9009, 54321–54324 | Livres                                                            |
| Diff pendente                                    | 19 modificados, 5 removidos, sem ruído de CRLF                    |

## Decisões (feature-concept)

| Pergunta              | Decisão                                                         |
| --------------------- | --------------------------------------------------------------- |
| Orquestração Supabase | CLI `supabase start`; `docker-compose.yml` só para o LGTM       |
| Validação de env      | `packages/env` (`@repo/env`) com Zod, `loadEnv()` e testes      |
| Escopo do LGTM        | Quatro serviços no `infra:up`; `infra:up:core` sem Tempo/Mimir  |
| Baseline de commits   | `docs:` primeiro, `feat(ui):` depois; Etapa 3 em commit próprio |

## Pré-requisitos manuais

1. **Iniciar o Docker Desktop** — sem o daemon, nenhum passo de infra valida.
   - `Start-Service com.docker.service` (pode exigir administrador) **ou** abrir `C:\Program Files\Docker\Docker\Docker Desktop.exe`.
   - Confirmar com `docker info`.
2. Primeira execução baixa as imagens do Supabase (~1,5 GB) e do LGTM (~1 GB).

## Commits de baseline (antes da Etapa 3)

### Commit 1 — `docs: add architecture decisions, specs and agent workflow skills`

Arquivos: `.docs/`, `.specs/`, `.adrs/`, `.agents/`, `skills-lock.json`, `AGENTS.md`.

### Commit 2 — `feat(foundation): align tooling, add commitlint and establish design system`

Arquivos: `.prettierrc`, `.prettierignore`, `.gitignore`, `commitlint.config.mjs`, `.husky/`, `package.json`, `package-lock.json`, `turbo.json`, `packages/ui/**`, `packages/eslint-config/**`, `packages/typescript-config/**`, `apps/docs/**`, `apps/web/**`.

Etapas 1 e 2 entram juntas porque `package.json` e `package-lock.json` têm mudanças das duas, e separá-las exigiria editar hunks.

O `commitlint` entra aqui, e não na Etapa 3: ele é ferramenta de baseline e precisa estar ativo **antes** dos dois commits, para validar as próprias mensagens. Configuração: [`commitlint.config.mjs`](../../commitlint.config.mjs) + hook `.husky/commit-msg` (`npx --no -- commitlint --edit "$1"`).

---

## Etapa 3 — passos

### 3.1 Instalar o Supabase CLI como dependência

```bash
npm install -D -E supabase@2.122.0
```

Motivo: `npx supabase@latest` resolveria a versão em tempo de execução, violando RNF-01 (determinismo). Como devDependency, a versão fica no `package-lock.json`.

### 3.2 Inicializar o Supabase local

```bash
npx supabase init
```

Gera `supabase/config.toml` e o diretório `supabase/`. Portas padrão: API `54321`, Postgres `54322`, Studio `54323`, Inbucket `54324`.

Ajustes em `config.toml`:

- `project_id = "coder-university"` (legível, sem espaço)
- Manter as portas padrão — todas livres

`supabase/migrations/` **não** recebe migration nesta etapa; o schema é a Etapa 5.

### 3.3 Stack LGTM — `docker-compose.yml` na raiz

| Serviço | Imagem            | Portas                      | Profile |
| ------- | ----------------- | --------------------------- | ------- |
| Grafana | `grafana/grafana` | `3003:3000`                 | —       |
| Loki    | `grafana/loki`    | `3100:3100`                 | —       |
| Tempo   | `grafana/tempo`   | `3200:3200`, `4317`, `4318` | `full`  |
| Mimir   | `grafana/mimir`   | `9009:9009`                 | `full`  |

**Grafana em 3003, não 3000:** `apps/web` já usa 3000. `3002` fica reservada para a API (Etapa 4).

Tags das imagens: resolver a última versão estável de cada uma no momento da implementação e **fixar a tag exata** (sem `latest`). Registrar as tags no ADR.

Configurações em `infra/observability/`:

```
infra/observability/
├── grafana/provisioning/datasources/datasources.yml  # Loki, Tempo, Mimir
├── loki/loki.yaml
├── tempo/tempo.yaml
└── mimir/mimir.yaml                                  # modo monolítico, storage filesystem
```

Volumes nomeados para persistência: `grafana-data`, `loki-data`, `tempo-data`, `mimir-data`.

### 3.4 `packages/env` — validação com Zod

```
packages/env/
├── package.json        # name @repo/env, build tsc --build, test vitest run
├── tsconfig.json       # estende @repo/typescript-config/base
├── eslint.config.mjs   # estende @repo/eslint-config/base
└── src/
    ├── index.ts
    ├── server.ts
    └── server.test.ts
```

`serverEnvSchema` cobre: `NODE_ENV`, `PORT`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`.

`loadEnv(source = process.env)`:

- falha com erro que **nomeia cada variável inválida**
- aplica defaults (`NODE_ENV=development`, `PORT=3002`)
- não imprime valores de segredo na mensagem

Empacotamento igual ao `@repo/ui`: `exports` apontam para `dist/`, `build` com `tsc --build`. A API consome em runtime já compilado.

**Desvio:** instala `vitest` nesta etapa, antes da Etapa 4. Sem runner, o requisito "testável" de `packages/env` não se cumpre e `npm run test` continua inerte. A dependência já está prevista na spec; só muda o momento.

### 3.5 `.env.example`

```dotenv
NODE_ENV=development
PORT=3002

SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<imprimir com npm run infra:status>
SUPABASE_SERVICE_ROLE_KEY=<imprimir com npm run infra:status>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

VITE_API_URL=http://localhost:3002
```

`.env` já está no `.gitignore`. Nenhuma chave real é versionada.

### 3.6 Scripts na raiz

```json
{
  "infra:up": "docker compose --profile full up -d && supabase start",
  "infra:up:core": "docker compose up -d && supabase start",
  "infra:up:full": "npm run infra:up",
  "infra:down": "supabase stop && docker compose --profile full down",
  "infra:logs": "docker compose --profile full logs -f",
  "infra:status": "supabase status",
  "infra:health": "node scripts/infra-health.mjs",
  "db:migrate": "supabase migration up",
  "db:reset": "supabase db reset"
}
```

`scripts/infra-health.mjs` usa `fetch` nativo e falha com código ≠ 0 se algum endpoint não responder:

| Serviço | Endpoint                           |
| ------- | ---------------------------------- |
| Grafana | `http://localhost:3003/api/health` |
| Loki    | `http://localhost:3100/ready`      |
| Tempo   | `http://localhost:3200/ready`      |
| Mimir   | `http://localhost:9009/ready`      |

### 3.7 ADR 0003

`.adrs/0003-supabase-cli-e-lgtm-em-compose.md` registra:

- Supabase local pelo CLI, não por compose escrito à mão (desvio da letra da spec)
- LGTM em `docker-compose.yml` na raiz
- Grafana na 3003 para não colidir com `apps/web`
- Tempo/Mimir atrás do profile `full`, com `infra:up:core` como escotilha
- Tags de imagem fixadas

### 3.8 Atualizar documentação

- `.docs/ARCHITECTURE.md` — estado atual: infra local existe
- `.docs/QA.md` — `infra:health` na tabela de verificações
- `.docs/AGENTS.md` — nada a mudar

### 3.9 Verificação

```bash
docker info                       # daemon ativo
npm run infra:up                  # Supabase + LGTM completo
npm run infra:health              # 4/4 endpoints respondem
npm run db:migrate                # sem migrations: no-op bem-sucedido
npm run infra:down                # derruba tudo
docker ps -a --filter name=coder-university  # nenhum container restante
npm run lint
npm run check-types
npm run test
npm run build
npm run format:check
```

Depois: commit `feat(infra): add local Supabase and LGTM stack`.

## Desvios assumidos

| Desvio                                     | Motivo                                                         |
| ------------------------------------------ | -------------------------------------------------------------- |
| `docker-compose.yml` não contém o Supabase | `supabase start` não aceita compose externo; caminho suportado |
| `vitest` instalado na Etapa 3              | Necessário para testar `packages/env`                          |
| Nenhuma migration criada                   | Schema é Etapa 5; `db:migrate` é no-op até lá                  |
| ADR 0003 criado                            | Decisão arquitetural, exigida por RULES.md                     |

## Riscos

| Risco                                        | Mitigação                                                             |
| -------------------------------------------- | --------------------------------------------------------------------- |
| Docker Desktop parado                        | Pré-requisito manual explícito; validar `docker info` antes           |
| Supabase CLI falha no Windows sem WSL2       | Docker Desktop com backend WSL2; validar no primeiro `supabase start` |
| Pull de imagens lento                        | Primeira subida documentada; não é falha                              |
| LGTM consome RAM além do disponível (5,1 GB) | `infra:up:core` sobe só Grafana + Loki                                |
| Grafana 3000 colidir com `apps/web`          | Grafana fixado em 3003                                                |
| Tag de imagem instável                       | Fixar tag exata resolvida no momento da implementação                 |

## Critérios de aceite

- [ ] `npm run infra:up` sobe Postgres, Auth, Storage, Studio e os quatro serviços LGTM
- [ ] `npm run infra:up:core` sobe sem Tempo e Mimir
- [ ] `npm run infra:health` responde 4/4 com código de saída 0
- [ ] `npm run infra:down` não deixa container nem rede órfãos
- [ ] `loadEnv()` falha nomeando a variável ausente e não vaza segredos
- [ ] `npm run test` executa e passa (runner finalmente ativo)
- [ ] `npm run lint`, `check-types`, `build` e `format:check` passam
- [ ] Nenhum `.env` real versionado
