# Plano de execução — 003 Auth Confirm Account

## Contexto e objetivos

A 002 já cria a conta não confirmada, emite um token `email_confirmation` com TTL de
24h e envia o link `/auth/confirm-account?token=...`. Esta spec fecha a jornada:
troca o token por uma sessão, confirma o e-mail e leva a pessoa para `/app`.

O que a 001 entrega e será reutilizado:

- `OneTimeTokenService.issue/consume` (hash SHA-256, tipo, expiração, uso único).
- `SessionService.create` (revoga sessões anteriores = sessão única).
- `EmailService.sendNewSessionEmail` e o template `new_session`.
- `AuthGuard`, filtro HTTP padronizado, `ReferrerPolicyMiddleware` e `requestId`.

## Perguntas respondidas na exploração (feature-concept autônomo)

| Pergunta                                            | Resposta adotada                                                                                                                         |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| O `consume` atual é atômico?                        | Não. `markUsed` é incondicional e fora de transação. Precisa de `UPDATE ... WHERE used_at IS NULL` + transação.                          |
| Como confirmar o usuário?                           | Novo método `markEmailConfirmed(id, at)` em `AuthUserRepository`; o schema já tem `email_confirmed_at`, não há migration.                |
| Como garantir RF-04 sem duplicar a regra de sessão? | Unidade de trabalho (`TransactionManager`) com transação ambiente; `SessionService` e repositórios participam da mesma transação.        |
| O e-mail de nova sessão está ligado?                | Não. `SessionService.create` revoga e cria, mas nunca chama `sendNewSessionEmail`. Corrigir no serviço (também usado pela 004).          |
| O que fazer se o e-mail de nova sessão falhar?      | Logar `auth.session.new_session_email_failed` e seguir; a sessão prevalece, igual ao padrão do sign-up.                                  |
| Códigos HTTP do token inválido                      | DTO vazio/ausente → 400 `VALIDATION_ERROR`; token desconhecido/expirado/usado/de outro tipo → 410 `INVALID_TOKEN` com mensagem genérica. |
| Como evitar que o token fique na URL/referrer?      | Trocar o token por sessão automaticamente, remover a query da URL no mount e adicionar `<meta name="referrer" content="no-referrer">`.   |
| O SPA já tem storage de sessão?                     | Sim: `auth-storage.ts` + `AuthProvider.saveToken` (grava `localStorage` e atualiza o estado).                                            |
| E2E pode rodar aqui?                                | Não. O runner Playwright não está ligado ao workspace; o spec será escrito e marcado `deferred`.                                         |

## Decisão arquitetural (ADR 0009)

Criar `TransactionManager` no domínio de auth:

```ts
export interface TransactionManager {
  run<T>(work: () => Promise<T>): Promise<T>;
}
```

- Implementação Drizzle usa `AsyncLocalStorage` + `database.transaction`.
- Os repositórios Drizzle leem o executor ambiente (transação atual ou conexão raiz).
- Chamadas aninhadas entram na transação já aberta (join), permitindo que
  `OneTimeTokenService` e `SessionService` sejam reutilizados sem conhecer o UoW.
- Falha em qualquer passo desfaz token consumido, `email_confirmed_at` e sessão.
- Em testes, um `InMemoryTransactionManager` tira snapshot/restaura os repositórios
  falsos para provar o rollback.

Consequência aceita: o e-mail de nova sessão é disparado dentro da transação (após a
criação da sessão). Se o commit falhar depois do envio, a pessoa pode receber um
aviso de uma sessão que não existiu; é preferível a bloquear a confirmação ou perder
o aviso em caso de falha do mailer. Registrado no ADR 0009.

## Etapas

### Etapa 1 — Domínio e repositórios (TDD)

1. `domain/transactions.ts`: interface `TransactionManager`.
2. `AuthUserRepository.markEmailConfirmed`.
3. `AuthTokenRepository.markUsedIfUnused` (consumo condicional); remover `markUsed`.
4. `OneTimeTokenService.consume` usa o update condicional e rejeita se não afetou linha.
5. Atualizar repositórios falsos + snapshots para rollback.
6. Testes: consumo concorrente/reutilizado continua rejeitado.

### Etapa 2 — Sessão com e-mail (TDD)

1. `SessionService` injeta `AuthUserRepository` e `EmailService`.
2. Após criar a sessão, carregar o usuário e chamar `sendNewSessionEmail` com
   `{ userId, email, sessionId }`; erro é logado e engolido.
3. `CreateSessionInput` ganha `requestId?` para log correlacionado.
4. Testes: envia e-mail de nova sessão; falha do mailer não impede a sessão e não
   imprime token.

### Etapa 3 — Caso de uso de confirmação (TDD)

`ConfirmAccountUseCase.execute({ token, userAgent, ipAddress, requestId })`:

1. Token vazio → `InvalidTokenError` (400 no controller).
2. Abrir transação.
3. `oneTimeTokens.consume(raw, "email_confirmation")` (tipo/hash/expiração/uso único).
4. `users.markEmailConfirmed(userId, now)`.
5. `sessionService.create({ userId, userAgent, ipAddress, requestId })`.
6. Retornar `{ token: sessionToken, user: toPublicUser(confirmedUser) }`.
7. Log de sucesso/falha com `requestId`, nunca com o token.
8. Testes: válido, expirado, outro tipo, desconhecido, reutilizado e rollback quando
   a criação da sessão falha.

### Etapa 4 — Endpoint

1. `interface/dto/confirm-account.dto.ts` com `token` obrigatório, trim e `MaxLength`.
2. `interface/confirm-account.controller.ts`: `POST auth/confirm-account`, 200 com
   `{ token, user }`; `InvalidTokenError` → 410 `INVALID_TOKEN` genérico.
3. Registrar controller, use case, `DrizzleTransactionManager` e token
   `TRANSACTION_MANAGER` no `auth.module.ts`, preservando providers existentes.
4. Repositórios Drizzle passam a usar o executor transacional.
5. Teste HTTP: 200 válido, 410 inválido/expirado/reutilizado, 400 sem token,
   nenhum token em corpo/log e `requestId` no erro.

### Etapa 5 — SPA

1. `modules/auth/api/confirm-account.ts`: POST e retorno tipado.
2. `modules/auth/pages/confirm-account-page.tsx`:
   - lê `?token=`, remove a query da URL, executa uma única vez (guarda contra
     StrictMode), mostra `Skeleton` com `role="status"`/`aria-live`;
   - sucesso: `saveToken` + `navigate("/app", { replace: true })`;
   - erro: `role="alert"` com mensagem genérica e link para `/auth/sign-in`.
3. `AuthProvider`: estabilizar `saveToken`/`clearToken` com `useCallback`.
4. `App.tsx`: adicionar apenas `/auth/confirm-account`, preservando as rotas atuais.
5. `index.html`: `<meta name="referrer" content="no-referrer" />`.
6. E2E `apps/app/e2e/auth-confirm-account.spec.ts`: link válido (storage + `/app`),
   expirado e já usado (alerta + link de login); execução marcada `deferred`.

### Etapa 6 — Verificação

```bash
npx.cmd turbo run lint check-types test build --filter=api
npx.cmd turbo run lint check-types test build --filter=app
npm.cmd run lint
npm.cmd run check-types
npm.cmd run test
npm.cmd run build
npm.cmd run format:check
```

`npm.cmd run test:e2e` não existe no workspace; o spec é executado na integração
(relatado como `deferred`).

## Riscos e mitigação

| Risco                                              | Mitigação                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Corrida entre duas confirmações                    | `UPDATE ... WHERE used_at IS NULL` dentro da transação; segunda transação afeta 0 linhas.   |
| AsyncLocalStorage não propagar para chamadas async | `storage.run(tx, work)` mantém o contexto por toda a cadeia de promises; coberto por teste. |
| E-mail de nova sessão enviado antes do commit      | Sessão criada por último; risco documentado no ADR 0009.                                    |
| StrictMode disparar o POST duas vezes no SPA       | Ref de execução única por montagem + remoção imediata do token da URL.                      |
| Testes de integração dependerem de Postgres        | Todos os testes usam repositórios falsos e `InMemoryTransactionManager`; sem infra.         |
| 004 reimplementar a regra de sessão                | `SessionService` continua sendo o único caminho e agora envia o e-mail.                     |

## Critérios de aceite mapeados

- Link válido confirma `email_confirmed_at`, consome o token e cria sessão: etapas 3–4.
- Token não reutilizável, expirado, desconhecido ou de outro tipo: etapas 1, 3 e 4.
- Sessão única + e-mail de nova sessão: etapa 2.
- Rollback sem estado parcial: etapa 3 (teste de falha na sessão).
- Página acessível, token fora da URL/referrer, redirecionamento para `/app`: etapa 5.
- QA completo (exceto E2E, `deferred`): etapa 6.
