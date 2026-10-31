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
