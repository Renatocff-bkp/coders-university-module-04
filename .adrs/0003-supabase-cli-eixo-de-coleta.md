# 0003. Supabase CLI, stack LGTM em Compose e Grafana Alloy

- **Status:** superseded by ADR-0015
- **Data:** 2026-10-29
- **Decisores:** Renato Figueredo
- **Spec:** [000-foundation](../.specs/000-foundation.md) — Etapa 3

## Contexto

A fundação exigia infraestrutura local executável: banco/auth/storage via Supabase, além de uma stack de observabilidade (logs, métricas, traces) que existisse desde o primeiro dia de desenvolvimento.

O template do monorepo não tinha nenhuma dessas peças, e a spec original apontava três caminhos possíveis para a stack de logs.

## Decisão

- O **Supabase CLI** (`supabase` 2.122.0) é a fonte da verdade para migrations (`supabase/migrations/`), schema e aplicações locais (`supabase start`, `supabase migration up`, `supabase db reset`).
- O **Docker Compose** fica apenas com a stack de observabilidade local (Grafana, Loki, Tempo, Mimir, **Alloy**), com profiles e tags exatas.
- O **Grafana Alloy** é o único coletor ativo: recebe logs via Loki push (`:3101/loki/api/v1/push`), traces e métricas OTLP via gRPC/HTTP (`:4317/:4318`) e reencaminha para Loki, Tempo e Mimir.
- Grafana provisiona datasources (Loki, Tempo, Mimir) e o dashboard `api-overview` com queries sobre logs, métricas de requisição e `ping_total`.

## Alternativas consideradas

| Alternativa                                        | Motivo para descartar                                                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pino-loki` como dependência                       | Envia por HTTP para Loki, mas exigia sink próprio ou agente; Alloy mantém o agente como componente versionado e operável |
| Loki via Promtail/agente embutido no host          | O agente via Alloy centraliza o protocolo OTLP/Loki que o OTLP SDK da API já fala, sem processamento customizado         |
| Datadog como backend de logs                       | Exige conta/provedor externo; a fundação é local e auto-hospedada                                                        |
| Prometheus + Promtail (stack open-source clássica) | Tem duas opções de agente; Alloy unifica OTLP + Loki e deixa o Prometheus como destino apenas de métricas                |

## Consequências

### Positivas

- Um único agente coletor para traces/metrics/logs; a API só fala OTLP e Pino push.
- Dashboard de Grafana com as três fontes, sem configuração manual pós-subida.
- Supabase CLI versionado com pin determinístico.

### Negativas / riscos aceitos

- Stack LGTM mais pesada que Promtail+Prometheus; mitigada com profile `infra:up:core` (sem Tempo/Mimir).
- Versões exatas fixadas (`Grafana 13.3.0`, `Loki 3.7.9`, `Tempo 2.10.0`, `Mimir 3.2.3`, `Alloy v1.21.3`) porque schema do Tempo 3.1.1 é incompatível com o uso de ingester/compactor.

## Referências

- [000-foundation § Etapa 3](../.specs/000-foundation.md)
- [docker-compose.yml](../../docker-compose.yml)
- [Alloy](../../infra/observability/alloy/config.alloy)
- [scripts/infra-health.mjs](../../scripts/infra-health.mjs)

---

# 0004. API NestJS, validação de ambiente e formato de erro

- **Status:** accepted
- **Data:** 2026-10-29
- **Decisores:** Renato Figueredo
- **Spec:** [000-foundation](../.specs/000-foundation.md) — Etapa 4

## Contexto

A spec exige uma API REST NestJS com arquitetura em camadas, validação de variáveis de ambiente com Zod, erros padronizados sem stack trace, `requestId` em todo log/resposta e testes de integração HTTP.

Sem um contrato HTTP estável para as features de auth da spec 001–006, qualquer endpoint novo aumentaria o risco de quebra retroativa.

## Decisão

- API NestJS 11 (`@nestjs/*` 11.2.8, `@nestjs/cli` 11.0.24) com arquitetura modular: `modules/{health|ping|auth|...}` e `shared/{config|logging|http|observability|database}`.
- `GET /health` fora do prefixo e `GET /api/v1/ping` como contratos de borda.
- Erros padronizados: `HttpExceptionFilter` com `code`, `message`, `fields` (quando houver) e `requestId`; sem stack trace no corpo.
- Validação: `ValidationPipe` com `whitelist`, `forbidNonWhitelisted` e `exceptionFactory` que produz `VALIDATION_ERROR` com lista de campos.
- Environment via Zod em `@repo/env`; falha no boot nomeando variáveis ausentes sem imprimir valores.
- CORS restrito ao cliente local e `x-request-id` exposto na resposta.

## Alternativas consideradas

| Alternativa                                     | Motivo para descartar                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Express puro com controllers manuais            | Perde DI/modules do Nest; sem ganho para o escopo atual                          |
| Next.js API routes                              | Mistura camada de framework no app de cliente; pré-requisito é SPA Vite separada |
| `ValidationPipe` default sem `exceptionFactory` | Erros NestJS default não traçam contrato uniforme                                |

## Consequências

### Positivas

- Contrato HTTP estático para as features de auth da 001–006.
- Erros de validação e negócio com contexto (`requestId`) para logs e clientes.

### Negativas / riscos aceitos

- `exceptionFactory` customizado aumenta um pouco o código de validação; aceito pelo contrato.

## Referências

- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [apps/api/src/app.ts](../../apps/api/src/app.ts)
- [apps/api/src/shared/http](../../apps/api/src/shared/http)

---

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

---

# 0006. Pipeline de observabilidade e correlação de logs/traces/métricas

- **Status:** accepted
- **Data:** 2026-10-30
- **Decisores:** Renato Figueredo
- **Spec:** [000-foundation](../.specs/000-foundation.md) — Etapa 6

## Contexto

A fundação exige observabilidade desde o primeiro dia: logs estruturados com `requestId`, métricas de negócio e histograma de latência, traces HTTP e dashboards no Grafana.

## Decisão

- **Pino** via `nestjs-pino` com JSON, `level` configurável (`LOG_LEVEL`), `base.service`, redaction de headers sensíveis, `genReqId` a partir do header `x-request-id` e `customProps` com `requestId`/`userId`.
- Middleware de `x-requestId`: aceita valor seguro ou gera UUID; devolve header na resposta.
- **OpenTelemetry** (`@opentelemetry/sdk-node` 0.300.0) iniciado antes do import do app para instrumentar HTTP/Express; exporters OTLP para Tempo e Mimir; métricas `ping_total`, `http_requests_total` e `http_request_duration_seconds`.
- **Grafana Alloy** reenvia OTLP → Tempo/Mimir e logs Pino → Loki.
- Logs via stream customizado que faz batch e push para `/loki/api/v1/push`; falhas não devem quebrar o path da request.
- No `NODE_ENV=test`, o sink é in-memory.

## Alternativas consideradas

| Alternativa                       | Motivo para descartar                                                 |
| --------------------------------- | --------------------------------------------------------------------- |
| `pino-loki` npm package           | Dependência adicional e sink HTTP simples; Alloy centraliza OTLP+Loki |
| Datadog/OTEL collector externo    | Stack local é requisito da fundação                                   |
| Só Prometheus (métricas) + stdout | Sem traces/logs centralizados; dashboards exigem agregador            |

## Consequências

### Positivas

- Correlação `requestId` → trace (`traceId`/`spanId`) → log → métricas por `route`/`status_code`.
- Pipeline único (Alloy) com três destinos validados localmente (Loki labels `service_name=api`, Mimir métricas `http_*`, Tempo traces).

### Negativas / riscos aceitos

- OTLP exporters e Alloy exigem validação manual de versões (ex.: Tempo 3.1.1 rejeita configuração de ingester); fixado em 2.10.0.
- Batching Loki com timer; entrega eventual no default de 2s.

## Referências

- [pino-options](../../apps/api/src/shared/logging/pino-options.ts)
- [telemetry](../../apps/api/src/shared/observability/telemetry.ts)
- [Alloy](../../infra/observability/alloy/config.alloy)
- [dashboard](../../infra/observability/grafana/dashboards/api-overview.json)
