# Plano de execução — 005 Auth Forgot Password

Spec: [005 — Auth Forgot Password](../../.specs/005-auth-forgot-password.md)
Branch: `feat/005-auth-forgot-password`

## Decisões e suposições

| #   | Tema                           | Decisão                                                                                                                   | Motivo                                                                                                                                                                               |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| S1  | Conta não confirmada           | Só contas confirmadas recebem token e e-mail de reset. Conta não confirmada recebe a mesma resposta 202 e nada é enviado. | A Etapa 1 da spec fala em "busca de conta confirmada"; a 006 não define reset para conta pendente. Conservador: não cria um canal de senha para conta que ainda não provou o e-mail. |
| S2  | Resposta vs. envio             | O controller responde 202 sem aguardar a busca nem o envio. O caso de uso nunca rejeita (captura e loga tudo).            | Equaliza o tempo de resposta entre conta existente e inexistente (RNF-01). Registrado em ADR 0011.                                                                                   |
| S3  | Logs                           | Logs do fluxo carregam apenas `requestId` e o evento. Não há `userId` nem e-mail nos logs de forgot-password.             | Spec proíbe log com informação sobre existência da conta.                                                                                                                            |
| S4  | Rate limiting                  | Fora do escopo (já listado na spec).                                                                                      | Dívida registrada.                                                                                                                                                                   |
| S5  | Módulo                         | `ForgotPasswordUseCase` e `ForgotPasswordController` no módulo `auth` existente; providers e controllers aditivos.        | Mínimo impacto em `auth.module.ts` (também tocado pela 004).                                                                                                                         |
| S6  | Validação de e-mail no cliente | Extrai `validateEmail` de `validation.ts` e reutiliza em `validateSignUpForm` sem mudar comportamento.                    | Reuso pedido pela orquestração; o teste existente de sign-up cobre a regressão.                                                                                                      |

## Etapas

1. **Caso de uso** (`apps/api/src/modules/auth/application/forgot-password.use-case.ts`)
   - Testes primeiro: conta confirmada emite `password_reset` com TTL de 1h e envia e-mail; conta inexistente não emite nem envia; conta não confirmada não emite nem envia; segunda solicitação invalida o token anterior; falha de envio é logada e engolida; logs não contêm token nem e-mail.
2. **Endpoint** (`interface/forgot-password.controller.ts`, `interface/dto/forgot-password.dto.ts`, `auth.module.ts`)
   - Teste de integração HTTP: 202 idêntico para conta existente, inexistente e não confirmada; corpo sem token; DTO rejeita campos extras.
3. **Página** (`apps/app/src/modules/auth/pages/forgot-password-page.tsx`, `api/forgot-password.ts`, `App.tsx`)
   - Validação com `validateEmail`, estado de carregamento, feedback genérico em `role="alert"` (erros) e `role="status"`/`aria-live` (sucesso), link para `/auth/sign-in`.
   - Testes unitários de validação e do cliente HTTP.
4. **E2E** (`apps/app/e2e/auth-forgot-password.spec.ts`): escrito, não executado (`deferred`).
5. **ADR 0011** sobre o envio fora do caminho de resposta.

## Riscos

- Envio fora do caminho de resposta: se o processo cair depois do 202, o e-mail se perde sem retry. Aceito e registrado no ADR.
- Rota `/auth/forgot-password` depende da 006 para o link do e-mail funcionar. Publicar 005 e 006 juntas (já previsto na spec).
- `App.tsx` e `auth.module.ts` também são tocados pela 004: mudanças aditivas, conflitos previsíveis.

## Critérios

- `lint`, `check-types`, `test`, `build` e `format` passam nos workspaces `api` e `app`.
- Resposta 202 idêntica entre existente, inexistente e não confirmada (teste de integração).
- Nenhum token ou e-mail em resposta ou log (teste).

## Verificação

```bash
npx.cmd turbo run lint check-types test build --force --filter=api
npx.cmd turbo run lint check-types test build --force --filter=app
npm.cmd run lint
npm.cmd run check-types
npm.cmd run test
npm.cmd run build
npx.cmd prettier --check --end-of-line auto <arquivos alterados>
```
