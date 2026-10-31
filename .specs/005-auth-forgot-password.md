# 005 — Auth Forgot Password

## Metadado

| Campo         | Valor      |
| ------------- | ---------- |
| Status        | `approved` |
| Prioridade    | `high`     |
| Criado em     | 2026-10-29 |
| Atualizado em | 2026-10-29 |
| Responsável   | Renato     |

## Resumo

Solicitação de reset de senha por e-mail, com resposta genérica para qualquer endereço e link de uso único que leva à página de reset.

## Contexto

Depende de [001 — Auth Foundation](./001-auth-foundation.md) e [003 — Auth Confirm Account](./003-auth-confirm-account.md). A 003 garante o fluxo de conta confirmada usado no E2E da jornada completa.

A resposta é sempre a mesma, exista ou não o e-mail, para não permitir enumeração de usuários. Se a conta existir, um token de reset é emitido e enviado; se não existir, nada é enviado, mas a resposta não muda.

Esta spec entrega apenas a solicitação. A página que recebe o token e troca a senha é a [006 — Auth Reset Password](./006-auth-reset-password.md).

## Escopo

### Dentro do escopo

- Página pública `/auth/forgot-password`
- Formulário com e-mail
- `POST /api/v1/auth/forgot-password`
- Resposta genérica 202 para qualquer e-mail
- Emissão de token de reset de uso único, válido por 1 hora, invalidando tokens anteriores do mesmo tipo
- E-mail en-US com link `APP_URL/auth/reset-password?token=...`
- Estado de feedback na própria página, orientando a abrir o e-mail
- Testes unitários, de integração e E2E

### Fora do escopo

- Página de reset e alteração da senha — [006](./006-auth-reset-password.md)
- Reenvio explícito de e-mail de reset
- Reset por SMS, código numérico ou contato com suporte
- Rate limiting distribuído e captcha
- Revelar se o e-mail existe ou se a conta está confirmada

## Requisitos funcionais

| ID    | Requisito       | Descrição                                                                                                                             |
| ----- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Formulário      | `/auth/forgot-password` tem campo de e-mail, label, validação de formato, estado de carregamento e link de volta para `/auth/sign-in` |
| RF-02 | Endpoint        | `POST /api/v1/auth/forgot-password` recebe `{ email }` e responde 202 com mensagem genérica em en-US                                  |
| RF-03 | Não enumeração  | E-mail inexistente, não confirmado ou confirmado recebe a mesma resposta, com o mesmo status e sem diferença observável de corpo      |
| RF-04 | Token de reset  | Se a conta existir, emite token de uso único válido por 1 hora e invalida tokens de reset anteriores do usuário                       |
| RF-05 | E-mail de reset | Envia e-mail en-US com link para `/auth/reset-password?token=...`, sem revelar dados sensíveis da conta                               |
| RF-06 | Feedback        | Após o envio, a página exibe confirmação genérica e orienta a verificar a caixa de entrada e o spam                                   |

## Requisitos não-funcionais

| ID     | Requisito       | Descrição                                                                                                                  |
| ------ | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança       | Token persistido apenas como hash; resposta e tempo de resposta não distinguem e-mail existente de inexistente             |
| RNF-02 | Idioma          | Todos os textos da página, mensagem de sucesso e template de e-mail em en-US                                               |
| RNF-03 | Acessibilidade  | Label associado, erro com `aria-live`, foco visível e navegação completa por teclado                                       |
| RNF-04 | Responsividade  | Layout mobile-first, funcional de 320px a 2560px e com zoom de 200%                                                        |
| RNF-05 | Observabilidade | Log de solicitação e de envio com `requestId`, sem e-mail completo em produção e sem token                                 |
| RNF-06 | Testes          | Unitários do caso de uso, integração com repositório/mailer falsos e E2E de solicitação com e-mail existente e inexistente |

## Critérios de aceite

- [ ] `/auth/forgot-password` renderiza o formulário acessível sem sessão
- [ ] E-mail válido retorna 202 com mensagem genérica
- [ ] E-mail inexistente retorna a mesma resposta 202
- [ ] Conta existente recebe e-mail com link para `/auth/reset-password?token=...`
- [ ] Conta inexistente não gera token nem e-mail
- [ ] Token de reset expira em 1 hora e é de uso único
- [ ] Solicitar novamente invalida o token anterior
- [ ] A página exibe feedback genérico após o envio
- [ ] Nenhuma resposta ou log contém token ou informação sobre existência da conta
- [ ] `npm run lint`, `npm run check-types`, `npm run test`, `npm run test:e2e`, `npm run build` e `npm run format:check` passam

## Impacto técnico

### Arquivos afetados

| Arquivo                                                             | Ação   | Descrição                                             |
| ------------------------------------------------------------------- | ------ | ----------------------------------------------------- |
| `apps/api/src/modules/auth/application/forgot-password.use-case.ts` | create | Busca de conta, emissão do token e envio do e-mail    |
| `apps/api/src/modules/auth/interface/forgot-password.controller.ts` | create | `POST /api/v1/auth/forgot-password`                   |
| `apps/api/src/modules/auth/interface/dto/forgot-password.dto.ts`    | create | DTO com e-mail                                        |
| `apps/app/src/modules/auth/pages/forgot-password-page.tsx`          | create | Formulário e estado de feedback                       |
| `apps/app/src/modules/auth/api/forgot-password.ts`                  | create | Chamada ao endpoint                                   |
| `apps/app/src/App.tsx`                                              | modify | Rota `/auth/forgot-password`                          |
| `apps/api/src/modules/auth/**/*.test.ts`                            | create | Testes de resposta genérica e emissão de token        |
| `apps/app/e2e/auth-forgot-password.spec.ts`                         | create | E2E de solicitação com e-mail existente e inexistente |

### Dependências

- [001 — Auth Foundation](./001-auth-foundation.md): `EmailService`, tokens de uso único e cliente HTTP
- [003 — Auth Confirm Account](./003-auth-confirm-account.md): conta confirmada para a jornada completa
- [000 — Foundation](./000-foundation.md): API e cliente existentes
- `class-validator` e `class-transformer` para o DTO

### Componentes de UI

| Componente | Origem     | Uso                         |
| ---------- | ---------- | --------------------------- |
| `Card`     | `@repo/ui` | Container do formulário     |
| `Input`    | `@repo/ui` | Campo de e-mail             |
| `Label`    | `@repo/ui` | Rótulo acessível            |
| `Button`   | `@repo/ui` | Submit e volta para o login |
| `Toaster`  | `@repo/ui` | Feedback genérico de envio  |

## Plano de implementação

### Etapa 1 — Caso de uso

Implementar busca de conta confirmada, emissão de token e envio de e-mail, garantindo resposta idêntica para qualquer entrada.

### Etapa 2 — Endpoint

Expor `POST /api/v1/auth/forgot-password` com resposta 202 genérica e integração ao filtro de erro.

### Etapa 3 — Página

Construir `/auth/forgot-password` com validação, estados e feedback acessível.

### Etapa 4 — Verificação

```bash
npm run lint
npm run check-types
npm run test
npm run test:e2e
npm run build
npm run format:check
```

## Riscos e ressalvas

| Risco                                                  | Probabilidade | Impacto  | Mitigação                                                                               |
| ------------------------------------------------------ | ------------- | -------- | --------------------------------------------------------------------------------------- |
| Enumeração por diferença de tempo de resposta          | `medium`      | `medium` | Executar o caminho de envio de forma assíncrona ou equalizar o tempo; teste de resposta |
| Abuso do endpoint para enviar muitos e-mails           | `high`        | `medium` | Fora do escopo desta spec; registrar dívida e priorizar rate limiting antes de produção |
| Link de reset consumido por scanner de e-mail          | `medium`      | `medium` | Link abre o SPA e o reset só ocorre no `POST` da página 006                             |
| Link aponta para a página da 006, que ainda não existe | `medium`      | `medium` | Publicar 005 e 006 na mesma janela                                                      |
| Token de reset vazar em `Referer`                      | `low`         | `high`   | `Referrer-Policy: no-referrer` na página de reset e remoção do token da URL após o uso  |
| E-mail de reset cair em spam                           | `medium`      | `medium` | `EMAIL_FROM` verificado no provedor e template textual simples                          |

## Referências

- [001 — Auth Foundation](./001-auth-foundation.md)
- [003 — Auth Confirm Account](./003-auth-confirm-account.md)
- [006 — Auth Reset Password](./006-auth-reset-password.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [DESIGN_SYSTEM.md](../.docs/DESIGN_SYSTEM.md)
