# 0005. Drizzle ORM, migrações e estratégia de RLS

- **Status:** superseded by ADR-0015
- **Data:** 2026-10-30
- **Decisores:** Renato Figueredo
- **Spec:** [000-foundation](../.specs/000-foundation.md) — Etapa 5

## Contexto

A API precisa persistir usuários, sessões, tokens e dados de organização com isolamento por organização, usando migrations versionadas e RLS no Postgres.

## Decisão

- **Drizzle ORM** (0.45.4) + **Drizzle Kit** (0.31.11) sobre driver `pg`; tipos exportados no schema.
- Migrations geradas por `drizzle-kit generate` com prefixo `supabase`, escritas em `supabase/migrations/`, aplicadas via `supabase migration up`.
- RLS habilitado em todas as tabelas; helper `security definer` `app.is_organization_member(uuid)` evita recursão entre policies.
- Políticas para `organizations`, `organization_members` e `projects` usando `app.current_user_id`.
- Tabela de exemplo `projects`; `db:test` com pgTAP (`supabase/tests/rls.sql`) provando isolamento entre duas organizações.

## Alternativas consideradas

| Alternativa                                  | Motivo para descartar                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| SQL ad-hoc manual sem migrations versionadas | Perde rastreabilidade e reprodutibilidade                                                  |
| Prisma                                       | Stack diferente da decisão de arquitetura; custo de abstração não justificado              |
| RLS com policies recíprocas entre tabelas    | Recursão entre `organizations` e `organization_members`; helper `security definer` resolve |

## Consequências

### Positivas

- Migração versionada e reprodutível; `db:reset` valida caminho do zero.
- Isolamento por organização com teste automatizado.

### Negativas / riscos aceitos

- Dupla fonte de verdade (Drizzle schema + SQL gerado) até a adoção completa da 001; mitigada pela pipeline gerar→aplicar.

## Referências

- [schema](../../apps/api/src/shared/database/schema.ts)
- [migration](../../supabase/migrations/20261030211428_gorgeous_warbird.sql)
- [RLS](../../supabase/migrations/20261030211500_rls.sql)
- [supabase/tests/rls.sql](../../supabase/tests/rls.sql)
