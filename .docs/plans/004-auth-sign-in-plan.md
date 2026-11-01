# Plano de execução — 004 Auth Sign-in

## Contexto e objetivos

A 001 entrega o serviço de sessão (`SessionService.create` revoga as sessões anteriores e já dispara `sendNewSessionEmail`), o `AuthGuard` e o cliente HTTP. A 002 cria contas não confirmadas e a 003 confirma e cria sessão dentro de `TransactionManager` (ADR 0009). Esta spec entrega o login recorrente, o logout e o tratamento de 401 no SPA.

O que será reutilizado, sem duplicar:

- `SessionService.create` para sessão única e e-mail de nova sessão.
- `TransactionManager` (ADR 0009) para envolver a criação de sessão do login.
- `PASSWORD_HASHER.verify`, `AUTH_USER_REPOSITORY.findByEmail`, `normalizeEmail`, `toPublicUser`.
- `AuthGuard` no logout, `HttpExceptionFilter` para o formato `{ error: { code, message, requestId } }`.
- `AuthProvider.saveToken/clearToken`, `auth-storage.ts`, componentes de `@repo/ui`.

## Perguntas respondidas na exploração (feature-concept autônomo)

| Pergunta                                                    | Resposta adotada                                                                                                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Credencial inválida: qual código?                           | 401 `INVALID_CREDENTIALS`, mensagem `Invalid email or password.`. Mesma resposta para e-mail desconhecido e senha errada.                                                                   |
| Conta não confirmada com senha correta?                     | 403 `EMAIL_NOT_CONFIRMED`. Só é revelada após a senha bater. Trade-off registrado no ADR 0010.                                                                                              |
| E-mail malformado no login?                                 | 400 `VALIDATION_ERROR` pelo DTO. Não é credencial inválida, então não recebe 401.                                                                                                           |
| Senha: exigir tamanho mínimo no login?                      | Não. Só `IsString` e `IsNotEmpty`, para não revelar a política nem invalidar contas antigas.                                                                                                |
| Revogação + criação são atômicas?                           | Sim. `SignInUseCase` envolve `SessionService.create` em `transactions.run` (mesmo padrão da 003). Revogação e criação participam da mesma transação, conforme a mitigação de risco da spec. |
| E-mail de nova sessão: conteúdo?                            | RF-05 exige data, hora e user agent. O template atual só tem o `sessionId`. Ampliar o contrato `new_session` com campos opcionais `createdAt` e `userAgent` (ver suposição 1).              |
| Logout: como autenticar?                                    | `POST /api/v1/auth/sign-out` com `AuthGuard`. O guard já valida o token; o caso de uso revoga pelo hash do token e responde 204.                                                            |
| Interceptor de 401: aplica a qualquer requisição?           | Não. Só a requisições com `authorization` (autenticadas). O 401 de credencial do login não deve redirecionar.                                                                               |
| Onde fica o logout? Não existe layout privado.              | Botão `Sign out` em `routes/home-placeholder.tsx` (página de `/app`). Mudança mínima em `App.tsx`: nenhuma nova rota.                                                                       |
| Link "esqueci a senha" aponta para `/auth/forgot-password`? | Sim, com o caminho que a 005 vai criar. Até lá, o catch-all de `App.tsx` redireciona para `/`, que leva ao login. Registrado como pendência de integração.                                  |
| E2E pode rodar?                                             | Não. Playwright não está ligado ao workspace. O spec é escrito e marcado `deferred`.                                                                                                        |

## Decisão arquitetural (ADR 0010)

Resposta distinta (`403 EMAIL_NOT_CONFIRMED`) para conta não confirmada, emitida somente após senha correta. Trade-off: quem conhece a senha descobre que a conta existe e não está confirmada. Não é enumeração para quem não tem a senha. Registrado no ADR 0010 com alternativas descartadas: resposta genérica 401 (quebra o RF-03) e reenvio automático de confirmação (fora do escopo).

Logout com revogação no servidor e interceptor de 401 seguem ADR 0007 (sessão única, Bearer) e não exigem ADR próprio.

## Suposições

1. O e-mail `new_session` ganha os campos opcionais `createdAt: Date | null` e `userAgent: string | null` em `NewSessionInput`/`AuthEmail`. `SessionService` os preenche a partir de `clock.now()` e `input.userAgent`. A confirmação de conta também passa por `SessionService`, então recebe o mesmo conteúdo. O user agent é truncado em 120 caracteres e escapado no HTML. "Resumido" = truncado, sem parser de UA.
2. O interceptor de 401 vive em `apps/app/src/shared/api-client.ts`. Ao receber 401 de uma requisição com `authorization`, chama `clearAuthToken()` e `window.location.assign("/auth/sign-in?session=ended")`. A página de login mostra aviso de sessão encerrada com `role="status"`. Não usa `Toaster` para não depender de montagem global.
3. `ApiError` ganha `status` para que o cliente saiba o código HTTP.
4. A página de login sai de `routes/sign-in-page.tsx` para `modules/auth/pages/sign-in-page.tsx`; o arquivo antigo é removido (move, não duplica). `App.tsx` só troca o import.
5. Logout local acontece mesmo se a chamada de revogação falhar (`finally`). Se a rede cair, a sessão pode continuar válida no servidor até expirar; registrado como risco aceito.
6. Sign-out responde 204 sem corpo.
7. Log de login: `auth.sign_in.succeeded` (userId, requestId), `auth.sign_in.failed` (reason `invalid_credentials` | `email_not_confirmed`, userId quando conhecido). Logout: `auth.sign_out.succeeded`. Nenhum log tem senha, token ou e-mail.

## Etapas

### Etapa 1 — E-mail de nova sessão (contrato)

1. Teste: `SessionService` envia `createdAt` e `userAgent`; `MailtrapEmailService` renderiza data, hora e user agent truncado/escapado.
2. Implementar: `AuthEmail`, `EmailService`, `FakeEmailService`, `Mailtrap`/`ResendEmailService`, `renderAuthEmail`, `SessionService.sendNewSessionEmail`.

### Etapa 2 — Caso de uso de login (domínio/aplicação)

1. Erros de domínio `InvalidCredentialsError` e `EmailNotConfirmedError` em `domain/errors.ts`.
2. Teste unitário `sign-in.use-case.test.ts`: credencial inválida (e-mail desconhecido e senha errada) não cria sessão; conta não confirmada não cria sessão; sucesso cria sessão, revoga a anterior e dispara o e-mail; logs sem senha/token.
3. Implementar `application/sign-in.use-case.ts`.

### Etapa 3 — Endpoints

1. Teste de integração `interface/sign-in.controller.test.ts`: 401 genérico, 403 `EMAIL_NOT_CONFIRMED`, 200 `{ token, user }`, segundo login invalida o primeiro (401 em `/auth/session`), 400 para DTO inválido.
2. `interface/dto/sign-in.dto.ts`, `interface/sign-in.controller.ts`.
3. Teste `application/sign-out.use-case.test.ts` e `interface/sign-out.controller.test.ts`: logout revoga, token revogado vira 401 em `/auth/session`, 204.
4. `application/sign-out.use-case.ts`, `interface/sign-out.controller.ts` com `AuthGuard`.
5. Registrar controllers e use cases em `auth.module.ts` (aditivo).

### Etapa 4 — Página e cliente (app)

1. Teste de `api-client`: 401 com `authorization` limpa o token e redireciona; 401 sem `authorization` não redireciona; `ApiError.status` preenchido.
2. Implementar `shared/api-client.ts`.
3. Teste de `validation.ts` do login (`validateSignInForm`), depois implementar.
4. `modules/auth/api/sign-in.ts`, `modules/auth/api/sign-out.ts`, `modules/auth/pages/sign-in-page.tsx`, remover `routes/sign-in-page.tsx`, atualizar import em `App.tsx`.
5. Logout em `routes/home-placeholder.tsx`.

### Etapa 5 — E2E (escrito, não executado)

1. `apps/app/e2e/auth-sign-in.spec.ts` cobrindo login, sessão única, 401 e logout. Marcado `deferred`.

### Etapa 6 — Verificação

`turbo run lint check-types test build --force` para api e app; `npm run lint`, `check-types`, `test`, `build`; `prettier --check --end-of-line auto` nos arquivos da spec.

## Riscos

| Risco                                                  | Mitigação                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Diferença de tempo de resposta revela e-mail existente | Risco residual aceito nesta spec. O bcrypt roda só quando há usuário. Registrar como dívida.           |
| Conflito com 005 em `App.tsx` e `auth.module.ts`       | Mudanças aditivas e mínimas. Ordem de integração recomendada: 004 antes ou depois, com rebase simples. |
| Logout sem rede deixa sessão válida no servidor        | Local sempre limpo; sessão expira em `SESSION_TTL_DAYS`. Registrado.                                   |
| 401 do sign-out redireciona com `session=ended`        | Aceito: o 401 indica que a sessão de fato terminou.                                                    |

## Critérios

Todos os critérios de aceite da spec 004 e os comandos de `QA.md`. E2E fica `deferred` pela restrição do run.
