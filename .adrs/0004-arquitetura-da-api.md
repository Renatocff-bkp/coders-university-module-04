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

| Alternativa | Motivo para descartar |
| ----------- | ---------------------- |
| Express puro com controllers manuais | Perde DI/modules do Nest; sem ganho para o escopo atual |
| Next.js API routes | Mistura camada de framework no app de cliente; pré-requisito é SPA Vite separada |
| `ValidationPipe` default sem `exceptionFactory` | Erros NestJS default não traçam contrato uniforme |

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
