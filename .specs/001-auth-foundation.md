# 001 — Auth Foundation

## Metadado

| Campo         | Valor      |
| ------------- | ---------- |
| Status        | `approved` |
| Prioridade    | `critical` |
| Criado em     | 2026-10-29 |
| Atualizado em | 2026-10-29 |
| Responsável   | Renato     |

## Resumo

Base compartilhada de autenticação: schema de usuários, sessões e tokens, serviço de e-mail abstraído, regra de sessão única, guard de API e separação entre rotas públicas (`/auth/*`) e privadas (`/app/*`).

## Contexto

Esta é a primeira fatia do épico de autenticação. Ela não entrega cadastro nem login; entrega a fundação que as specs [002](./002-auth-sign-up.md) a [006](./006-auth-reset-password.md) consomem.

O produto usa autenticação própria no NestJS, não Supabase Auth. A decisão existe porque dois requisitos não são nativos do GoTrue: apenas uma sessão válida por pessoa (a última vence) e envio de e-mail a cada nova sessão. Usuários, hashes Bcrypt, sessões e tokens ficam no Postgres do Supabase, acessados pela API.

O transporte escolhido é **Bearer token + `localStorage`**. O SPA envia `Authorization: Bearer <token>` e a API guarda apenas o hash do token. A consequência aceita é a exposição a XSS; a mitigação e o trade-off ficam registrados em ADR na implementação.

O épico depende da [000 — Foundation](./000-foundation.md). As Etapas 3–7 da 000 (Supabase, API NestJS, cliente Vite e infra local) precisam existir antes desta spec. Ela não absorve esse trabalho.

## Escopo

### Dentro do escopo

- Migration com `auth_users`, `auth_sessions` e `auth_tokens`, RLS habilitado e sem policies para `anon`/`authenticated`
- Módulo `auth` em `apps/api` nas camadas `domain`, `application`, `infrastructure` e `interface`
- Hash de senha com Bcrypt e geração/hash de tokens de sessão e de uso único
- Criação de sessão com revogação das sessões anteriores do mesmo usuário
- `EmailService` com interface única, adapter Mailtrap em non-production e adapter Resend em production
- Templates em en-US para confirmação de conta, nova sessão, reset de senha e senha alterada
- Prefixo global `/api/v1` e `GET /api/v1/auth/session` protegido por Bearer
- Estrutura de rotas do SPA: `/auth/*` pública, demais rotas privadas, bootstrap de sessão e redirecionamentos
- Documentação de idioma (en-US para produto e código) e de versionamento da API
- ADR da autenticação própria e do transporte por Bearer em `localStorage`

### Fora do escopo

- Cadastro, confirmação de conta, login, esqueci a senha e reset — specs [002](./002-auth-sign-up.md), [003](./003-auth-confirm-account.md), [004](./004-auth-sign-in.md), [005](./005-auth-forgot-password.md) e [006](./006-auth-reset-password.md)
- Etapas 3–7 da [000 — Foundation](./000-foundation.md)
- Login social, MFA, “remember me”, refresh token, reenvio de confirmação e troca de e-mail
- Exclusão de conta, backoffice de usuários e gestão de dispositivos
- Rate limiting distribuído e captcha
- UI final de `/app` — esta spec entrega apenas a home placeholder protegida

## Requisitos funcionais

| ID    | Requisito            | Descrição                                                                                                                                                                                                                                                                                                |
| ----- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Schema de auth       | Migration cria `auth_users` (nome, sobrenome, e-mail único case-insensitive, hash de senha, `email_confirmed_at`), `auth_sessions` (hash do token, user agent, IP, expiração, revogação) e `auth_tokens` (tipo, hash, expiração, uso). RLS habilitado sem policies de acesso direto                      |
| RF-02 | Credenciais e tokens | Senhas com Bcrypt (custo 12). Tokens opacos de 32 bytes em base64url; somente o SHA-256 é persistido. Nenhum token ou senha aparece em log, resposta ou banco em texto plano                                                                                                                             |
| RF-03 | Sessão única         | Criar uma sessão revoga todas as sessões ativas anteriores do usuário e dispara o e-mail de nova sessão. A validação rejeita token expirado ou revogado e atualiza `last_used_at`. Sessão expira em 7 dias                                                                                               |
| RF-04 | EmailService         | Interface `EmailService` com adapter Mailtrap Email Testing (SMTP sandbox) quando `NODE_ENV !== "production"` e adapter Resend quando `NODE_ENV === "production"`. Templates en-US para os quatro e-mails do épico                                                                                       |
| RF-05 | Guard de API         | `GET /api/v1/auth/session` retorna o usuário autenticado ou 401 no formato de erro padronizado. O guard valida o Bearer token em toda rota privada                                                                                                                                                       |
| RF-06 | Rotas do SPA         | `/auth/*` acessível sem sessão; qualquer outra rota é privada. `/app/*` e rotas desconhecidas redirecionam para `/auth/sign-in` sem token válido; `/` vai para `/app` ou `/auth/sign-in`. Bootstrap consulta `/api/v1/auth/session`, limpa token inválido e mantém o usuário em memória durante a sessão |

## Requisitos não-funcionais

| ID     | Requisito       | Descrição                                                                                                                                                                    |
| ------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança       | Segredos apenas por env; RLS habilitado; comparação de tokens em tempo constante; respostas de auth sem stack trace; link de e-mail com `Referrer-Policy: no-referrer`       |
| RNF-02 | Idioma          | Todo texto de interface, identificador de código, comentário, mensagem de erro da API e template de e-mail em en-US. Specs e documentação do repositório permanecem em pt-BR |
| RNF-03 | Versionamento   | Toda rota de negócio sob `/api/v1`; auth sob `/api/v1/auth/*`; health check operacional pode permanecer em `/health`                                                         |
| RNF-04 | Acessibilidade  | Formulários e navegação conformes a WCAG AA, com foco visível, labels associados, erros anunciados via `aria-live` e navegação completa por teclado                          |
| RNF-05 | Responsividade  | Telas de auth funcionam de 320px a 2560px, mobile-first, com zoom de 200%                                                                                                    |
| RNF-06 | Observabilidade | Logs JSON com `requestId`; eventos de sessão criada/revogada e falha de e-mail logados sem token nem senha                                                                   |
| RNF-07 | Testes          | Testes unitários de domínio e aplicação, integração com repositório e mailer falsos, e E2E do guard de rotas                                                                 |

## Critérios de aceite

- [ ] `npm run db:migrate` cria as três tabelas, índices e RLS sem erro
- [ ] `auth_users.email` é único sem diferenciar maiúsculas de minúsculas
- [ ] Criar uma segunda sessão invalida o token da primeira
- [ ] `GET /api/v1/auth/session` responde 401 sem token e 200 com sessão semeada válida
- [ ] Sessão expirada ou revogada responde 401
- [ ] O adapter falso de e-mail captura os quatro templates com o link e o destinatário corretos
- [ ] Em `NODE_ENV !== "production"` o adapter selecionado é Mailtrap; em `production`, Resend
- [ ] Acessar `/app` sem sessão redireciona para `/auth/sign-in`
- [ ] Acessar uma rota desconhecida sem sessão redireciona para `/auth/sign-in`
- [ ] Acessar `/` sem sessão redireciona para `/auth/sign-in`; com sessão, para `/app`
- [ ] Acessar `/auth/sign-in` sem sessão renderiza a página pública
- [ ] Nenhum teste, log ou resposta contém senha ou token em texto plano
- [ ] `.docs/DEVELOPMENT.md` documenta a convenção en-US e `.docs/ARCHITECTURE.md` documenta `/api/v1`
- [ ] `npm run lint`, `npm run check-types`, `npm run test`, `npm run test:e2e`, `npm run build` e `npm run format:check` passam

## Impacto técnico

### Arquivos afetados

| Arquivo                                               | Ação   | Descrição                                                       |
| ----------------------------------------------------- | ------ | --------------------------------------------------------------- |
| `supabase/migrations/{timestamp}_auth_foundation.sql` | create | Tabelas, índices, extensão e RLS de auth                        |
| `apps/api/src/modules/auth/domain/**`                 | create | Entidades, value objects e interfaces de repositório            |
| `apps/api/src/modules/auth/application/**`            | create | Casos de uso de sessão, token e e-mail                          |
| `apps/api/src/modules/auth/infrastructure/**`         | create | Repositórios Postgres, Bcrypt, mailer Mailtrap/Resend           |
| `apps/api/src/modules/auth/interface/**`              | create | Controller `/api/v1/auth/session`, DTOs, presenter e guard      |
| `apps/api/src/modules/auth/auth.module.ts`            | create | Composição do módulo                                            |
| `apps/api/src/main.ts`                                | modify | Prefixo global `api/v1` e `Referrer-Policy`                     |
| `apps/api/src/shared/**`                              | modify | Filtro de erro e logger consumidos pelo módulo de auth          |
| `apps/app/src/modules/auth/**`                        | create | `AuthProvider`, storage do token, hooks e páginas placeholder   |
| `apps/app/src/shared/api-client.ts`                   | create | Cliente HTTP com `Authorization: Bearer` e tratamento de 401    |
| `apps/app/src/App.tsx`                                | modify | Router com layouts público e privado                            |
| `apps/app/src/routes/**`                              | create | Guard de rota e home placeholder em `/app`                      |
| `.env.example`                                        | modify | Variáveis de Mailtrap, Resend, `EMAIL_FROM`, `APP_URL` e sessão |
| `.docs/DEVELOPMENT.md`                                | modify | Seção de idioma en-US                                           |
| `.docs/ARCHITECTURE.md`                               | modify | Seção de versionamento `/api/v1`                                |
| `.adrs/NNNN-auth-propria-e-bearer.md`                 | create | ADR da auth própria, sessão única e token em `localStorage`     |
| `apps/api/src/modules/auth/**/*.test.ts`              | create | Unitários e integração com repositório/mailer falsos            |
| `apps/app/e2e/auth-routes.spec.ts`                    | create | E2E de rota pública, rota privada e redirecionamento            |

### Dependências

- [000 — Foundation](./000-foundation.md), Etapas 3–7: Supabase local, `apps/api`, `apps/app` e infra
- `bcrypt`, `nodemailer`, `resend`, `react-router-dom`
- `NODE_ENV`, `DATABASE_URL`, `MAILTRAP_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `SESSION_TTL_DAYS`
- ADR da [0001 — Estado-alvo da stack](../.adrs/0001-estado-alvo-da-stack.md)

### Componentes de UI

| Componente | Origem     | Uso                               |
| ---------- | ---------- | --------------------------------- |
| `Button`   | `@repo/ui` | Ações de submit e navegação       |
| `Input`    | `@repo/ui` | Campos de e-mail e senha          |
| `Label`    | `@repo/ui` | Rótulos acessíveis dos campos     |
| `Card`     | `@repo/ui` | Container dos formulários de auth |
| `Toaster`  | `@repo/ui` | Feedback de erro e sucesso        |

## Plano de implementação

### Etapa 1 — Schema e domínio

Criar a migration e as entidades/interfaces de repositório. Testar unicidade de e-mail, expiração e revogação no domínio.

```bash
npm run db:migrate
npm run test -- --filter=api
```

### Etapa 2 — Aplicação e sessão única

Implementar hash de senha, geração de token, criação/revogação de sessão e consumo de token de uso único. Cobrir com testes de aplicação.

### Etapa 3 — EmailService

Definir a interface, os templates en-US e os adapters Mailtrap/Resend. Testes usam um adapter falso; nenhum teste depende de rede.

### Etapa 4 — API e guard

Montar o controller `/api/v1/auth/session`, o guard Bearer, o prefixo global e o formato de erro. Validar 401, 200 e sessão revogada.

### Etapa 5 — SPA e rotas

Adicionar React Router, `AuthProvider`, cliente HTTP e layouts. `/auth/*` público, `/app/*` privado, home placeholder protegida.

### Etapa 6 — Documentação, ADR e verificação

Atualizar `DEVELOPMENT.md` e `ARCHITECTURE.md`, criar o ADR e rodar a suíte completa.

```bash
npm run lint
npm run check-types
npm run test
npm run test:e2e
npm run build
npm run format:check
```

## Riscos e ressalvas

| Risco                                                      | Probabilidade | Impacto    | Mitigação                                                                                     |
| ---------------------------------------------------------- | ------------- | ---------- | --------------------------------------------------------------------------------------------- |
| Token em `localStorage` exposto por XSS                    | `medium`      | `high`     | ADR registra o trade-off; CSP, sanitização e revisão de dependências; token curto e revogável |
| Dependência da 000 ainda não implementada                  | `high`        | `high`     | Ordem explícita no mapa; esta spec só começa após as Etapas 3–7 da 000                        |
| Revogação de sessão concorrente deixar duas sessões ativas | `medium`      | `medium`   | Revogação e criação na mesma transação; teste de concorrência no caso de uso                  |
| RLS mal configurada expor dados de auth                    | `low`         | `critical` | Sem policies para `anon`/`authenticated`; teste que tenta leitura direta e falha              |
| Mailtrap fora do ar bloquear testes                        | `medium`      | `low`      | Testes usam adapter falso; Mailtrap só é exercitado manualmente                               |
| Link de e-mail consumido por prefetch do cliente           | `medium`      | `medium`   | Link abre página do SPA com `no-referrer`; a troca do token é `POST`, não `GET`               |

## Referências

- [000 — Foundation](./000-foundation.md)
- [002 — Auth Sign-up](./002-auth-sign-up.md)
- [003 — Auth Confirm Account](./003-auth-confirm-account.md)
- [004 — Auth Sign-in](./004-auth-sign-in.md)
- [005 — Auth Forgot Password](./005-auth-forgot-password.md)
- [006 — Auth Reset Password](./006-auth-reset-password.md)
- [ARCHITECTURE.md](../.docs/ARCHITECTURE.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [RULES.md](../.docs/RULES.md)
- [ADRs](../.adrs/README.md)
