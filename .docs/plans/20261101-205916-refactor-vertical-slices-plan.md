# Refatoração de vertical slices — 20261101-205916

## Metadado

| Campo      | Valor                                                              |
| ---------- | ------------------------------------------------------------------ |
| Status     | `proposed`                                                         |
| Criado em  | 2026-11-01                                                         |
| Branch     | `refactor/vertical-slices-20261101-205916`                        |
| Base do PR | `main`                                                             |
| Escopo     | `apps/api/src/modules` (slices `agents`, `connectors`, `conversations`, `media`; toque de composição em `auth`) |
| Slices     | `agents`, `auth`, `connectors`, `conversations`, `health`, `media`, `ping` |
| Severidade | `blocker+major`                                                    |
| Auditoria  | `.refactor/20261101-205916/audit.md`                               |
| ADR        | `0014-request-handler-por-endpoint-e-use-case-1-para-1`             |

## Resumo da auditoria

| Slice          | Bloqueadores | Majoritários | Menores | Info |
| -------------- | ------------ | ------------ | ------- | ---- |
| agents         | 2            | 2            | 0       | 2    |
| auth           | 0            | 0            | 7       | 2    |
| connectors     | 8            | 5            | 5       | 3    |
| conversations  | 7            | 4            | 1       | 3    |
| health         | 0            | 0            | 3       | 2    |
| media          | 6            | 5            | 1       | 3    |
| ping           | 0            | 0            | 1       | 2    |
| **Total**      | **23**       | **16**       | **18**  | **17** |

Total de achados confirmados: 74. Falsos positivos registrados: 8 (`DEP-08` em auth/health/ping).

## Objetivo

Fazer os slices `agents`, `connectors`, `conversations` e `media` aderirem ao contrato de request handler por endpoint com use case 1:1 (ADR-0014): eliminar acesso de handler a repositório/SDK, inverter dependências de repositório para portas em `domain`, extrair infraestrutura de use cases, expor dependências cross-slice via API pública de módulo e fechar testes HTTP. Sem mudança de contrato HTTP, schema ou comportamento de negócio.

## Fora do escopo

- Achados `minor` (J-01 agents retorno 200 com erro, J-03 `process.uptime()`, J-06 domínio anêmico, J-08 `APP_INFO` como string, J-09 acoplamento de testes a internals, J-10 comentário, create-hash em application, DEP-04 isolado quando não exigido por extração de porta).
- Achados `info` (IF-05 método `execute`, PORT-01 adapter sem `implements`, J-11/J-12).
- Falsos positivos `DEP-08`.
- Slices `auth`, `health`, `ping` (já conformes; apenas toque de composição para expor `AuthGuard`).
- Mudança de contrato HTTP, migrations, alteração de schema, renomeação de adapters por preferência.

## Decisões

| Decisão | Racional | Alternativa descartada |
| ------- | -------- | ---------------------- |
| Expor `AuthGuard` via `auth/index.ts` (barrel na raiz da slice) + providers/exports do `AuthModule` | Mantém o guard (dependente de `SessionService`) na slice auth e dá uma API pública estável aos consumidores; evita mover código de negócio para `shared` | Mover `AuthGuard` para `src/shared` (viola "shared é técnico") |
| Expor catálogo de experts via `ExpertCatalogService` em `application` exportado por `AgentsModule` | Remove import cross-slice de `agents/domain` sem mover domínio para `shared`; conversas consome via DI | Importar `findExpert` direto de `agents/domain` (viola SLICE-01) |
| Manter imports de módulo (`AuthModule`, `AgentsModule`) nos composition roots | Importar o módulo da outra slice é a API pública do Nest; não é import de camada interna | Tentar eliminar totalmente o import de módulo (impossível sem perder DI) |
| Porta de repositório declarada em `domain` com token `Symbol(...)` em `{slice}.tokens.ts` | Compilador cobra o contrato; adapter implementa; use cases dependem da porta | Manter dependência da classe concreta (sem inversão) |
| Extrair I/O de use cases (process-connector, chat, generate-media) para portas/adapters em `infrastructure` | Use case testável sem rede/SDK; direção de dependência correta | Manter `fetch`/SDK/env no use case (não testável) |
| Criar use cases 1:1 para endpoints que hoje chamam repositório diretamente, antes de splitar handlers | Garante que o handler só conheça o use case; evita regressão de contrato | Manter acesso a repo no handler (viola UC-02/DEP-07) |
| Referenciar ADR-0014 existente, sem criar novo ADR | A convenção request handler/use case 1:1 já está registrada (status `proposed`) | Criar ADR duplicando a decisão |
| Resolver minors incidentais (DEP-04, create-hash, comentário) apenas como efeito colateral de WUs major | Mantém o escopo em blocker+major; não abre WU dedicado a minor | WU dedicado a cada minor (fora de escopo) |

## Work units

### WU-01 — Expor `AuthGuard` via API pública da slice auth

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `auth` (consumidores: `connectors`, `conversations`, `media`) |
| Achados          | `SLICE-01` (module/handler em connectors, conversations, media), `J-04` |
| Severidade       | `blocker` |
| Arquivos         | criar `auth/index.ts`; alterar `auth/auth.module.ts` (providers/exports); alterar imports em `connectors/interface/connectors.handler.ts`, `connectors/connectors.module.ts`, `conversations/interface/conversations.handler.ts`, `conversations/conversations.module.ts`, `media/interface/media.handler.ts`, `media/media.module.ts` |
| Teste primeiro   | App bootstrap (`app.test.ts`) e testes de auth continuam verdes após troca do import do guard |
| Ação             | 1. Criar `auth/index.ts` reexportando `AuthGuard` (e `AuthModule`). 2. Registrar `AuthGuard` em `providers` e `exports` do `AuthModule`. 3. Trocar imports de `../../auth/interface/auth-guard` para `../../auth` nos três slices. 4. Manter import de `AuthModule` no composition root. |
| Fora de escopo   | Lógica do guard; outros exports de auth. |
| Risco            | médio — wiring de DI; mitigar com bootstrap test. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): expose AuthGuard via auth public API` |
| Critério de done | guard importado apenas da raiz da slice; app bootstrap verde; gates verdes. |

### WU-02 — Expor catálogo de experts via API pública da slice agents

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `agents` (consumidor: `conversations`) |
| Achados          | `SLICE-01` (conversations/application/chat.use-case.ts), `J-03` (conversations) |
| Severidade       | `blocker` |
| Arquivos         | criar `agents/application/expert-catalog.service.ts`; alterar `agents/agents.module.ts` (exports); alterar `conversations/application/chat.use-case.ts` |
| Teste primeiro   | `chat.use-case.test.ts`: use case recebe o serviço por construtor; teste de expert desconhecido continua passando. |
| Ação             | 1. Criar `ExpertCatalogService` com `find(key): Expert \| undefined` delegando a `findExpert`. 2. Exportar do `AgentsModule`. 3. Em `ChatUseCase`, injetar o serviço e substituir `findExpert(input.expertKey)` por `this.experts.find(...)`. 4. Registrar `AgentsModule` em `ConversationsModule` (se ainda não). |
| Fora de escopo   | Mover domínio de experts para `shared`; alterar prompt. |
| Risco            | médio — DI cross-módulo. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): expose expert catalog via agents public API` |
| Critério de done | conversations não importa `agents/domain` nem `agents/application` internos; gates verdes. |

### WU-03 — Split do arquivo de use case de agents (UC-03)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `agents` |
| Achados          | `UC-03` |
| Severidade       | `blocker` |
| Arquivos         | criar `agents/application/get-expert.use-case.ts`, `agents/application/get-suggestions.use-case.ts`; alterar `agents/application/list-experts.use-case.ts` (manter apenas `ListExpertsUseCase`); alterar `agents/application/list-experts.use-case.test.ts` (imports); alterar `agents/agents.module.ts` |
| Teste primeiro   | Teste de use case deve falhar antes da divisão (import de classes removidas de `list-experts.use-case.ts`). |
| Ação             | 1. Mover `GetExpertUseCase` para `get-expert.use-case.ts` e `GetSuggestionsUseCase` para `get-suggestions.use-case.ts`. 2. Manter `ListExpertsUseCase` em `list-experts.use-case.ts`. 3. Atualizar imports no teste e no módulo. |
| Fora de escopo   | Handlers; método `execute` (já existe). |
| Risco            | baixo. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): split agents use cases into one file per flow` |
| Critério de done | um use case por arquivo; testes do WU verdes; gates verdes. |

### WU-04 — Split do handler de agents em 3 handlers 1:1 (UC-01, IF-03)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `agents` |
| Achados          | `UC-01`, `IF-03` |
| Severidade       | `blocker` + `major` |
| Arquivos         | criar `agents/interface/list-experts.handler.ts`, `agents/interface/get-expert.handler.ts`, `agents/interface/get-suggestions.handler.ts`; remover `agents/interface/experts.handler.ts`; alterar `agents/agents.module.ts` (controllers) |
| Teste primeiro   | Teste HTTP (a ser criado no WU-05) não existe ainda; compilação/typecheck deve passar. |
| Ação             | 1. Criar `ListExpertsHandler` (`@Controller("experts")`, `@Get()`, método `execute`) injetando `ListExpertsUseCase`. 2. Criar `GetExpertHandler` (`@Get(":key")`, `execute`) injetando `GetExpertUseCase`, preservando o retorno atual `{ error: { code, message } }` para não encontrado (minor J-01 não incluído). 3. Criar `GetSuggestionsHandler` (`@Get(":key/suggestions")`, `execute`) injetando `GetSuggestionsUseCase`. 4. Registrar os três handlers em `controllers`. 5. Remover `experts.handler.ts`. |
| Fora de escopo   | Mudar status HTTP de not-found (minor, não incluído); renomear método legado. |
| Risco            | médio — rotas/params; mitigar com typecheck e smoke. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): split experts handler into one handler per endpoint` |
| Critério de done | nenhum handler com mais de uma rota; cada handler injeta um use case; gates verdes; sem mudança de contrato HTTP. |

### WU-05 — Testes HTTP para handlers de agents (TEST-02 manual)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `agents` |
| Achados          | `TEST-02` (manual) |
| Severidade       | `major` |
| Arquivos         | criar `agents/interface/list-experts.handler.test.ts`, `get-expert.handler.test.ts`, `get-suggestions.handler.test.ts` |
| Teste primeiro   | N/A — WU adiciona testes; baseline deve permanecer verde. |
| Ação             | Criar testes supertest para `GET /api/v1/experts`, `GET /api/v1/experts/:key`, `GET /api/v1/experts/:key/suggestions` cobrindo status, corpo e not-found, seguindo o padrão de `auth/interface/*.handler.test.ts`. |
| Fora de escopo   | Alterar handler; cobrir domínio (já coberto). |
| Risco            | baixo. |
| Rollback         | remover arquivos de teste do WU. |
| Commit sugerido  | `test(api): add HTTP integration tests for agents handlers` |
| Critério de done | novos testes verdes; gates verdes. |

### WU-06 — Porta de repositório de connectors em domain (DEP-02, J-05, UC-03)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `connectors` |
| Achados          | `DEP-02` (create/process), `J-05`, `PORT-01`, `UC-03` (create-connector) |
| Severidade       | `blocker` + `major` |
| Arquivos         | criar `connectors/connectors.tokens.ts`, `connectors/domain/connector-repository.ts`; alterar `connectors/domain/connector.ts` (se necessário); alterar `connectors/infrastructure/connector.repository.ts` (`implements` porta); alterar `connectors/application/create-connector.use-case.ts` (split em dois arquivos + injeção da porta); criar `connectors/application/create-connector-from-file.use-case.ts`, `create-connector-from-url.use-case.ts`; remover o antigo `create-connector.use-case.ts`; alterar `connectors/application/process-connector.use-case.ts` (injeção da porta); alterar testes de use case (imports); alterar `connectors/connectors.module.ts` |
| Teste primeiro   | Testes de use case devem falhar antes (import de `create-connector.use-case.ts` inexistente e tipo da porta). |
| Ação             | 1. Criar `connectors.tokens.ts` com `CONNECTOR_REPOSITORY = Symbol("CONNECTOR_REPOSITORY")`. 2. Declarar interface `ConnectorRepository` em `domain/connector-repository.ts` com todos os métodos usados. 3. Adapter implementa a interface e mantém `@Injectable`. 4. Dividir `create-connector.use-case.ts` em `create-connector-from-file.use-case.ts` e `create-connector-from-url.use-case.ts`, cada um injetando `@Inject(CONNECTOR_REPOSITORY) repo: ConnectorRepository` (porta). 5. `ProcessConnectorUseCase` injeta a porta. 6. Módulo liga token → adapter e registra use cases. 7. Atualizar testes. |
| Fora de escopo   | Extração de I/O do process-connector (WU-09); handlers. |
| Risco            | alto — muitos arquivos; mitigar com typecheck e testes de use case. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): add connector repository port and split create use cases` |
| Critério de done | use cases dependem da porta; adapter implementa; testes verdes; gates verdes. |

### WU-07 — Criar use cases de list/get de connectors (J-01, UC-02)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `connectors` |
| Achados          | `J-01` (connectors), `UC-02` |
| Severidade       | `blocker` |
| Arquivos         | criar `connectors/application/list-connectors.use-case.ts`, `connectors/application/get-connector.use-case.ts` e respectivos testes; alterar `connectors/connectors.module.ts` |
| Teste primeiro   | Testes de use case: `ListConnectorsUseCase.execute({ userId })` retorna lista do repo; `GetConnectorUseCase.execute({ id })` retorna asset ou null. Devem falhar antes da implementação. |
| Ação             | 1. Criar `ListConnectorsUseCase` injetando a porta, chamando `listByUser`. 2. Criar `GetConnectorUseCase` injetando a porta, chamando `findById`. 3. Registrar no módulo. 4. Criar testes unitários com repo fake. |
| Fora de escopo   | Handlers; extração de I/O. |
| Risco            | baixo. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): add list/get connector use cases` |
| Critério de done | use cases criados e testados; gates verdes. |

### WU-08 — Split do handler de connectors em 4 handlers 1:1 (UC-01, UC-02, DEP-07, IF-03)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `connectors` |
| Achados          | `UC-01`, `UC-02`, `DEP-07`, `IF-03`, `J-01` |
| Severidade       | `blocker` + `major` |
| Arquivos         | criar `connectors/interface/upload-connector.handler.ts`, `from-url-connector.handler.ts`, `list-connectors.handler.ts`, `get-connector.handler.ts`; remover `connectors/interface/connectors.handler.ts`; alterar `connectors/connectors.module.ts` |
| Teste primeiro   | Compilação/typecheck deve passar; testes HTTP a serem criados no WU-10. |
| Ação             | 1. `UploadConnectorHandler` (`@Post("upload")`, `@UseGuards`, `@UseInterceptors(FileInterceptor)`, método `execute`) injeta `CreateConnectorFromFileUseCase`. 2. `FromUrlConnectorHandler` (`@Post("url")`) injeta `CreateConnectorFromUrlUseCase`. 3. `ListConnectorsHandler` (`@Get()`) injeta `ListConnectorsUseCase`. 4. `GetConnectorHandler` (`@Get(":id")`) injeta `GetConnectorUseCase`. 5. Remover `repo` do handler. 6. Registrar handlers no módulo. 7. Remover `connectors.handler.ts`. |
| Fora de escopo   | Extração de I/O do process-connector; testes HTTP (WU-10). |
| Risco            | alto — rotas/multipart; mitigar com typecheck. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): split connectors handler into one handler per endpoint` |
| Critério de done | nenhum handler com mais de uma rota; nenhum handler injeta repo; gates verdes; sem mudança de contrato HTTP. |

### WU-09 — Extrair portas de I/O de `ProcessConnectorUseCase` (J-03, J-05, DEP-04)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `connectors` |
| Achados          | `J-03` (connectors), `J-05`, `DEP-04` |
| Severidade       | `major` (DEP-04 minor resolvido como efeito colateral) |
| Arquivos         | criar `connectors/domain/text-extractor.ts`, `chunker.ts`, `vector-store.ts`, `environment.ts` (portas); criar adapters em `connectors/infrastructure/` (`fetch-text-extractor.ts`, `langchain-chunker.ts`, `weaviate-vector-store.ts`, `server-env.environment.ts`); alterar `connectors/application/process-connector.use-case.ts`; alterar `connectors/connectors.module.ts`; alterar `process-connector.use-case.test.ts` |
| Teste primeiro   | Teste de use case com fakes das portas (sem rede/SDK) deve passar; teste existente de process-connector atualizado para injetar fakes. |
| Ação             | 1. Declarar portas em `domain` para extração de texto, chunking, vector store e env. 2. Mover `fetch`, `pdf-parse`, `@langchain/*`, `getWeaviateClient`, `getServerEnv` para adapters em `infrastructure`. 3. `ProcessConnectorUseCase` passa a depender apenas das portas. 4. Ligar portas → adapters no módulo. 5. Atualizar testes para injetar fakes. |
| Fora de escopo   | Mudar comportamento de processamento (chunk size etc.); handlers. |
| Risco            | alto — grande movimentação; mitigar com typecheck e testes. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): extract infrastructure ports from process-connector use case` |
| Critério de done | use case não importa SDK/env/fetch/pdf; gates verdes. |

### WU-10 — Testes HTTP para handlers de connectors (TEST-02)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `connectors` |
| Achados          | `TEST-02` |
| Severidade       | `major` |
| Arquivos         | criar `connectors/interface/upload-connector.handler.test.ts`, `from-url-connector.handler.test.ts`, `list-connectors.handler.test.ts`, `get-connector.handler.test.ts` |
| Teste primeiro   | N/A — WU adiciona testes. |
| Ação             | Criar testes supertest para os 4 endpoints cobrindo status, contrato de erro e validação, com `ConnectorRepository` in-memory/fake e `AuthGuard` bypass via módulo de teste. |
| Fora de escopo   | Alterar handlers. |
| Risco            | médio — setup de multipart e auth. |
| Rollback         | remover arquivos de teste do WU. |
| Commit sugerido  | `test(api): add HTTP integration tests for connectors handlers` |
| Critério de done | novos testes verdes; gates verdes. |

### WU-11 — Porta de repositório de conversations em domain (DEP-02, J-05)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `conversations` |
| Achados          | `DEP-02`, `J-05`, `PORT-01` |
| Severidade       | `blocker` + `major` |
| Arquivos         | criar `conversations/conversations.tokens.ts`, `conversations/domain/conversation-repository.ts`; alterar `conversations/infrastructure/conversation.repository.ts` (`implements`); alterar `conversations/application/chat.use-case.ts` (injetar porta); alterar `conversations/conversations.module.ts` |
| Teste primeiro   | `chat.use-case.test.ts` atualizado para injetar repo fake tipado pela porta; deve passar. |
| Ação             | 1. Criar tokens e porta com métodos `create`, `listByUser`, `findById`, `addMessage`, `listMessages`. 2. Adapter implementa a porta. 3. `ChatUseCase` injeta `@Inject(CONVERSATION_REPOSITORY)`. 4. Módulo liga token → adapter. |
| Fora de escopo   | Extração de I/O do chat (WU-14); handlers. |
| Risco            | médio. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): add conversation repository port` |
| Critério de done | use case depende da porta; adapter implementa; gates verdes. |

### WU-12 — Criar use cases de conversations (J-01, UC-02)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `conversations` |
| Achados          | `J-01`, `UC-02` |
| Severidade       | `blocker` |
| Arquivos         | criar `conversations/application/create-conversation.use-case.ts`, `list-conversations.use-case.ts`, `list-conversation-messages.use-case.ts` e respectivos testes; alterar `conversations/conversations.module.ts` |
| Teste primeiro   | Testes de use case: criação/listagem/listagem de mensagens com repo fake; devem falhar antes da implementação. |
| Ação             | 1. `CreateConversationUseCase` injeta a porta e chama `create`. 2. `ListConversationsUseCase` chama `listByUser`. 3. `ListConversationMessagesUseCase` chama `listMessages`. 4. `ChatUseCase` permanece como use case do envio de mensagem. 5. Registrar no módulo. |
| Fora de escopo   | Handlers; extração de I/O do chat. |
| Risco            | médio — regra de `expertKey` fallback (linha 64-65) deve permanecer no use case de envio, não no handler. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): add conversation use cases` |
| Critério de done | use cases criados e testados; gates verdes. |

### WU-13 — Split do handler de conversations em 4 handlers 1:1 (UC-02, DEP-07, IF-03)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `conversations` |
| Achados          | `UC-02`, `DEP-07`, `IF-03`, `J-01` |
| Severidade       | `blocker` + `major` |
| Arquivos         | criar `conversations/interface/create-conversation.handler.ts`, `list-conversations.handler.ts`, `list-conversation-messages.handler.ts`, `send-message.handler.ts`; remover `conversations/interface/conversations.handler.ts`; alterar `conversations/conversations.module.ts` |
| Teste primeiro   | Compilação/typecheck deve passar; testes HTTP a serem criados no WU-15. |
| Ação             | 1. `CreateConversationHandler` (`@Post()`) injeta `CreateConversationUseCase`. 2. `ListConversationsHandler` (`@Get()`) injeta `ListConversationsUseCase`. 3. `ListConversationMessagesHandler` (`@Get(":id/messages")`) injeta `ListConversationMessagesUseCase`. 4. `SendMessageHandler` (`@Post(":id/messages")`) injeta `ChatUseCase` e mantém SSE (headers/stream) dentro do handler (cross-cutting de transporte, não regra de negócio). 5. Mover cálculo de `expertKey` fallback para o use case de envio (ou para `ChatUseCase`). 6. Remover `repo` do handler. 7. Registrar handlers. |
| Fora de escopo   | Extração de I/O do chat (WU-14); testes HTTP (WU-15). |
| Risco            | alto — SSE/streaming; mitigar com typecheck e smoke. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): split conversations handler into one handler per endpoint` |
| Critério de done | nenhum handler com mais de uma rota; nenhum handler injeta repo; SSE preservado; gates verdes; sem mudança de contrato HTTP. |

### WU-14 — Extrair portas de I/O de `ChatUseCase` (J-03, SLICE-01 agents)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `conversations` |
| Achados          | `J-03` (conversations), `SLICE-01` (agents) |
| Severidade       | `major` + `blocker` |
| Arquivos         | criar `conversations/domain/chat-model.ts`, `embeddings.ts`, `vector-store.ts` (portas); criar adapters em `conversations/infrastructure/` (ou reutilizar shared); alterar `conversations/application/chat.use-case.ts`; alterar `conversations/conversations.module.ts`; alterar `chat.use-case.test.ts` |
| Teste primeiro   | Teste de use case com fakes das portas (expert desconhecido) passa sem rede/SDK. |
| Ação             | 1. Declarar portas para modelo de chat, embeddings e vector store. 2. Mover `getChatModel`, `getEmbeddings`, `getWeaviateClient`, `@langchain/weaviate` para adapters em `infrastructure`. 3. Injetar `ExpertCatalogService` (WU-02) em vez de `findExpert`. 4. `ChatUseCase` depende apenas de portas + repo + serviço. 5. Atualizar testes. |
| Fora de escopo   | Criar entidade `Conversation` (minor J-06). |
| Risco            | alto — streaming + SDK; mitigar com typecheck e testes. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): extract infrastructure ports from chat use case` |
| Critério de done | use case não importa SDK nem `agents/domain`; gates verdes. |

### WU-15 — Testes HTTP para handlers de conversations (TEST-02)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `conversations` |
| Achados          | `TEST-02` |
| Severidade       | `major` |
| Arquivos         | criar `conversations/interface/create-conversation.handler.test.ts`, `list-conversations.handler.test.ts`, `list-conversation-messages.handler.test.ts`, `send-message.handler.test.ts` |
| Teste primeiro   | N/A — WU adiciona testes. |
| Ação             | Criar testes supertest para os 4 endpoints, incluindo SSE básico para envio, com repos in-memory e `AuthGuard` via módulo de teste. |
| Fora de escopo   | Alterar handlers. |
| Risco            | alto — SSE em teste; pode ser `deferred (infra)` se instável. |
| Rollback         | remover arquivos de teste do WU. |
| Commit sugerido  | `test(api): add HTTP integration tests for conversations handlers` |
| Critério de done | novos testes verdes ou `deferred (infra)` documentado; gates verdes. |

### WU-16 — Porta de repositório de media em domain (DEP-02, J-05)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `media` |
| Achados          | `DEP-02`, `J-05`, `PORT-01` |
| Severidade       | `blocker` + `major` |
| Arquivos         | criar `media/media.tokens.ts`, `media/domain/media-repository.ts`; alterar `media/infrastructure/media.repository.ts` (`implements`); alterar `media/application/generate-media.use-case.ts` (injetar porta); alterar `media/media.module.ts` |
| Teste primeiro   | `generate-media.use-case.test.ts` atualizado para injetar repo fake tipado pela porta; deve passar. |
| Ação             | 1. Criar tokens e porta com métodos `create` e `findById`. 2. Adapter implementa a porta. 3. Use case injeta `@Inject(MEDIA_REPOSITORY)`. 4. Módulo liga token → adapter. |
| Fora de escopo   | Extração de I/O do generate-media (WU-19); handlers. |
| Risco            | baixo. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): add media repository port` |
| Critério de done | use case depende da porta; adapter implementa; gates verdes. |

### WU-17 — Adicionar `execute()` a `GenerateMediaUseCase` (UC-04)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `media` |
| Achados          | `UC-04` |
| Severidade       | `major` |
| Arquivos         | alterar `media/application/generate-media.use-case.ts`; alterar `generate-media.use-case.test.ts` |
| Teste primeiro   | Teste de use case: `execute({ userId, type: "image", prompt })` delega para `generateImage`; `execute({ type: "video" })` delega para `generateVideo`. Devem falhar antes. |
| Ação             | 1. Adicionar método `execute(input)` que despacha para `generateImage`/`generateVideo` com base em `input.type`. 2. Manter métodos existentes (usados por testes). 3. Atualizar testes. |
| Fora de escopo   | Split de use case por operação; handlers. |
| Risco            | baixo. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): add execute to generate-media use case` |
| Critério de done | use case expõe `execute`; testes verdes; gates verdes. |

### WU-18 — Remover repo do handler de media, criar `GetMediaAssetUseCase` e split (UC-02, DEP-07, J-01, IF-03)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `media` |
| Achados          | `UC-02`, `DEP-07`, `J-01`, `IF-03` |
| Severidade       | `blocker` + `major` |
| Arquivos         | criar `media/application/get-media-asset.use-case.ts` e teste; criar `media/interface/generate-media.handler.ts`, `get-media-asset.handler.ts`; remover `media/interface/media.handler.ts`; alterar `media/media.module.ts` |
| Teste primeiro   | Teste de use case `GetMediaAssetUseCase` deve falhar antes; compilação/typecheck após split. |
| Ação             | 1. Criar `GetMediaAssetUseCase` injetando a porta, chamando `findById`. 2. `GenerateMediaHandler` (`@Post("generate")`) injeta `GenerateMediaUseCase` e chama `execute`. 3. `GetMediaAssetHandler` (`@Get(":id")`) injeta `GetMediaAssetUseCase`; preserva streaming/resposta binária e 404 atuais. 4. Remover `repo` do handler. 5. Registrar handlers. 6. Remover `media.handler.ts`. |
| Fora de escopo   | Extração de I/O (WU-19); testes HTTP (WU-20). |
| Risco            | alto — resposta binária/redirect; mitigar com typecheck. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): split media handler and add get-media-asset use case` |
| Critério de done | nenhum handler com mais de uma rota; nenhum handler injeta repo; gates verdes; sem mudança de contrato HTTP. |

### WU-19 — Extrair portas de I/O de `GenerateMediaUseCase` (J-03, J-05)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `media` |
| Achados          | `J-03` (media), `J-05` |
| Severidade       | `major` |
| Arquivos         | criar `media/domain/image-generator.ts` (porta); criar adapter em `media/infrastructure/openai-image-generator.ts`; alterar `media/application/generate-media.use-case.ts`; alterar `media/media.module.ts`; alterar `generate-media.use-case.test.ts` |
| Teste primeiro   | Teste de use case com fake `ImageGenerator` (sem rede) passa. |
| Ação             | 1. Declarar porta `ImageGenerator` em `domain`. 2. Mover `fetch` para OpenAI, `getServerEnv`, parsing de resposta para o adapter. 3. Use case depende da porta + repo. 4. Módulo liga porta → adapter. 5. Atualizar testes. |
| Fora de escopo   | Implementar geração de vídeo (já não implementada). |
| Risco            | médio. |
| Rollback         | reverter arquivos do WU. |
| Commit sugerido  | `refactor(api): extract image generation port from generate-media use case` |
| Critério de done | use case não importa `fetch`/env; gates verdes. |

### WU-20 — Testes HTTP para handlers de media (TEST-02 manual)

| Campo            | Valor |
| ---------------- | ----- |
| Slice            | `media` |
| Achados          | `TEST-02` (manual) |
| Severidade       | `major` |
| Arquivos         | criar `media/interface/generate-media.handler.test.ts`, `get-media-asset.handler.test.ts` |
| Teste primeiro   | N/A — WU adiciona testes. |
| Ação             | Criar testes supertest para `POST /api/v1/media/generate` e `GET /api/v1/media/:id`, cobrindo status, erro e 404, com repo fake e `AuthGuard` via módulo de teste. |
| Fora de escopo   | Alterar handlers. |
| Risco            | médio. |
| Rollback         | remover arquivos de teste do WU. |
| Commit sugerido  | `test(api): add HTTP integration tests for media handlers` |
| Critério de done | novos testes verdes; gates verdes. |

## Ordem e dependências

- WU-01 → WU-08, WU-13, WU-18 (consumidores do guard).
- WU-02 → WU-14 (chat usa ExpertCatalogService).
- WU-03 → WU-04.
- WU-06 → WU-07 → WU-08.
- WU-09 depende de WU-06 (porta de repo já existe) e precede WU-10.
- WU-11 → WU-12 → WU-13.
- WU-14 depende de WU-11 e WU-02.
- WU-16 → WU-17 → WU-18.
- WU-19 depende de WU-16.
- WU-05 após WU-04; WU-10 após WU-08; WU-15 após WU-13; WU-20 após WU-18.
- WUs de teste (WU-05, WU-10, WU-15, WU-20) podem rodar em paralelo entre slices.
- Nenhum WU pode deixar a árvore vermelha; o commit acontece só com o alvo verde.

## Gates

| Ordem | Comando                | Quando                          |
| ----- | ---------------------- | ------------------------------- |
| 0     | baseline dos gates     | antes de qualquer edição        |
| 1     | `npm run format:check` | ao final de cada WU (rápido)    |
| 2     | `npm run lint`         | ao final de cada WU (workspace) |
| 3     | `npm run check-types`  | ao final de cada WU             |
| 4     | `npm run test`         | ao final de cada WU afetado     |
| 5     | `npm run build`        | antes do commit final           |
| 6     | `npm run test:e2e`     | se rota/contrato HTTP mudou     |

Se `npm`/`npx` estiverem bloqueados no shell, rode `cmd /c "npm run <script>"` ou o binário de `node_modules` (`node node_modules/turbo/bin/turbo run <task>`). O baseline fica em `.refactor/20261101-205916/baseline.md`.

## Aprovação

- [ ] Baseline dos gates registrado
- [ ] Auditoria revisada e falsos positivos registrados
- [ ] Plano aprovado pelo usuário
- [ ] Branch criada a partir de `main`
- [ ] ADR definido (0014, status `proposed`)
- [ ] Working tree limpo

## Execução

| WU    | Status  | Commit | Testes | Observação |
| ----- | ------- | ------ | ------ | ---------- |
| WU-01 | done    | —      | —      | —          |
| WU-02 | done    | —      | —      | —          |
| WU-03 | done    | —      | —      | —          |
| WU-04 | done    | —      | —      | —          |
| WU-05 | done    | —      | —      | —          |
| WU-06 | done    | —      | —      | —          |
| WU-07 | done    | —      | —      | —          |
| WU-08 | done    | —      | —      | —          |
| WU-09 | done    | —      | —      | —          |
| WU-10 | done    | —      | —      | —          |
| WU-11 | done    | —      | —      | —          |
| WU-12 | done    | —      | —      | —          |
| WU-13 | done    | —      | —      | —          |
| WU-14 | done    | —      | —      | —          |
| WU-15 | done    | —      | —      | —          |
| WU-16 | done    | —      | —      | —          |
| WU-17 | done    | —      | —      | —          |
| WU-18 | done    | —      | —      | —          |
| WU-19 | done    | —      | —      | —          |
| WU-20 | done    | —      | —      | —          |

## Riscos residuais

- Contrato HTTP pode mudar se mapeamento de erro/not-found for alterado inadvertidamente (agents J-01 mantido como está).
- Extração de I/O de process-connector/chat/generate-media é de alto risco; pode exigir ajuste de testes e mocks.
- Testes HTTP de SSE (conversations) podem ser `deferred (infra)` se instáveis.
- Minors não incluídos (J-06 domínio anêmico, J-08, J-09, create-hash, J-10, J-03 uptime) permanecem como dívida técnica.
- Cobertura de e2e pode ser `deferred (infra)` se indisponível.