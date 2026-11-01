# Breakdown — Épico de autenticação

- **Specs:** [001](../../.specs/001-auth-foundation.md) a [006](../../.specs/006-auth-reset-password.md)
- **Spec de base:** [000 — Foundation](../../.specs/000-foundation.md)
- **Data:** 2026-10-29
- **Status do épico:** `approved`

## Objetivo

Entregar o fluxo completo de autenticação — cadastro, confirmação de conta, login com sessão única, esqueci a senha e reset — em fatias verticais implementáveis e publicáveis uma de cada vez.

## Critério de corte

Corte por **etapa da jornada**. Cada spec entrega um resultado observável do ponto de vista de quem usa e depende explicitamente das anteriores. A fundação (001) é separada porque schema, sessão, e-mail e guard são compartilhados por todas as demais.

## Mapa

| Ordem | Spec                                                             | Entrega observável                                                                                        | Depende de | Tamanho | Status     |
| ----- | ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- | ------- | ---------- |
| 001   | [Auth Foundation](../../.specs/001-auth-foundation.md)           | Schema, `EmailService`, sessão única, guard de API, rotas `/auth/*` e `/app/*`, docs de en-US e `/api/v1` | 000        | L       | `approved` |
| 002   | [Auth Sign-up](../../.specs/002-auth-sign-up.md)                 | Cadastro cria conta não confirmada e envia e-mail de confirmação                                          | 001        | M       | `approved` |
| 003   | [Auth Confirm Account](../../.specs/003-auth-confirm-account.md) | Link confirma a conta, cria sessão e leva para `/app`                                                     | 001, 002   | S       | `approved` |
| 004   | [Auth Sign-in](../../.specs/004-auth-sign-in.md)                 | Login com sessão única, e-mail de nova sessão, logout e ida para `/app`                                   | 001, 003   | M       | `approved` |
| 005   | [Auth Forgot Password](../../.specs/005-auth-forgot-password.md) | Solicitação de reset com resposta genérica e link por e-mail                                              | 001, 003   | S       | `approved` |
| 006   | [Auth Reset Password](../../.specs/006-auth-reset-password.md)   | Nova senha, revogação de sessões, e-mail de sucesso e volta ao login                                      | 001, 005   | M       | `approved` |

## Decisões do épico

| Decisão               | Escolha                                                              | Motivo                                                                                       |
| --------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Motor de autenticação | Auth própria no NestJS sobre Postgres/Supabase                       | Sessão única e e-mail por sessão não são nativos do Supabase Auth; controle total dos fluxos |
| Transporte da sessão  | Bearer token em `localStorage`                                       | Escolha do produto; trade-off de XSS registrado em ADR na implementação                      |
| Entrega de e-mail     | `EmailService` com Mailtrap em non-production e Resend em production | Ambiente de teste não envia e-mail real; produção usa provedor transacional                  |
| Confirmação e reset   | Link abre o SPA; a troca do token é `POST`                           | Evita consumo por scanners de e-mail e mantém a API JSON                                     |
| Sessão única          | Criar sessão revoga todas as anteriores do mesmo usuário             | Requisito “a última sessão é a válida”                                                       |
| Idioma                | UI, código, mensagens e e-mails em en-US; specs e docs em pt-BR      | Requisito do produto; convenção documentada em `DEVELOPMENT.md`                              |
| Versionamento da API  | `/api/v1/auth/*`                                                     | Requisito do produto; alinhado ao `/api/v1/ping` da 000                                      |

## Ordem de execução

1. Concluir as Etapas 3–7 da [000 — Foundation](../../.specs/000-foundation.md): Supabase, API, cliente Vite e infra.
2. Implementar [001](../../.specs/001-auth-foundation.md) e validar o guard de rotas com sessão semeada.
3. Implementar [002](../../.specs/002-auth-sign-up.md) e verificar o e-mail no Mailtrap.
4. Implementar [003](../../.specs/003-auth-confirm-account.md) e fechar a jornada de cadastro.
5. Implementar [004](../../.specs/004-auth-sign-in.md) e validar sessão única em dois clientes.
6. Implementar [005](../../.specs/005-auth-forgot-password.md) e [006](../../.specs/006-auth-reset-password.md).
7. Rodar a suíte completa de QA ao fim de cada spec.

## Fora do escopo do épico

- Login social, MFA, “remember me”, refresh token e biometria
- Reenvio de confirmação e troca de e-mail
- Exclusão de conta, backoffice de usuários e gestão de dispositivos
- Rate limiting distribuído e captcha — registrar dívida antes de produção
- Multi-tenant, RLS por organização e convites
- Etapas 3–7 da 000 — são pré-requisito, não parte do épico

## Riscos do épico

| Risco                                                    | Probabilidade | Impacto  | Mitigação                                                                                |
| -------------------------------------------------------- | ------------- | -------- | ---------------------------------------------------------------------------------------- |
| Épico bloqueado até a 000 concluir                       | `high`        | `high`   | Ordem explícita; nenhuma spec de auth absorve a fundação                                 |
| Token em `localStorage` exposto por XSS                  | `medium`      | `high`   | ADR, CSP, sanitização e token revogável; revisar antes de produção                       |
| Falta de rate limiting em login e reset                  | `high`        | `high`   | Registrar dívida e implementar antes de expor o fluxo publicamente                       |
| E-mails transacionais não chegarem                       | `medium`      | `medium` | `EMAIL_FROM` verificado, teste manual no Mailtrap e monitoramento de falhas do provedor  |
| Divergência entre specs e código durante a implementação | `medium`      | `medium` | Mudança de escopo passa por `refine-spec`; status do mapa atualizado ao fim de cada spec |

## Referências

- [000 — Foundation](../../.specs/000-foundation.md)
- [ARCHITECTURE.md](../ARCHITECTURE.md)
- [DEVELOPMENT.md](../DEVELOPMENT.md)
- [RULES.md](../RULES.md)
- [QA.md](../QA.md)
