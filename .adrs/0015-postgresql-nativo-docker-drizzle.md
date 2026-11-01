# 0015. PostgreSQL nativo via Docker e Drizzle migrations

- **Status:** accepted
- **Data:** 2026-11-01
- **Decisores:** Renato Figueredo
- **Spec:** [008-remove-supabase-native-postgresql](../.specs/008-remove-supabase-native-postgresql.md)
- **Substitui:** ADR-0003 (parcialmente), ADR-0005

## Contexto

O Supabase CLI era usado apenas como wrapper de Postgres local e CLI de migrations: a API consome apenas `DATABASE_URL` via Drizzle + `pg`, a autenticação é própria (ADR-0007) e o storage do Supabase não é utilizado. A camada Supabase adicionava `config.toml`, roles, Studio, Auth e Storage sem benefício, além de variáveis de ambiente não consumidas.

## Decisão

- O banco de dados passa a ser um container `postgres:17` gerenciado pelo `docker-compose.yml` (porta `54322`, volume persistente, healthcheck, credenciais `postgres`/`postgres`, db `postgres`).
- As migrations Drizzle vivem em `migrations/` na raiz e são aplicadas por `drizzle-kit migrate` (`db:migrate`).
- A geração de novas migrations usa `drizzle-kit generate` (`db:generate`), gravando em `migrations/` sem prefixo `supabase`.
- Os roles `anon`, `authenticated` e `service_role` são criados por script de init (`infra/postgres/init/01-roles.sql`).
- A extensão `pgTAP` é instalada via imagem customizada (`infra/postgres/Dockerfile`) e habilitada no init.
- O RLS e o helper `app.is_organization_member` são preservados, com testes em `db/tests/rls.sql`.
- Apenas `DATABASE_URL` (e demais vars não-Supabase) compõem o schema de env; `SUPABASE_*` são removidos.

## Alternativas consideradas

| Alternativa                                  | Por que não foi escolhida                                                         |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| Manter Supabase CLI como wrapper de Postgres | Adiciona camadas não utilizadas (Auth, Storage, Studio) e variáveis de env mortas |
| Postgres instalado no host                   | Perde reprodutibilidade e paridade com Docker Compose                             |
| Imagem `supabase/postgres`                   | Reintroduz componentes Supabase desnecessários                                    |

## Consequências

### Positivas

- Stack mais simples: apenas Postgres + LGTM no Compose.
- Migrations e reset determinísticos via Docker + Drizzle.
- RLS e testes de isolamento preservados.

### Negativas

- Init scripts só rodam no primeiro boot; `db:reset` deve derrubar o volume antes de subir.
- Imagem customizada precisa ser construída localmente na primeira execução.

### Neutras / riscos aceitos

- Porta `54322` mantida para compatibilidade com `DATABASE_URL` existente.

## Referências

- [008-remove-supabase-native-postgresql](../.specs/008-remove-supabase-native-postgresql.md)
- [docker-compose.yml](../../docker-compose.yml)
- [drizzle.config.ts](../../apps/api/drizzle.config.ts)
