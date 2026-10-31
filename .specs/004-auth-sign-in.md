# 004 — Auth Sign-in

## Metadado

| Campo         | Valor      |
| ------------- | ---------- |
| Status        | `approved` |
| Prioridade    | `high`     |
| Criado em     | 2026-10-29 |
| Atualizado em | 2026-10-29 |
| Responsável   | Renato     |

## Resumo

Login com e-mail e senha, sessão única por pessoa (a última vence), e-mail de notificação a cada nova sessão e logout.

## Contexto

Depende de [001 — Auth Foundation](./001-auth-foundation.md) e [003 — Auth Confirm Account](./003-auth-confirm-account.md). A 003 garante que exista um fluxo de conta confirmada e sessão; esta spec entrega o login recorrente.

O requisito de sessão única é aplicado no servidor: criar uma sessão revoga todas as anteriores do mesmo usuário. A pessoa que entrar em outra máquina derruba a sessão anterior, e a próxima requisição da máquina antiga recebe 401 e volta para `/auth/sign-in`.

O e-mail de nova sessão é disparado pelo serviço de sessão da fundação. Esta spec garante que o login passe por esse serviço e cobre o comportamento com teste.

## Escopo

### Dentro do escopo

- Página pública `/auth/sign-in`
- Formulário com e-mail, senha e botão de submit
- `POST /api/v1/auth/sign-in`
- Validação de credenciais e exigência de e-mail confirmado
- Revogação das sessões anteriores e criação da nova sessão
- E-mail de nova sessão em en-US
- Persistência do token no `localStorage` e redirecionamento para `/app`
- Logout com `POST /api/v1/auth/sign-out`, limpeza do token e volta para `/auth/sign-in`
- Tratamento de 401 no cliente, com limpeza de sessão e redirecionamento
- Testes unitários, de integração e E2E

### Fora do escopo

- Cadastro e confirmação de conta — [002](./002-auth-sign-up.md) e [003](./003-auth-confirm-account.md)
- Esqueci a senha e reset — [005](./005-auth-forgot-password.md) e [006](./006-auth-reset-password.md)
- “Remember me”, refresh token, MFA, login social e biometria
- Gestão de dispositivos e listagem de sessões ativas
- Rate limiting distribuído e captcha
- Reenvio de e-mail de confirmação

## Requisitos funcionais

| ID    | Requisito                | Descrição                                                                                                                                                               |
| ----- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Formulário               | `/auth/sign-in` tem e-mail, senha, labels, erros por campo, estado de carregamento e link para esqueci a senha                                                          |
| RF-02 | Validação de credenciais | `POST /api/v1/auth/sign-in` valida e-mail e senha; credencial inválida responde 401 genérico, sem revelar se o e-mail existe                                            |
| RF-03 | E-mail confirmado        | Conta com senha correta mas e-mail não confirmado responde 403 com código `EMAIL_NOT_CONFIRMED`; a mensagem orienta a abrir o e-mail de confirmação                     |
| RF-04 | Sessão única             | Criar a sessão revoga todas as anteriores do usuário. A máquina anterior passa a receber 401 na próxima requisição                                                      |
| RF-05 | E-mail de nova sessão    | Toda sessão criada pelo login dispara e-mail en-US com data, hora e user agent resumido                                                                                 |
| RF-06 | Sessão e logout          | Sucesso retorna `{ token, user }`, o SPA grava o token no `localStorage` e navega para `/app`. Logout revoga a sessão atual, limpa o token e volta para `/auth/sign-in` |

## Requisitos não-funcionais

| ID     | Requisito       | Descrição                                                                                                                   |
| ------ | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança       | Senha nunca logada; 401 genérico para credencial inválida; token de sessão só em hash no banco; logout invalida no servidor |
| RNF-02 | Idioma          | Todos os textos, códigos de erro e template de e-mail em en-US                                                              |
| RNF-03 | Acessibilidade  | Labels associados, erro com `aria-live`, foco no primeiro campo inválido e navegação completa por teclado                   |
| RNF-04 | Responsividade  | Layout mobile-first, funcional de 320px a 2560px e com zoom de 200%                                                         |
| RNF-05 | Observabilidade | Logs de login, logout e sessão revogada com `requestId` e `userId`, sem token nem senha                                     |
| RNF-06 | Testes          | Unitários do caso de uso, integração com repositório/mailer falsos e E2E de login, sessão única e logout                    |

## Critérios de aceite

- [ ] `/auth/sign-in` renderiza o formulário acessível sem sessão
- [ ] Credencial inválida retorna 401 genérico e não cria sessão
- [ ] Conta não confirmada com senha correta retorna 403 `EMAIL_NOT_CONFIRMED`
- [ ] Login válido retorna token, grava no `localStorage` e navega para `/app`
- [ ] Login válido envia o e-mail de nova sessão
- [ ] Um segundo login invalida o token do primeiro; a primeira máquina recebe 401
- [ ] O 401 no cliente limpa o token e redireciona para `/auth/sign-in`
- [ ] Logout revoga a sessão no servidor, limpa o token e volta para `/auth/sign-in`
- [ ] Token revogado não autentica em `GET /api/v1/auth/session`
- [ ] Nenhuma resposta ou log contém senha ou token
- [ ] `npm run lint`, `npm run check-types`, `npm run test`, `npm run test:e2e`, `npm run build` e `npm run format:check` passam

## Impacto técnico

### Arquivos afetados

| Arquivo                                                      | Ação   | Descrição                                                   |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------- |
| `apps/api/src/modules/auth/application/sign-in.use-case.ts`  | create | Validação de credenciais, sessão única e disparo do e-mail  |
| `apps/api/src/modules/auth/application/sign-out.use-case.ts` | create | Revogação da sessão atual                                   |
| `apps/api/src/modules/auth/interface/sign-in.controller.ts`  | create | `POST /api/v1/auth/sign-in`                                 |
| `apps/api/src/modules/auth/interface/sign-out.controller.ts` | create | `POST /api/v1/auth/sign-out`                                |
| `apps/api/src/modules/auth/interface/dto/sign-in.dto.ts`     | create | DTO de e-mail e senha                                       |
| `apps/app/src/modules/auth/pages/sign-in-page.tsx`           | create | Formulário e estados                                        |
| `apps/app/src/modules/auth/api/sign-in.ts`                   | create | Chamada ao endpoint e gravação do token                     |
| `apps/app/src/modules/auth/api/sign-out.ts`                  | create | Chamada de logout e limpeza local                           |
| `apps/app/src/shared/api-client.ts`                          | modify | Interceptor de 401 com limpeza de sessão e redirecionamento |
| `apps/app/src/App.tsx`                                       | modify | Rota `/auth/sign-in` e ação de logout no layout privado     |
| `apps/api/src/modules/auth/**/*.test.ts`                     | create | Testes de credencial, sessão única e logout                 |
| `apps/app/e2e/auth-sign-in.spec.ts`                          | create | E2E de login, sessão única, 401 e logout                    |

### Dependências

- [001 — Auth Foundation](./001-auth-foundation.md): serviço de sessão, `EmailService`, guard e cliente HTTP
- [003 — Auth Confirm Account](./003-auth-confirm-account.md): conta confirmada e sessão automática
- [000 — Foundation](./000-foundation.md): API e cliente existentes
- `class-validator` e `class-transformer` para o DTO

### Componentes de UI

| Componente | Origem     | Uso                                    |
| ---------- | ---------- | -------------------------------------- |
| `Card`     | `@repo/ui` | Container do formulário                |
| `Input`    | `@repo/ui` | E-mail e senha                         |
| `Label`    | `@repo/ui` | Rótulos acessíveis                     |
| `Button`   | `@repo/ui` | Submit, link de reset e logout         |
| `Toaster`  | `@repo/ui` | Feedback de erro e de sessão encerrada |

## Plano de implementação

### Etapa 1 — Caso de uso

Implementar validação de credenciais, distinção segura de e-mail não confirmado e criação de sessão única. Cobrir com testes.

### Etapa 2 — Endpoints

Expor `POST /api/v1/auth/sign-in` e `POST /api/v1/auth/sign-out`, integrados ao serviço de sessão e ao formato de erro padronizado.

### Etapa 3 — Página e sessão

Construir `/auth/sign-in`, gravar o token, redirecionar para `/app` e tratar 401 no cliente.

### Etapa 4 — Logout

Adicionar a ação de logout no layout privado, revogando a sessão no servidor antes de limpar o storage.

### Etapa 5 — Verificação

```bash
npm run lint
npm run check-types
npm run test
npm run test:e2e
npm run build
npm run format:check
```

## Riscos e ressalvas

| Risco                                                     | Probabilidade | Impacto  | Mitigação                                                                               |
| --------------------------------------------------------- | ------------- | -------- | --------------------------------------------------------------------------------------- |
| Token em `localStorage` exposto por XSS                   | `medium`      | `high`   | ADR da 001 registra o trade-off; CSP e sanitização; token revogável e com expiração     |
| Força bruta de senha                                      | `medium`      | `high`   | Fora do escopo desta spec; registrar dívida e priorizar rate limiting antes de produção |
| Duas máquinas em corrida criarem sessões simultâneas      | `low`         | `medium` | Revogação e criação na mesma transação; teste de concorrência                           |
| E-mail de nova sessão falhar e a pessoa não ser avisada   | `medium`      | `low`    | Falha é logada e não bloqueia o login; reenvio manual fica fora do escopo               |
| Usuário confundir 401 de sessão única com erro de sistema | `medium`      | `low`    | Mensagem clara em en-US e redirecionamento para o login com aviso de sessão encerrada   |

## Referências

- [001 — Auth Foundation](./001-auth-foundation.md)
- [003 — Auth Confirm Account](./003-auth-confirm-account.md)
- [005 — Auth Forgot Password](./005-auth-forgot-password.md)
- [006 — Auth Reset Password](./006-auth-reset-password.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [DESIGN_SYSTEM.md](../.docs/DESIGN_SYSTEM.md)
