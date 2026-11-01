# Refatoração de vertical slices — 20261101-132146

## Metadado

| Campo      | Valor                                                    |
| ---------- | -------------------------------------------------------- |
| Status     | `proposed`                                               |
| Criado em  | 2026-11-01                                               |
| Branch     | `refactor/vertical-slices-20261101-132146`               |
| Base do PR | `main`                                                   |
| Escopo     | `apps/api/src/modules` (slices `auth`, `health`, `ping`) |
| Slices     | `auth`, `health`, `ping`                                 |
| Severidade | `blocker+major` (minors inseparáveis incluídos)          |
| Auditoria  | `.refactor/20261101-132146/audit.md`                     |
| ADR        | `0014-request-handler-por-endpoint-e-use-case-1-para-1`  |

## Resumo da auditoria

| Slice  | Bloqueadores | Majoritários | Menores | Info |
| ------ | ------------ | ------------ | ------- | ---- |
| auth   | 3            | 8            | 8       | 1    |
| health | 0            | 1            | 3       | 1    |
| ping   | 1            | 1            | 1       | 1    |

Total de achados confirmados: 30. Falsos positivos registrados: 8 (`DEP-08`).

## Objetivo

Fazer os slices `auth`, `health` e `ping` aderirem ao contrato de request handler por endpoint com use case 1:1 (ADR-0014): eliminar acesso de handler a repositório/SDK, mover efeito colateral de métrica para cross-cutting, extrair constante compartilhada entre handlers, alinhar validação de e-mail DTO↔domínio e renomear `.controller.ts`/`*Controller` para `.handler.ts`/`*Handler`. Sem mudança de contrato HTTP.

## Fora do escopo

- Achados `minor` não inseparáveis mecanicamente: `J-03` (`process.uptime()`), `J-08` (`APP_INFO` string vs `Symbol`), `J-09` (acoplamento de teste a internals), `IF-05` (método `execute`).
- Achados `info` (`IF-05`).
- Falsos positivos `DEP-08` (interface importando tipos/erros de domínio para mapear HTTP).
- Slices fora de `auth`/`health`/`ping`; infraestrutura inexistente em `health`/`ping` (não é violação).
- Mudança de contrato HTTP, migrations, alteração de schema, renomeação de adapters por preferência.

## Decisões

| Decisão                                                                                                               | Racional                                                                                              | Alternativa descartada                               |
| --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Incluir `IF-04` (classe `*Controller` → `*Handler`) junto de `IF-01` (arquivo)                                        | Renomear arquivo sem classe deixa inconsistência e o auditor segue apontando; é o mesmo diff mecânico | Manter classe legada e só renomear arquivo           |
| Métrica `pingTotal` via interceptor de interface, não no use case                                                     | Mantém `application` puro (sem importar `shared` observability) e preserva teste do use case          | Injetar `MetricsService` no `GetPingUseCase`         |
| Validação de e-mail do DTO via validador customizado reutilizando `isValidEmail` do domínio                           | Elimina segunda fonte de verdade (regex)                                                              | Manter `IsEmail` e documentar divergência            |
| `GetSessionUseCase` lança `SessionUserNotFoundError` (novo erro de domínio) mapeado para 401 "Session user not found" | Encapsula regra no use case; handler só traduz                                                        | Reutilizar `InvalidTokenError` (semântica incorreta) |
| Referenciar ADR-0014 existente, sem criar novo ADR                                                                    | A convenção request handler/use case 1:1 já está registrada (status `proposed`)                       | Criar ADR-0015 duplicando a decisão                  |

## Work units

### WU-01 — Criar `GetSessionUseCase` e remover acesso a repositório do handler (auth)

| Campo            | Valor                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice            | `auth`                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Achados          | `UC-01`, `UC-02`, `J-01`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Severidade       | `blocker`                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Arquivos         | criar `application/get-session.use-case.ts`, `application/get-session.use-case.test.ts`; alterar `domain/errors.ts`, `interface/auth-session.controller.ts`, `auth.module.ts`                                                                                                                                                                                                                                                               |
| Teste primeiro   | `application/get-session.use-case.test.ts`: retorna `{ user }` público quando o usuário existe; lança erro de domínio quando não existe. Deve falhar antes da implementação.                                                                                                                                                                                                                                                                |
| Ação             | 1. Adicionar `SessionUserNotFoundError` em `domain/errors.ts`. 2. Criar `GetSessionUseCase` injetando `AUTH_USER_REPOSITORY`, chamando `findById` e `toPublicUser`, lançando o erro se null. 3. Handler passa a injetar só o use case, extrair `userId` de `request.user?.id`, chamar `execute` e traduzir o erro de domínio para `UnauthorizedException` (401 "Session user not found"). 4. Registrar o use case em `providers` do módulo. |
| Fora de escopo   | Renomear arquivo/classe (WU-05); alterar `AuthGuard`; mudar status/corpo HTTP.                                                                                                                                                                                                                                                                                                                                                              |
| Risco            | médio — interação com guard e mapeamento de erro; mitigar com testes de integração do endpoint.                                                                                                                                                                                                                                                                                                                                             |
| Rollback         | reverter arquivos do WU.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Commit sugerido  | `refactor(api): add GetSessionUseCase and remove repository from session handler`                                                                                                                                                                                                                                                                                                                                                           |
| Critério de done | testes do WU verdes + `format:check` + `lint` + `check-types` + `test`; contrato HTTP inalterado.                                                                                                                                                                                                                                                                                                                                           |

### WU-02 — Mover incremento de métrica do ping para interceptor (ping)

| Campo            | Valor                                                                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice            | `ping`                                                                                                                                                                                                                                                                              |
| Achados          | `UC-02` (ping)                                                                                                                                                                                                                                                                      |
| Severidade       | `blocker`                                                                                                                                                                                                                                                                           |
| Arquivos         | criar `interface/ping-metrics.interceptor.ts`; alterar `interface/ping.controller.ts`, `ping.module.ts`                                                                                                                                                                             |
| Teste primeiro   | Interceptor/integração: requisição a `/api/v1/ping` incrementa `pingTotal`; handler não injeta `MetricsService`.                                                                                                                                                                    |
| Ação             | 1. Criar interceptor injetando `MetricsService`, incrementando `pingTotal` e chamando `next.handle()`. 2. Aplicar `@UseInterceptors(PingMetricsInterceptor)` ao handler. 3. Remover `MetricsService` do construtor do handler. 4. Registrar o interceptor em `providers` do módulo. |
| Fora de escopo   | Alterar `GetPingUseCase`; mudar rota/status.                                                                                                                                                                                                                                        |
| Risco            | baixo.                                                                                                                                                                                                                                                                              |
| Rollback         | reverter arquivos do WU.                                                                                                                                                                                                                                                            |
| Commit sugerido  | `refactor(api): move ping metric increment to interceptor`                                                                                                                                                                                                                          |
| Critério de done | handler injeta apenas o use case; testes do WU verdes + gates.                                                                                                                                                                                                                      |

### WU-03 — Extrair `INVALID_TOKEN_MESSAGE` para arquivo próprio da interface (auth)

| Campo            | Valor                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Slice            | `auth`                                                                                                                                                                                                                                           |
| Achados          | `DEP-09`                                                                                                                                                                                                                                         |
| Severidade       | `major`                                                                                                                                                                                                                                          |
| Arquivos         | criar `interface/messages.ts`; alterar `interface/confirm-account.controller.ts`, `interface/reset-password.controller.ts`, `interface/confirm-account.controller.test.ts`, `interface/reset-password.controller.test.ts`                        |
| Teste primeiro   | Testes existentes de confirm/reset continuam verdes após troca do import.                                                                                                                                                                        |
| Ação             | 1. Criar `interface/messages.ts` exportando `INVALID_TOKEN_MESSAGE`. 2. Remover o export de `confirm-account.controller.ts` e importar de `messages.ts`. 3. Atualizar `reset-password.controller.ts` e os testes para importar de `messages.ts`. |
| Fora de escopo   | Centralizar outras constantes de handler (`SIGN_UP_ACCEPTED_MESSAGE`, etc.).                                                                                                                                                                     |
| Risco            | baixo.                                                                                                                                                                                                                                           |
| Rollback         | reverter arquivos do WU.                                                                                                                                                                                                                         |
| Commit sugerido  | `refactor(api): extract shared interface message constant`                                                                                                                                                                                       |
| Critério de done | sem handler importando handler; testes/gates verdes.                                                                                                                                                                                             |

### WU-04 — Alinhar validação de e-mail do DTO com o domínio (auth)

| Campo            | Valor                                                                                                                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice            | `auth`                                                                                                                                                                                                                                                                                                                       |
| Achados          | `J-07`                                                                                                                                                                                                                                                                                                                       |
| Severidade       | `major`                                                                                                                                                                                                                                                                                                                      |
| Arquivos         | alterar `domain/email.ts`; criar `interface/dto/is-valid-email.validator.ts`; alterar `interface/dto/sign-up.dto.ts`, `interface/dto/sign-in.dto.ts`                                                                                                                                                                         |
| Teste primeiro   | Testes de DTO para e-mails válidos/inválidos conforme a regex do domínio (`isValidEmail`) passam.                                                                                                                                                                                                                            |
| Ação             | 1. Garantir que `isValidEmail` (e/ou `EMAIL_PATTERN`) esteja exportado de `domain/email.ts`. 2. Criar validador customizado implementando `ValidatorConstraintInterface` chamando `isValidEmail`. 3. Substituir `@IsEmail` por `@Validate(IsValidEmailValidator, { message: "Enter a valid email address" })` nos dois DTOs. |
| Fora de escopo   | Alterar a regex do domínio; outros campos do DTO.                                                                                                                                                                                                                                                                            |
| Risco            | médio — casos de borda de e-mail; mitigar mantendo mensagem e cobertura de testes.                                                                                                                                                                                                                                           |
| Rollback         | reverter arquivos do WU.                                                                                                                                                                                                                                                                                                     |
| Commit sugerido  | `refactor(api): align dto email validation with domain`                                                                                                                                                                                                                                                                      |
| Critério de done | uma única fonte de verdade para e-mail; testes/gates verdes.                                                                                                                                                                                                                                                                 |

### WU-05 — Renomear handlers do `auth` (`.controller` → `.handler`) (auth)

| Campo            | Valor                                                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slice            | `auth`                                                                                                                                                                                                |
| Achados          | `IF-01` (7), `IF-04` (7)                                                                                                                                                                              |
| Severidade       | `major` (`IF-01`) + `minor` (`IF-04`, inseparável mecanicamente)                                                                                                                                      |
| Arquivos         | renomear 7 `interface/*.controller.ts` → `*.handler.ts` e 7 `*.controller.test.ts` → `*.handler.test.ts`; classes `*Controller` → `*Handler`; alterar `auth.module.ts` e imports de constantes/testes |
| Teste primeiro   | Suíte de integração do auth continua verde após renomeação.                                                                                                                                           |
| Ação             | 1. Renomear arquivos e classes. 2. Atualizar imports no módulo e testes. 3. Atualizar imports de constantes que permanecem no handler (ex.: `SIGN_UP_ACCEPTED_MESSAGE`).                              |
| Fora de escopo   | Alterar lógica de negócio; renomear adapters.                                                                                                                                                         |
| Risco            | médio — diff mecânico grande; mitigar por slice e revisão de imports.                                                                                                                                 |
| Rollback         | reverter arquivos do WU.                                                                                                                                                                              |
| Commit sugerido  | `refactor(api): rename auth controllers to handlers`                                                                                                                                                  |
| Critério de done | nenhum `.controller.ts` em `auth/interface`; auditoria `IF-01`/`IF-04` zerada para auth; gates verdes.                                                                                                |
| Dependências     | WU-01, WU-03, WU-04.                                                                                                                                                                                  |

### WU-06 — Renomear handler do `health` (health)

| Campo            | Valor                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Slice            | `health`                                                                                                                                         |
| Achados          | `IF-01`, `IF-04`                                                                                                                                 |
| Severidade       | `major` (`IF-01`) + `minor` (`IF-04`, inseparável mecanicamente)                                                                                 |
| Arquivos         | renomear `interface/health.controller.ts` → `health.handler.ts` e teste; classe `HealthController` → `HealthHandler`; alterar `health.module.ts` |
| Teste primeiro   | Testes HTTP de `/health` continuam verdes.                                                                                                       |
| Ação             | Renomear arquivo/classe e atualizar módulo/testes.                                                                                               |
| Fora de escopo   | `J-03` (`process.uptime()`), `J-08` (`APP_INFO` Symbol).                                                                                         |
| Risco            | baixo.                                                                                                                                           |
| Rollback         | reverter arquivos do WU.                                                                                                                         |
| Commit sugerido  | `refactor(api): rename health controller to handler`                                                                                             |
| Critério de done | nenhum `.controller.ts` em `health/interface`; gates verdes.                                                                                     |
| Dependências     | nenhuma (recomendado após WU-05).                                                                                                                |

### WU-07 — Renomear handler do `ping` (ping)

| Campo            | Valor                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Slice            | `ping`                                                                                                                                                             |
| Achados          | `IF-01`, `IF-04`                                                                                                                                                   |
| Severidade       | `major` (`IF-01`) + `minor` (`IF-04`, inseparável mecanicamente)                                                                                                   |
| Arquivos         | renomear `interface/ping.controller.ts` → `ping.handler.ts` e teste; classe `PingController` → `PingHandler`; alterar `ping.module.ts` e referência do interceptor |
| Teste primeiro   | Testes HTTP de `/ping` continuam verdes.                                                                                                                           |
| Ação             | Renomear arquivo/classe e atualizar módulo/testes/interceptor.                                                                                                     |
| Fora de escopo   | Alterar `GetPingUseCase`.                                                                                                                                          |
| Risco            | baixo.                                                                                                                                                             |
| Rollback         | reverter arquivos do WU.                                                                                                                                           |
| Commit sugerido  | `refactor(api): rename ping controller to handler`                                                                                                                 |
| Critério de done | nenhum `.controller.ts` em `ping/interface`; gates verdes.                                                                                                         |
| Dependências     | WU-02.                                                                                                                                                             |

## Ordem e dependências

- WU-01 → WU-05 (rename auth depende do handler já usando use case).
- WU-03 → WU-05 (constante extraída antes da renomeação).
- WU-04 → WU-05 (validação alinhada antes da renomeação).
- WU-02 → WU-07 (interceptor criado antes da renomeação do ping).
- WU-06 independente (recomendado após WU-05 por revisão).
- Nenhum WU pode deixar a árvore vermelha; o commit acontece só com o alvo verde.

## Gates

| Ordem | Comando                | Quando                                     |
| ----- | ---------------------- | ------------------------------------------ |
| 0     | baseline dos gates     | antes de qualquer edição                   |
| 1     | `npm run format:check` | ao final de cada WU (rápido)               |
| 2     | `npm run lint`         | ao final de cada WU (workspace)            |
| 3     | `npm run check-types`  | ao final de cada WU                        |
| 4     | `npm run test`         | ao final de cada WU afetado                |
| 5     | `npm run build`        | antes do commit final                      |
| 6     | `npm run test:e2e`     | se rota/contrato HTTP mudou (não esperado) |

Se `npm`/`npx` estiverem bloqueados no shell, rode `cmd /c "npm run <script>"` ou o binário de `node_modules`. O baseline fica em `.refactor/20261101-132146/baseline.md`.

## Aprovação

- [ ] Baseline dos gates registrado
- [ ] Auditoria revisada e falsos positivos registrados
- [ ] Plano aprovado pelo usuário
- [ ] Branch criada a partir de `main`
- [ ] ADR definido (0014, status `proposed`)
- [ ] Working tree limpo

## Execução

| WU    | Status | Commit  | Testes                              | Observação |
| ----- | ------ | ------- | ----------------------------------- | ---------- |
| WU-01 | done   | b9fa18b | get-session use-case + auth-session | —          |
| WU-02 | done   | 7db9dfc | ping app + module                   | —          |
| WU-03 | done   | 50302e3 | confirm/reset tests                 | —          |
| WU-04 | done   | 8e0b809 | dto tests + auth                    | —          |
| WU-05 | done   | 81d4a38 | auth suite                          | —          |
| WU-06 | done   | 997429d | health/app tests                    | —          |
| WU-07 | done   | ee3f0a1 | ping/app tests                      | —          |

## Riscos residuais

- Contrato HTTP pode mudar se o mapeamento de erro de `GetSessionUseCase` for alterado inadvertidamente.
- Renomeação mecânica pode deixar referências órfãs em specs/planos antigos (não afetam build, mas podem confundir).
- Cobertura de e2e pode ser `deferred (infra)` se indisponível.
- Minors excluídos (`J-03`, `J-08`, `J-09`, `IF-05`) permanecem como dívida técnica registrada.
