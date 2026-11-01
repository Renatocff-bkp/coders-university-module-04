# 002 — Auth Sign-up

## Metadado

| Campo         | Valor      |
| ------------- | ---------- |
| Status        | `implemented` |
| Prioridade    | `high`     |
| Criado em     | 2026-10-29 |
| Atualizado em | 2026-11-01 |
| Responsável   | Renato     |

## Resumo

Cadastro público com nome, sobrenome, e-mail, senha e confirmação de senha; a conta é criada não confirmada e recebe um e-mail com link de confirmação.

## Contexto

É a porta de entrada da jornada de autenticação. Depende da [001 — Auth Foundation](./001-auth-foundation.md), que já entrega schema, Bcrypt, tokens, `EmailService` e as rotas públicas `/auth/*`.

O cadastro não cria sessão. A sessão só nasce na confirmação da conta ([003](./003-auth-confirm-account.md)), porque o requisito é que o link do e-mail confirme a conta e então direcione a pessoa para a home.

A resposta do endpoint não revela se um e-mail já está cadastrado. Contas existentes e inexistentes recebem a mesma resposta, evitando enumeração de usuários.

## Escopo

### Dentro do escopo

- Página pública `/auth/sign-up`
- Formulário com nome, sobrenome, e-mail, senha e confirmação de senha
- Validação de campos no cliente e no servidor, incluindo match entre senha e confirmação
- `POST /api/v1/auth/sign-up`
- Criação de usuário não confirmado com senha em Bcrypt
- Emissão de token de confirmação de uso único com validade de 24 horas
- E-mail de confirmação em en-US com link para `/auth/confirm-account?token=...`
- Página de feedback `/auth/check-email`
- Testes unitários, de integração e E2E do cadastro

### Fora do escopo

- Confirmação da conta e criação de sessão — [003](./003-auth-confirm-account.md)
- Login e logout — [004](./004-auth-sign-in.md)
- Esqueci a senha e reset — [005](./005-auth-forgot-password.md) e [006](./006-auth-reset-password.md)
- Reenvio explícito do e-mail de confirmação por botão ou página dedicada
- Cadastro social, captcha, medidor de força de senha e termos de uso
- Convite de organização ou vínculo com tenant

## Requisitos funcionais

| ID    | Requisito             | Descrição                                                                                                                                                                                                    |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-01 | Formulário            | `/auth/sign-up` tem nome, sobrenome, e-mail, senha, confirmação de senha e botão de submit, com labels, erros por campo e estado de carregamento                                                             |
| RF-02 | Validação             | Nome e sobrenome obrigatórios; e-mail em formato válido; senha com no mínimo 8 caracteres; senha e confirmação idênticas. O servidor repete todas as validações                                              |
| RF-03 | Endpoint              | `POST /api/v1/auth/sign-up` aceita os campos do formulário e responde 202 sem corpo ou com mensagem genérica                                                                                                 |
| RF-04 | Conta não confirmada  | Cria `auth_users` com `email_confirmed_at` nulo e senha em Bcrypt. Não cria sessão nem retorna token de sessão                                                                                               |
| RF-05 | E-mail de confirmação | Gera token de confirmação de uso único, válido por 24 horas, e envia e-mail en-US com link `APP_URL/auth/confirm-account?token=...`                                                                          |
| RF-06 | Não enumeração        | E-mail já cadastrado recebe a mesma resposta 202. Se a conta existente não estiver confirmada, um novo token é emitido e o e-mail é reenviado; se estiver confirmada, nenhum e-mail de confirmação é enviado |

## Requisitos não-funcionais

| ID     | Requisito       | Descrição                                                                                                             |
| ------ | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança       | Senha nunca retornada, logada ou persistida em texto plano; token persistido apenas como hash                         |
| RNF-02 | Idioma          | Todos os textos da página, mensagens de erro, nomes de campos e template de e-mail em en-US                           |
| RNF-03 | Acessibilidade  | Labels associados, erros anunciados via `aria-live`, foco no primeiro campo inválido e navegação completa por teclado |
| RNF-04 | Responsividade  | Layout mobile-first, funcional de 320px a 2560px e com zoom de 200%                                                   |
| RNF-05 | Observabilidade | Log de cadastro e de envio de e-mail com `requestId`, sem e-mail completo em produção e sem token                     |
| RNF-06 | Testes          | Unitários de validação, integração do caso de uso com repositório e mailer falsos e E2E do formulário                 |

## Critérios de aceite

- [ ] `/auth/sign-up` renderiza o formulário completo e acessível sem sessão
- [ ] Senha e confirmação divergentes bloqueiam o submit no cliente e retornam 400 no servidor
- [ ] Cadastro válido cria usuário com `email_confirmed_at` nulo e hash Bcrypt válido
- [ ] Cadastro válido não cria sessão nem retorna token de sessão
- [ ] O e-mail de confirmação é capturado pelo adapter falso com link para `/auth/confirm-account?token=...`
- [ ] O token de confirmação expira em 24 horas e é de uso único
- [ ] Cadastrar e-mail existente retorna a mesma resposta 202 e não duplica o usuário
- [ ] Conta existente não confirmada recebe novo token; conta confirmada não recebe e-mail de confirmação
- [ ] A página de feedback `/auth/check-email` orienta a pessoa a abrir o e-mail
- [ ] Nenhuma resposta ou log contém senha ou token
- [ ] `npm run lint`, `npm run check-types`, `npm run test`, `npm run test:e2e`, `npm run build` e `npm run format:check` passam

## Impacto técnico

### Arquivos afetados

| Arquivo                                                     | Ação   | Descrição                                        |
| ----------------------------------------------------------- | ------ | ------------------------------------------------ |
| `apps/api/src/modules/auth/application/sign-up.use-case.ts` | create | Criação de conta, token e disparo do e-mail      |
| `apps/api/src/modules/auth/interface/sign-up.controller.ts` | create | `POST /api/v1/auth/sign-up` e DTO de entrada     |
| `apps/api/src/modules/auth/interface/dto/sign-up.dto.ts`    | create | Validação com class-validator                    |
| `apps/app/src/modules/auth/pages/sign-up-page.tsx`          | create | Formulário e estados de erro/sucesso             |
| `apps/app/src/modules/auth/pages/check-email-page.tsx`      | create | Feedback pós-cadastro                            |
| `apps/app/src/modules/auth/api/sign-up.ts`                  | create | Chamada ao endpoint                              |
| `apps/app/src/modules/auth/validation.ts`                   | create | Regras compartilhadas de validação do formulário |
| `apps/app/src/App.tsx`                                      | modify | Rotas `/auth/sign-up` e `/auth/check-email`      |
| `apps/api/src/modules/auth/**/*.test.ts`                    | create | Testes do caso de uso e do controller            |
| `apps/app/e2e/auth-sign-up.spec.ts`                         | create | E2E do cadastro, erro de confirmação e feedback  |

### Dependências

- [001 — Auth Foundation](./001-auth-foundation.md): schema, Bcrypt, tokens, `EmailService`, rotas públicas e cliente HTTP
- [000 — Foundation](./000-foundation.md): API e cliente existentes
- `class-validator` e `class-transformer` para o DTO

### Componentes de UI

| Componente | Origem     | Uso                                  |
| ---------- | ---------- | ------------------------------------ |
| `Card`     | `@repo/ui` | Container do formulário              |
| `Input`    | `@repo/ui` | Campos de nome, e-mail e senha       |
| `Label`    | `@repo/ui` | Rótulos acessíveis                   |
| `Button`   | `@repo/ui` | Submit e link para o login           |
| `Toaster`  | `@repo/ui` | Feedback de erro e de e-mail enviado |

## Plano de implementação

### Etapa 1 — Contrato e validação

Definir o DTO, as regras compartilhadas e os testes de validação antes da página.

### Etapa 2 — Caso de uso

Implementar criação de usuário não confirmado, tratamento de e-mail existente e emissão do token de confirmação. Cobrir com repositório e mailer falsos.

### Etapa 3 — Endpoint

Expor `POST /api/v1/auth/sign-up`, garantir resposta genérica e integrar ao filtro de erro padronizado.

### Etapa 4 — Página e feedback

Construir `/auth/sign-up` e `/auth/check-email`, com acessibilidade, responsividade e estados de carregamento.

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

| Risco                                                      | Probabilidade | Impacto  | Mitigação                                                                                |
| ---------------------------------------------------------- | ------------- | -------- | ---------------------------------------------------------------------------------------- |
| Enumeração de usuários por diferença de resposta ou timing | `medium`      | `medium` | Resposta 202 idêntica; fluxo de e-mail existente executado em background quando possível |
| E-mail de confirmação cair em spam                         | `medium`      | `medium` | `EMAIL_FROM` verificado no provedor; template simples, sem imagens e com link textual    |
| Reenvio acidental criar vários tokens válidos              | `medium`      | `low`    | Emitir novo token invalida os anteriores do mesmo tipo                                   |
| Link de confirmação consumido por scanner de e-mail        | `medium`      | `medium` | Link aponta para o SPA e a confirmação é feita por `POST`, não por `GET`                 |
| Link aponta para a página da 003, que ainda não existe     | `medium`      | `medium` | Publicar 002 e 003 na mesma janela ou manter o cadastro oculto por feature flag          |
| Validação divergente entre cliente e servidor              | `medium`      | `low`    | Regras compartilhadas em `validation.ts` e testes dos dois lados                         |

## Referências

- [001 — Auth Foundation](./001-auth-foundation.md)
- [003 — Auth Confirm Account](./003-auth-confirm-account.md)
- [004 — Auth Sign-in](./004-auth-sign-in.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [DESIGN_SYSTEM.md](../.docs/DESIGN_SYSTEM.md)
