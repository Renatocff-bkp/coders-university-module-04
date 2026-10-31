# 0007. Autenticação própria com Bearer e sessão única

- **Status:** accepted
- **Data:** 2026-10-31
- **Decisores:** Renato Figueredo
- **Spec:** [001-auth-foundation](../.specs/001-auth-foundation.md)

## Contexto

A fundação entregue na spec [000](../.specs/000-foundation.md) expôs um schema de
auth (`auth_users`, `auth_sessions`, `auth_tokens`) e os serviços
(`SessionService`, `OneTimeTokenService`) sobre Postgres. O produto, porém,
exige regras que o Supabase Auth (GoTrue) não oferece nativamente: apenas uma
sessão válida por pessoa (a última vence) e envio de e-mail a cada nova sessão.
O trade-off de segurança e o transporte da sessão precisam ser registrados.

## Decisão

- A autenticação é **própria**, no NestJS, sobre o Postgres/Supabase; o Supabase
  Auth não é usado para autenticação de usuários do produto.
- O transporte da sessão é **Bearer token + `localStorage`** no SPA; a API guarda
  apenas o hash SHA-256 do token.
- Sessões são de **duração fixa** (7 dias por padrão, configurável via
  `SESSION_TTL_DAYS`) e a criação de uma nova sessão **revoga as anteriores**
  (regra de última sessão vence).
- Tokens de uso único (confirmação de e-mail, reset de senha) são de 32 bytes em
  base64url e só persistem o hash.
- E-mails transacionais via `EmailService`: adapter **Mailtrap** (SMTP sandbox) em
  `NODE_ENV !== "production"` e adapter **Resend** em `NODE_ENV === "production"`,
  com templates em en-US.

## Alternativas consideradas

| Alternativa             | Por que não foi escolhida                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Supabase Auth (GoTrue)  | Não suporta sessão única por pessoa nem e-mail por nova sessão nativamente                   |
| JWT + cookie `httpOnly` | Transporte mais seguro contra XSS, mas fora do contrato de transporte escolhido pelo produto |
| Auth.js / NextAuth      | Fora da stack atual (NestJS + React Router, sem framework de auth gerenciado)                |

## Consequências

### Positivas

- Contrato de segurança totalmente controlado (hash de token, revogação, TTL).
- E-mails entregues por provedor sandbox em dev e transacional em produção.

### Negativas / riscos aceitos

- Token em `localStorage` permanece exposto a XSS; mitigações (CSP, sanitização,
  revogação) registradas no risco aceito e tratamento no ADR da fundação
  ([0001](../.adrs/0001-estado-alvo-da-stack.md)).

## Referências

- [001-auth-foundation](../.specs/001-auth-foundation.md)
- [000-foundation](../.specs/000-foundation.md) — Etapas 3–7
- [0001-estado-alvo-da-stack](../.adrs/0001-estado-alvo-da-stack.md)
- [0005-drizzle-migrations-e-rls](../.adrs/0005-drizzle-migrations-e-rl.md)
