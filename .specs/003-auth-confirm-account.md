# 003 — Auth Confirm Account

## Metadado

| Campo         | Valor      |
| ------------- | ---------- |
| Status        | `approved` |
| Prioridade    | `high`     |
| Criado em     | 2026-10-29 |
| Atualizado em | 2026-10-29 |
| Responsável   | Renato     |

## Resumo

O link enviado no cadastro confirma a conta, cria a sessão automaticamente e direciona a pessoa para a home privada em `/app`.

## Contexto

Depende de [001 — Auth Foundation](./001-auth-foundation.md) e [002 — Auth Sign-up](./002-auth-sign-up.md). A 002 cria a conta não confirmada e envia o token; esta spec fecha a jornada.

A confirmação é feita por `POST`, não por `GET`, para que scanners de e-mail que apenas abrem o link não consumam o token. O link do e-mail abre a página do SPA `/auth/confirm-account?token=...`, que troca o token por uma sessão.

A sessão é criada pelo serviço da 001, que já revoga sessões anteriores e dispara o e-mail de nova sessão. Esta spec não reimplementa essa regra.

## Escopo

### Dentro do escopo

- Página pública `/auth/confirm-account` que lê o token da query string
- `POST /api/v1/auth/confirm-account` com o token
- Validação de tipo, hash, expiração e uso único do token
- Marcação de `email_confirmed_at` e consumo do token na mesma transação
- Criação de sessão pela fundação, com revogação das anteriores e e-mail de nova sessão
- Retorno do token de sessão e do usuário para o SPA
- Persistência do token e redirecionamento para `/app` em caso de sucesso
- Estados de token inválido, expirado ou já usado, com link para `/auth/sign-in`
- Testes unitários, de integração e E2E

### Fora do escopo

- Cadastro e envio do e-mail de confirmação — [002](./002-auth-sign-up.md)
- Login e logout — [004](./004-auth-sign-in.md)
- Reenvio de confirmação e correção de e-mail
- Recuperação de token perdido
- Confirmação por código numérico

## Requisitos funcionais

| ID    | Requisito                 | Descrição                                                                                                                                                                                          |
| ----- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Página de confirmação     | `/auth/confirm-account?token=...` extrai o token, mostra estado de carregamento e executa a confirmação automaticamente ao montar                                                                  |
| RF-02 | Endpoint                  | `POST /api/v1/auth/confirm-account` recebe `{ token }` e responde 200 com `{ token, user }` em caso de sucesso                                                                                     |
| RF-03 | Validação do token        | Rejeita token ausente, desconhecido, de tipo diferente, expirado ou já usado com erro 400/410 e mensagem genérica em en-US                                                                         |
| RF-04 | Consumo atômico           | Marca `email_confirmed_at`, consome o token e cria a sessão em transação; falha em qualquer passo não deixa estado parcial                                                                         |
| RF-05 | Sessão e redirecionamento | Usa o serviço de sessão da 001 (sessão única + e-mail de nova sessão), grava o token no storage do SPA e navega para `/app`; erro mantém a pessoa em `/auth/confirm-account` com link para o login |

## Requisitos não-funcionais

| ID     | Requisito       | Descrição                                                                                                               |
| ------ | --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança       | Token nunca logado; página com `Referrer-Policy: no-referrer`; token de uso único e invalidação imediata após o consumo |
| RNF-02 | Idioma          | Mensagens, botões e título da página em en-US                                                                           |
| RNF-03 | Acessibilidade  | Estado de carregamento anunciado, erro com `role="alert"`, foco visível e navegação por teclado                         |
| RNF-04 | Responsividade  | Layout funcional de 320px a 2560px e com zoom de 200%                                                                   |
| RNF-05 | Observabilidade | Log de confirmação e de falha com `requestId`, sem token                                                                |
| RNF-06 | Testes          | Unitários do caso de uso, integração com repositório falso e E2E do link válido, expirado e já usado                    |

## Critérios de aceite

- [ ] Link válido confirma a conta e grava `email_confirmed_at`
- [ ] Link válido cria sessão, grava o token no SPA e redireciona para `/app`
- [ ] O e-mail de nova sessão é enviado na confirmação
- [ ] O mesmo token não pode ser usado duas vezes
- [ ] Token expirado, desconhecido ou de outro tipo retorna erro e não confirma a conta
- [ ] Falha no meio do processo não confirma a conta nem cria sessão
- [ ] A página exibe erro acessível e link para `/auth/sign-in` quando o token é inválido
- [ ] A URL não vaza o token por `Referer`
- [ ] `npm run lint`, `npm run check-types`, `npm run test`, `npm run test:e2e`, `npm run build` e `npm run format:check` passam

## Impacto técnico

### Arquivos afetados

| Arquivo                                                             | Ação   | Descrição                                       |
| ------------------------------------------------------------------- | ------ | ----------------------------------------------- |
| `apps/api/src/modules/auth/application/confirm-account.use-case.ts` | create | Validação, consumo do token e criação da sessão |
| `apps/api/src/modules/auth/interface/confirm-account.controller.ts` | create | `POST /api/v1/auth/confirm-account`             |
| `apps/api/src/modules/auth/interface/dto/confirm-account.dto.ts`    | create | DTO com o token                                 |
| `apps/app/src/modules/auth/pages/confirm-account-page.tsx`          | create | Página de confirmação com estados               |
| `apps/app/src/modules/auth/api/confirm-account.ts`                  | create | Chamada ao endpoint e gravação da sessão        |
| `apps/app/src/App.tsx`                                              | modify | Rota `/auth/confirm-account`                    |
| `apps/api/src/modules/auth/**/*.test.ts`                            | create | Testes do caso de uso e do controller           |
| `apps/app/e2e/auth-confirm-account.spec.ts`                         | create | E2E do link válido, expirado e reutilizado      |

### Dependências

- [001 — Auth Foundation](./001-auth-foundation.md): sessão única, `EmailService`, guard e cliente HTTP
- [002 — Auth Sign-up](./002-auth-sign-up.md): conta não confirmada e token de confirmação
- [000 — Foundation](./000-foundation.md): API e cliente existentes

### Componentes de UI

| Componente | Origem     | Uso                                |
| ---------- | ---------- | ---------------------------------- |
| `Card`     | `@repo/ui` | Container do estado de confirmação |
| `Button`   | `@repo/ui` | Ir para o login ou para a home     |
| `Skeleton` | `@repo/ui` | Estado de carregamento             |
| `Toaster`  | `@repo/ui` | Feedback de sucesso e erro         |

## Plano de implementação

### Etapa 1 — Caso de uso

Implementar validação e consumo atômico do token, com testes de token válido, expirado, de outro tipo e reutilizado.

### Etapa 2 — Endpoint

Expor `POST /api/v1/auth/confirm-account` e integrar ao serviço de sessão da fundação.

### Etapa 3 — Página

Construir a página com estados de carregamento, sucesso e erro, acessibilidade e `no-referrer`.

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

| Risco                                               | Probabilidade | Impacto  | Mitigação                                                                     |
| --------------------------------------------------- | ------------- | -------- | ----------------------------------------------------------------------------- |
| Scanner de e-mail consumir o token antes da pessoa  | `medium`      | `high`   | Link abre o SPA; confirmação só ocorre no `POST` disparado pela página        |
| Token vazar em `Referer` ao navegar para outro site | `low`         | `high`   | `Referrer-Policy: no-referrer` na página e remoção do token da URL após o uso |
| Corrida entre duas confirmações do mesmo token      | `low`         | `medium` | Consumo condicional (`used_at IS NULL`) na mesma transação                    |
| E-mail de nova sessão falhar após criar a sessão    | `medium`      | `low`    | Sessão prevalece; falha de e-mail é logada e não bloqueia o redirecionamento  |

## Referências

- [001 — Auth Foundation](./001-auth-foundation.md)
- [002 — Auth Sign-up](./002-auth-sign-up.md)
- [004 — Auth Sign-in](./004-auth-sign-in.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
