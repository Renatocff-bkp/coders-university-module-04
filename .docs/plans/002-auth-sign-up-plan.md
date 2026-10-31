# Plano de execução — 002 Auth Sign-up

## Contexto e dependências

A fundação da 001 já entrega `OneTimeTokenService`, `SessionService`, `EmailService`
(Mailtrap/Resend + `FakeEmailService`), `AuthUserRepository`, Bcrypt e a migration com
`auth_users`, `auth_sessions` e `auth_tokens`. A 002 adiciona a fatia vertical de cadastro
sobre essa base e **não** cria sessão. A 003 consome o token emitido aqui em
`POST /api/v1/auth/confirm-account`; por isso o link do e-mail aponta para
`/auth/confirm-account?token=...`, rota que a 003 publica.

## Decisões e suposições

| #   | Decisão                                                                                                                           | Racional                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| D1  | `SignUpUseCase` retorna um resultado interno (`created`/`confirmation_resent`/`confirmation_skipped`) e o controller responde 202 | Mantém a resposta genérica e permite testar os três caminhos sem vazar estado ao cliente                                  |
| D2  | E-mail existente confirmado não recebe e-mail; existente não confirmado recebe novo token e novo e-mail                           | RF-06                                                                                                                     |
| D3  | Falha de envio é logada e não interrompe a resposta 202                                                                           | Evita canal de enumeração por status HTTP; mesmo critério adotado na 003 para falha de e-mail                             |
| D4  | `OneTimeTokenService.issue` invalida tokens ativos anteriores do mesmo tipo                                                       | Mitigação do risco "reenvio acidental criar vários tokens válidos"; beneficia 003/005/006 sem reimplementação             |
| D5  | Regras de senha/nome vivem em `domain/sign-up.ts` e são reutilizadas pelo DTO e pelo caso de uso                                  | Servidor repete as validações do cliente; uma única fonte para os limites                                                 |
| D6  | Templates de e-mail corrigidos de `/auth/confirm` para `/auth/confirm-account`                                                    | Divergência entre 001 e 002/003 é bug; a rota pública definida nas specs é `/auth/confirm-account`                        |
| D7  | `Toaster` não é usado; feedback via `role="alert"`/`aria-live`                                                                    | `@repo/ui` não exporta a função `toast`; regiões vivas são exigidas pelo RNF-03 e testáveis sem acoplar dependência extra |
| D8  | O e-mail do formulário não aparece na URL nem em logs da aplicação                                                                | RNF-05 e minimização de dados                                                                                             |
| D9  | E2E usa `page.route` para simular a API                                                                                           | O runner Playwright não existe no workspace e a infra é compartilhada; execução fica para a integração                    |

## Etapas

### 1 — Contrato, regras e validação (TDD)

1. `domain/sign-up.ts`: `PASSWORD_MIN_LENGTH`, `NAME_MAX_LENGTH`, `validateSignUpInput`
   (nome/sobrenome obrigatórios, e-mail válido, senha mínima, confirmação idêntica) +
   `domain/sign-up.test.ts`.
2. `interface/dto/sign-up.dto.ts`: `class-validator` com `@Transform` para trim,
   `@MinLength(PASSWORD_MIN_LENGTH)` e constraint cruzada de confirmação;
   `sign-up.dto.test.ts` valida os campos e as mensagens.
3. `application/sign-up.use-case.ts` + testes com repositórios em memória, `FakeEmailService`,
   hasher determinístico e `FixedClock`.
4. `OneTimeTokenService.issue` invalida tokens anteriores: método
   `invalidateActiveByUserIdAndType` no repositório (in-memory e Drizzle), com teste.

### 2 — Endpoint

`interface/sign-up.controller.ts` (`POST auth/sign-up`, `@HttpCode(202)`), mensagem genérica,
`requestId` repassado ao caso de uso e tradução de `SignUpValidationError` para 400 no formato
padronizado. Registrar controller/provider em `auth.module.ts` sem remover nada.
Teste de integração via `Test.createTestingModule` + `supertest`: 202, 400, sem sessão,
sem `passwordHash`/token na resposta, e-mail com token de 24 h.

### 3 — Correção do link do template

`auth-email-templates.ts`: `/auth/confirm-account?token=`; atualizar
`email.service.test.ts`.

### 4 — Cliente (vertical slice)

1. `modules/auth/validation.ts` + `validation.test.ts` com as mesmas regras do servidor.
2. `modules/auth/api/sign-up.ts` usando `apiRequest` exportado por `shared/api-client.ts`.
3. `modules/auth/pages/sign-up-page.tsx`: `Card`, `Input`, `Label`, `Button`, labels
   associados, `aria-invalid`, `aria-describedby`, resumo de erros `role="alert"`,
   foco no primeiro campo inválido, estado de carregamento e navegação para
   `/auth/check-email` no 202.
4. `modules/auth/pages/check-email-page.tsx`: feedback estático, link para `/auth/sign-in`.
5. `App.tsx`: adicionar as duas rotas preservando `/auth/sign-in`, `/app`, `/` e `*`.

### 5 — E2E (deferred)

`apps/app/e2e/auth-sign-up.spec.ts`: renderização acessível, divergência de senha bloqueando
o submit e sucesso levando a `/auth/check-email`, com a API interceptada. Sem execução local.

### 6 — QA

`npx.cmd turbo run lint|check-types|test|build --filter=api`, `--filter=app`, depois os
comandos raiz (`npm.cmd run ...`) e `format:check`. E2E marcado como `deferred`.

## Riscos

| Risco                                          | Mitigação                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| Divergência de validação cliente/servidor      | Constantes e regras espelhadas com testes dos dois lados; mensagens en-US       |
| Enumeração por timing                          | Resposta 202 idêntica; diferença residual de caminho registrada como suposição  |
| Token de confirmação antigo continuar válido   | Invalidação no `issue` + teste                                                  |
| Quebra de 001 ao alterar repositório de tokens | Implementação in-memory e Drizzle alinhadas; testes existentes continuam verdes |
| Conflito com 003 em `App.tsx`/`auth.module.ts` | Mudanças aditivas, sem remover rotas/providers existentes                       |
| E2E sem runner local                           | Teste escrito, execução serializada na integração                               |

## Critérios de conclusão

- [ ] Todos os RF/RNF da 002 cobertos por código e teste
- [ ] `lint`, `check-types`, `test`, `build` e `format:check` verdes
- [ ] Nenhuma senha/token em resposta, log ou persistência em texto plano
- [ ] Rotas e providers existentes preservados
