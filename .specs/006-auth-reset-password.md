# 006 — Auth Reset Password

## Metadado

| Campo         | Valor      |
| ------------- | ---------- |
| Status        | `implemented` |
| Prioridade    | `high`     |
| Criado em     | 2026-10-29 |
| Atualizado em | 2026-11-01 |
| Responsável   | Renato     |

## Resumo

Página de reset que recebe o token do e-mail, pede a nova senha e a confirmação, revoga todas as sessões, envia e-mail de sucesso e volta para o login.

## Contexto

Depende de [001 — Auth Foundation](./001-auth-foundation.md) e [005 — Auth Forgot Password](./005-auth-forgot-password.md). A 005 envia o link com token; esta spec fecha a recuperação de senha.

O reset é uma operação sensível: além de trocar a senha, revoga todas as sessões ativas. Se alguém estava logado em outra máquina com a senha antiga, a sessão deixa de valer. O e-mail de sucesso é uma notificação de segurança, não um link de ação.

## Escopo

### Dentro do escopo

- Página pública `/auth/reset-password?token=...`
- Campos de nova senha e confirmação da nova senha
- `POST /api/v1/auth/reset-password` com token, senha e confirmação
- Validação de token, expiração, uso único e match entre as senhas
- Atualização do hash Bcrypt
- Revogação de todas as sessões ativas do usuário
- Consumo do token na mesma transação da troca de senha
- E-mail de sucesso em en-US
- Redirecionamento para `/auth/sign-in` com mensagem de sucesso
- Estados de token inválido, expirado ou já usado
- Testes unitários, de integração e E2E

### Fora do escopo

- Solicitação do reset e envio do link — [005](./005-auth-forgot-password.md)
- Login após o reset — [004](./004-auth-sign-in.md)
- Histórico de senhas, política de complexidade além do mínimo de 8 caracteres
- Reset de MFA, e-mail ou dados de perfil
- Restauração automática da sessão após o reset

## Requisitos funcionais

| ID    | Requisito          | Descrição                                                                                                                                        |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| RF-01 | Página de reset    | `/auth/reset-password?token=...` extrai o token, exibe nova senha e confirmação, com labels, erros por campo e estado de carregamento            |
| RF-02 | Validação          | Senha com no mínimo 8 caracteres; senha e confirmação idênticas; validação no cliente e no servidor                                              |
| RF-03 | Endpoint           | `POST /api/v1/auth/reset-password` recebe `{ token, password, passwordConfirmation }` e responde 204 em caso de sucesso                          |
| RF-04 | Token e troca      | Rejeita token ausente, desconhecido, expirado, de outro tipo ou já usado. Atualiza o hash e consome o token na mesma transação                   |
| RF-05 | Revogação e e-mail | Revoga todas as sessões ativas do usuário e envia e-mail de sucesso em en-US, sem token nem senha                                                |
| RF-06 | Redirecionamento   | Sucesso limpa qualquer token local, navega para `/auth/sign-in` com mensagem de sucesso; erro mantém a página com link para solicitar novo reset |

## Requisitos não-funcionais

| ID     | Requisito       | Descrição                                                                                                              |
| ------ | --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança       | Token de uso único, hash no banco, `Referrer-Policy: no-referrer`; senha nunca logada nem retornada; sessões revogadas |
| RNF-02 | Idioma          | Todos os textos da página, mensagens de erro/sucesso e template de e-mail em en-US                                     |
| RNF-03 | Acessibilidade  | Labels associados, erros com `aria-live`, foco no primeiro campo inválido e navegação completa por teclado             |
| RNF-04 | Responsividade  | Layout mobile-first, funcional de 320px a 2560px e com zoom de 200%                                                    |
| RNF-05 | Observabilidade | Log de reset, revogação e envio com `requestId` e `userId`, sem token nem senha                                        |
| RNF-06 | Testes          | Unitários do caso de uso, integração com repositório/mailer falsos e E2E de reset válido, expirado e reutilizado       |

## Critérios de aceite

- [ ] `/auth/reset-password?token=...` renderiza o formulário acessível sem sessão
- [ ] Senhas divergentes bloqueiam o submit no cliente e retornam 400 no servidor
- [ ] Token válido troca a senha e retorna 204
- [ ] A senha antiga deixa de autenticar e a nova autentica em `/auth/sign-in`
- [ ] Todas as sessões ativas do usuário são revogadas
- [ ] O e-mail de sucesso é enviado sem token nem senha
- [ ] O mesmo token não pode ser usado duas vezes
- [ ] Token expirado, desconhecido ou de outro tipo retorna erro e não altera a senha
- [ ] Sucesso redireciona para `/auth/sign-in` com mensagem de sucesso
- [ ] A URL não vaza o token por `Referer`
- [ ] `npm run lint`, `npm run check-types`, `npm run test`, `npm run test:e2e`, `npm run build` e `npm run format:check` passam

## Impacto técnico

### Arquivos afetados

| Arquivo                                                            | Ação   | Descrição                                                         |
| ------------------------------------------------------------------ | ------ | ----------------------------------------------------------------- |
| `apps/api/src/modules/auth/application/reset-password.use-case.ts` | create | Validação do token, troca de senha, revogação e e-mail            |
| `apps/api/src/modules/auth/interface/reset-password.controller.ts` | create | `POST /api/v1/auth/reset-password`                                |
| `apps/api/src/modules/auth/interface/dto/reset-password.dto.ts`    | create | DTO com token, senha e confirmação                                |
| `apps/app/src/modules/auth/pages/reset-password-page.tsx`          | create | Formulário, estados e redirecionamento                            |
| `apps/app/src/modules/auth/api/reset-password.ts`                  | create | Chamada ao endpoint                                               |
| `apps/app/src/App.tsx`                                             | modify | Rota `/auth/reset-password`                                       |
| `apps/api/src/modules/auth/**/*.test.ts`                           | create | Testes de token, troca de senha e revogação                       |
| `apps/app/e2e/auth-reset-password.spec.ts`                         | create | E2E de reset válido, expirado, reutilizado e login com nova senha |

### Dependências

- [001 — Auth Foundation](./001-auth-foundation.md): Bcrypt, tokens, sessões e `EmailService`
- [005 — Auth Forgot Password](./005-auth-forgot-password.md): token de reset enviado por e-mail
- [004 — Auth Sign-in](./004-auth-sign-in.md): login com a nova senha na validação E2E
- [000 — Foundation](./000-foundation.md): API e cliente existentes
- `class-validator` e `class-transformer` para o DTO

### Componentes de UI

| Componente | Origem     | Uso                           |
| ---------- | ---------- | ----------------------------- |
| `Card`     | `@repo/ui` | Container do formulário       |
| `Input`    | `@repo/ui` | Nova senha e confirmação      |
| `Label`    | `@repo/ui` | Rótulos acessíveis            |
| `Button`   | `@repo/ui` | Submit e link para novo reset |
| `Toaster`  | `@repo/ui` | Feedback de sucesso e erro    |

## Plano de implementação

### Etapa 1 — Caso de uso

Implementar validação do token, troca de hash, revogação de sessões e envio do e-mail na mesma transação lógica. Cobrir com testes.

### Etapa 2 — Endpoint

Expor `POST /api/v1/auth/reset-password` com 204, validação de DTO e integração ao filtro de erro.

### Etapa 3 — Página

Construir `/auth/reset-password` com token da query string, validação, estados e redirecionamento para o login.

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

| Risco                                          | Probabilidade | Impacto  | Mitigação                                                                                      |
| ---------------------------------------------- | ------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Token de reset vazar em `Referer` ou histórico | `low`         | `high`   | `Referrer-Policy: no-referrer`, remoção do token da URL após o uso e página sem links externos |
| Corrida entre dois resets com o mesmo token    | `low`         | `medium` | Consumo condicional (`used_at IS NULL`) na mesma transação da troca de senha                   |
| Pessoa reutilizar a senha antiga               | `medium`      | `low`    | Fora do escopo desta spec; histórico de senhas pode ser especificado depois                    |
| E-mail de sucesso falhar após a troca          | `medium`      | `low`    | Troca prevalece; falha é logada e não bloqueia o redirecionamento                              |
| Sessões antigas continuarem válidas por cache  | `low`         | `high`   | Revogação no banco é a fonte da verdade; guard consulta a sessão a cada requisição             |

## Referências

- [001 — Auth Foundation](./001-auth-foundation.md)
- [004 — Auth Sign-in](./004-auth-sign-in.md)
- [005 — Auth Forgot Password](./005-auth-forgot-password.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [DESIGN_SYSTEM.md](../.docs/DESIGN_SYSTEM.md)
