# Plano — 001-auth-foundation

- **Status:** refinado (aguardando aprovação antes da implementação)
- **Data:** 2026-10-31
- **Responsável:** Renato Figueredo
- **Spec:** [001-auth-foundation](../.specs/001-auth-foundation.md)

## Contexto

A spec define a base compartilhada de autenticação (usuários, sessões, tokens, e-mail,
Bearer + sessão única) consumida pelas specs 002–006. A dependência técnica principal —
as Etapas 3–7 da `000-foundation` — já foi entregue no commit `ccd3695`.

## Mapeamento estado → spec

| Requisito                             | Estado no repositório | Observação                                                                              |
| ------------------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| RF-01 — Schema auth                   | ✅ Implementado       | Migration + RLS + testes pgTAP                                                          |
| RF-02 — Credenciais/tokens            | ✅ Implementado       | Bcrypt, tokens SHA-256, RF-02 testado                                                   |
| RF-03 — Sessão única                  | ✅ Implementado       | Revogação + uso único; TTL via `SESSION_TTL_DAYS`                                       |
| RF-04 — EmailService                  | ✅ Implementado       | Interface, adapters Mailtrap/Resend, templates en-US, fake adapter                      |
| RF-05 — Guard/Bearer/session endpoint | ✅ Implementado       | Controller `GET /api/v1/auth/session`, guard, prefixo, 401/200, Referrer-Policy         |
| RF-06 — Rotas SPA auth                | ✅ Implementado       | Router `/auth/*`, `/app/*`, bootstrap, redirecionamentos                                |
| RNF-01..RNF-07                        | ⚠️ Parcial            | Segurança ✅; idioma, versionamento, a11y, RMN, testes E2E pendentes conforme critérios |

## Plano de implementação refinado

### Etapa 1 — Schema e domínio (da spec)

- Já executada na fundação. Manter como base; nenhuma ação nova.

### Etapa 2 — Aplicação e sessão (da spec)

- Já executada na fundação. Manter; validar critério "segunda sessão invalida a primeira".

### Etapa 3 — EmailService (próximo)

1. Criar interface `EmailService` no domain (porta) com métodos de template.
2. Implementar adapters: Mailtrap (SMTP sandbox, `NODE_ENV !== "production"`) e Resend (API, `NODE_ENV === "production"`).
3. Templates en-US (confirmação, nova sessão, reset, senha alterada).
4. Testes com adapter falso (sem rede); opcionalmente exercício manual Mailtrap.

### Etapa 4 — API e guard (próximo)

1. Prefixo global `/api/v1` em `main.ts` + `Referrer-Policy: no-referrer`.
2. Controller `GET /api/v1/auth/session` com guard Bearer.
3. Tratar 200 (usuário) / 401 (token inválido/expirado/revogado) no formato padronizado.
4. Testes: 200 com sessão semeada, 401 sem token, 401 com token revogado/expirado.

### Etapa 5 — SPA e rotas (próximo)

1. React Router com layout público (`/auth/*`) e privado (`/app/*`).
2. `AuthProvider` + storage Bearer no `localStorage` + api-client com header `Authorization: Bearer`.
3. Bootstrap consulta `/api/v1/auth/session`; limpa token inválido; redirecionamentos (`/` → `/app` ou `/auth/sign-in`).
4. Home placeholder protegida em `/app`.

### Etapa 6 — Documentação, ADR e QA

1. Criar ADR (auth própria + Bearer + sessão única): `.adrs/0007-auth-propria-e-bearer.md`.
2. Atualizar `DEVELOPMENT.md` (en-US) e `ARCHITECTURE.md` (`/api/v1`).
3. Rodar QA completa: `npm run lint`, `check-types`, `test`, `test:e2e`, `build`, `format:check`.

## Critérios de aceite — status

- [x] `npm run db:migrate` cria tabelas + RLS sem erro (via fundação)
- [x] `auth_users.email` único case-insensitive (via fundação)
- [x] Segunda sessão invalida a primeira (via fundação; validar)
- [ ] `GET /api/v1/auth/session` 401 sem token / 200 com sessão / 401 revogada → **pendente (Etapa 4)**
- [ ] Email adapters/templates funcionando com adapter falso → **pendente (Etapa 3)**
- [ ] SPA rotas/redirecionamentos → **pendente (Etapa 5)**

## Riscos registrados

Token em `localStorage` via XSS (ADR), dependência da foundation (alta), revogação concorrente, RLS, Mailtrap, prefetch de link.

## Próximos passos

1. Aguardar aprovação do usuário sobre este plano.
2. Implementar Etapas 3–6 da spec.
3. QA + entrega via `/commit-and-push`.

## Referências

- [001-auth-foundation spec](../.specs/001-auth-foundation.md)
- [000-foundation plan](../.docs/plans/000-foundation-etapas-3-7-plan.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [RULES.md](../.docs/RULES.md)
