# 012 — Melhorias de Performance da API (NestJS)

## Metadado

| Campo         | Valor                          |
| ------------- | ------------------------------ |
| Status        | `implemented`                  |
| Prioridade    | `high`                         |
| Criado em     | 2026-11-01                     |
| Atualizado em | 2026-11-01                     |
| Responsável   | Renato                         |

## Resumo

Auditoria e otimização de pontos de lentidão na API NestJS: instanciação repetida de clientes LangChain, I/O sequencial evitável, escritas de banco em todo request autenticado, carregamento sem paginação/limites, processamento de conectores sem controle de concorrência e filtragem de RAG em memória. O objetivo é reduzir latência de endpoints críticos (chat, conectores, auth) e o consumo de memória/CPU, mantendo os contratos e testes existentes.

## Contexto

A API (`apps/api`) cresceu com as specs `010` (experts, conectores, chat, mídia) e `011` (refatoração em vertical slices). Os fluxos críticos — chat com RAG, processamento de conectores (chunking + embeddings + Weaviate) e autenticação com sessão única — executam operações de I/O e alocação por request sem reuso de clientes nem controle de concorrência. A suíte de carga (spec `007`, k6) e o dashboard LGTM existem para medir o impacto, mas não há otimizações sistemáticas documentadas. Esta spec lista hotspots concretos e verificáveis, priorizando mudanças de baixo risco que não alteram contratos públicos.

Referências: `.docs/ARCHITECTURE.md`, `.docs/DEVELOPMENT.md`, `.specs/007-testes-de-carga-com-k6.md`, `.specs/010-experts-agents.md`, `.specs/011-cto-structural-audit.md`.

## Escopo

### Dentro do escopo

- Reuso de instâncias de clientes LangChain (chat, embeddings) e do módulo `@langchain/weaviate`.
- Reuso/otimização de `WeaviateStore` e filtragem de tenant no Weaviate (pré-filtro) em vez de filtrar em memória.
- Paralelização de operações independentes no `ChatUseCase` (persistência da mensagem do usuário e retrieval de RAG).
- Timeout/best-effort para RAG retrieval para não atrasar o primeiro token.
- Throttle da escrita `touchLastUsed` em `SessionService.validate`.
- Paginação/limites em `listByUser` (connectors, conversations) e `listMessages`.
- Índices de banco para ordenação por `updatedAt` em conversas.
- Liberação de `content` (base64) do connector após processamento.
- Controle de concorrência no processamento de conectores (fila/limite).
- Timeout e limite de tamanho em `FetchTextExtractor` (URL).
- Cache de imports dinâmicos (`pdf-parse`) e reuso de `RecursiveCharacterTextSplitter`.
- Mapa de lookup para `ExpertCatalogService.find`.
- Correção do cache de `getWeaviateClient` para não reter promise rejeitada.
- Configuração do tamanho do pool do Postgres via ambiente.

### Fora do escopo

- Migração de armazenamento de arquivos/mídia para object storage (S3) — apenas liberação de `content` pós-processamento.
- Rate limiting, cache HTTP (ETag) e compressão de resposta.
- Reescrita de algoritmos de chunking ou troca de modelo de embeddings.
- Otimizações de front-end (React) — escopo separado.
- Alteração de contratos de API (rotas, DTOs, status codes).

## Requisitos funcionais

| ID    | Requisito                      | Descrição                                                                                                                                                                    |
| ----- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Reuso de modelos LangChain     | `getChatModel()` e `getEmbeddings()` devem retornar instâncias reutilizáveis (cache por processo), evitando criar `ChatOpenAI`/`OpenAIEmbeddings` a cada request.            |
| RF-02 | Cache de módulo Weaviate        | O `import("@langchain/weaviate")` deve ser cacheado (promise única) para não reimportar o módulo por request.                                                               |
| RF-03 | Filtragem de tenant no Weaviate | `retrieveContext` deve aplicar filtro de `userId` no Weaviate (pré-filtro) e não filtrar em memória; limitar resultados recuperados (`topK`) antes do filtro.                  |
| RF-04 | Reuso de WeaviateStore         | Instâncias de `WeaviateStore` (connectors e conversations) devem ser reutilizadas quando possível (cliente e embeddings cacheados).                                            |
| RF-05 | Paralelização no chat          | No `ChatUseCase.execute`, a persistência da mensagem do usuário e o retrieval de RAG devem ocorrer em paralelo quando não houver dependência entre si.                       |
| RF-06 | Timeout de RAG                 | O retrieval de RAG deve ter timeout configurável (ex.: 1500ms) e degradar para contexto vazio em caso de timeout/erro, sem bloquear o primeiro token além do limite.          |
| RF-07 | Throttle de `touchLastUsed`    | `SessionService.validate` deve atualizar `lastUsedAt` apenas se o valor anterior for mais antigo que um limiar (ex.: 60s), reduzindo escritas no banco.                       |
| RF-08 | Paginação de listagens         | `ConnectorRepository.listByUser`, `ConversationRepository.listByUser` e `ConversationRepository.listMessages` devem aceitar `limit`/`offset` (com defaults seguros) e ordenar de forma estável. |
| RF-09 | Índice de ordenação            | Adicionar índice em `conversations (user_id, updated_at desc)` (ou equivalente) para suportar `listByUser` ordenado por `updatedAt`.                                          |
| RF-10 | Liberação de `content`         | Após `ProcessConnectorUseCase` concluir com sucesso, o `content` (base64) do connector deve ser limpo (`null`) para reduzir armazenamento e I/O.                             |
| RF-11 | Concorrência de processamento  | O processamento de conectores deve ser limitado por concorrência (ex.: `p-limit` com 2-4 tarefas simultâneas) ou fila, evitando sobrecarga de embeddings/Weaviate.             |
| RF-12 | Timeout de extração de URL     | `FetchTextExtractor` (tipo `url`) deve usar `AbortController` com timeout (ex.: 10s) e limitar o tamanho do HTML processado (ex.: 2MB).                                        |
| RF-13 | Cache de `pdf-parse`           | O `import("pdf-parse")` deve ser cacheado para evitar reimportação por arquivo.                                                                                               |
| RF-14 | Reuso do splitter              | `LangChainChunker` deve reutilizar uma instância de `RecursiveCharacterTextSplitter` em vez de criar uma por chamada.                                                         |
| RF-15 | Lookup de experts              | `ExpertCatalogService.find` (e `findExpert`) deve usar um `Map` para lookup O(1) em vez de `Array.find`.                                                                        |
| RF-16 | Cache de cliente Weaviate      | `getWeaviateClient` não deve reter uma promise rejeitada; em caso de falha, permitir nova tentativa.                                                                          |
| RF-17 | Pool configurável              | O tamanho do pool do Postgres (`max`) deve ser configurável via variável de ambiente (ex.: `DATABASE_POOL_MAX`) com default atual (10).                                       |
| RF-18 | Tratamento de erros/log        | Substituir `console.error` por logger estruturado nos caminhos de store/retrieval; manter best-effort.                                                                         |

## Requisitos não-funcionais

| ID     | Requisito        | Descrição                                                                                                                                |
| ------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Performance      | Primeiro token do chat em < 3s (p95) sob carga `smoke`/`load`; processamento de connector não bloqueia o request de upload (< 1s).        |
| RNF-02 | Compatibilidade  | Nenhuma alteração de contrato público (rotas, DTOs, status codes); todos os testes existentes continuam passando.                       |
| RNF-03 | Observabilidade  | Métricas/logs existentes mantidos; novos pontos de timeout/falha logados com `requestId` quando aplicável.                               |
| RNF-04 | Testes           | Cobertura de domain/application mantida; testes de integração de handlers não regredem; `npm run lint`, `check-types`, `test` passam.     |
| RNF-05 | Segurança        | Limites de tamanho de entrada (HTML, paginação) não devem permitir DoS; defaults conservadores.                                          |
| RNF-06 | Idioma           | Código/comentários em en-US; spec em pt-BR.                                                                                              |

## Critérios de aceite

- [ ] `getChatModel()` e `getEmbeddings()` retornam a mesma instância em chamadas repetidas (teste unitário).
- [ ] `retrieveContext` aplica filtro de `userId` no Weaviate e não filtra em memória (verificado por teste/mock).
- [ ] `ChatUseCase` executa persistência da mensagem do usuário e RAG em paralelo (verificado por teste com spies/timing).
- [ ] RAG com timeout de 1500ms degrada para contexto vazio sem lançar erro (teste unitário).
- [ ] `SessionService.validate` não chama `touchLastUsed` se `lastUsedAt` < 60s atrás (teste unitário).
- [ ] `listByUser` e `listMessages` aceitam `limit`/`offset` com defaults (ex.: 50/0) e não retornam mais que o limite.
- [ ] Índice `conversations_user_updated_idx` criado via migration.
- [ ] `content` do connector fica `null` após status `ready` (verificado por teste de integração).
- [ ] Processamento de conectores limita concorrência (ex.: no máximo 2 simultâneos) — verificado por teste.
- [ ] `FetchTextExtractor` (URL) aborta após 10s e trunca HTML > 2MB (teste unitário).
- [ ] `pdf-parse` importado uma única vez (cache) — verificado por teste/spy.
- [ ] `LangChainChunker` reutiliza splitter (teste unitário).
- [ ] `findExpert` usa Map (teste unitário de performance/opcional).
- [ ] `getWeaviateClient` permite retry após falha (teste unitário).
- [ ] `DATABASE_POOL_MAX` lido do ambiente com default 10.
- [ ] `npm run lint`, `npm run check-types`, `npm run test` passam.
- [ ] k6 `smoke` executa e endpoints críticos respondem; p95 do chat < 3s documentado.

## Impacto técnico

### Arquivos afetados

| Arquivo / Caminho                                                              | Ação   | Descrição                                                                                   |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------- |
| `apps/api/src/shared/ai/models.ts`                                             | modify | Cache de instâncias de `ChatOpenAI`/`OpenAIEmbeddings`.                                     |
| `apps/api/src/shared/ai/weaviate.client.ts`                                    | modify | Cache de import `@langchain/weaviate`; retry após falha.                                    |
| `apps/api/src/modules/conversations/infrastructure/weaviate-vector-store.ts`    | modify | Reuso de store; filtro de tenant no Weaviate; timeout.                                       |
| `apps/api/src/modules/connectors/infrastructure/weaviate-vector-store.ts`       | modify | Reuso de store; cache de import; logger.                                                     |
| `apps/api/src/modules/conversations/application/chat.use-case.ts`               | modify | Paralelizar persistência e RAG; timeout de RAG.                                             |
| `apps/api/src/modules/auth/application/session.service.ts`                      | modify | Throttle de `touchLastUsed`.                                                                |
| `apps/api/src/modules/connectors/infrastructure/connector.repository.ts`        | modify | Paginação em `listByUser`.                                                                  |
| `apps/api/src/modules/conversations/infrastructure/conversation.repository.ts`   | modify | Paginação em `listByUser` e `listMessages`.                                                 |
| `apps/api/src/modules/connectors/application/process-connector.use-case.ts`     | modify | Limpar `content` após sucesso; concorrência.                                                |
| `apps/api/src/modules/connectors/infrastructure/fetch-text-extractor.ts`        | modify | Timeout/AbortController e limite de tamanho para URL; cache de `pdf-parse`.                 |
| `apps/api/src/modules/connectors/infrastructure/langchain-chunker.ts`           | modify | Reuso de `RecursiveCharacterTextSplitter`.                                                  |
| `apps/api/src/modules/agents/application/expert-catalog.service.ts`              | modify | Lookup via `Map`.                                                                           |
| `apps/api/src/modules/agents/domain/expert.ts`                                 | modify | `findExpert` via Map (ou cache).                                                            |
| `apps/api/src/shared/database/database.module.ts`                              | modify | Pool `max` configurável via env.                                                            |
| `apps/api/src/shared/database/schema.ts`                                      | modify | Índice `conversations_user_updated_idx`.                                                    |
| `apps/api/src/shared/config/env.ts` / `packages/env/src/server.ts`             | modify | Adicionar `DATABASE_POOL_MAX` (e validar).                                                  |
| `apps/api/src/modules/connectors/connectors.tokens.ts` (ou module)             | modify | Provider de concorrência (p-limit) se necessário.                                           |
| Migrations (`migrations/`)                                                     | create | Migration para novo índice.                                                                 |
| Testes (`*.test.ts`)                                                          | modify | Cobrir novos comportamentos (cache, throttle, paginação, timeout, etc.).                     |

### Dependências

- Biblioteca `p-limit` (ou implementação própria) para concorrência — avaliar se já disponível no `node_modules` hoisted.
- Drizzle Kit para geração/aplicação de migration do índice.
- Variável de ambiente `DATABASE_POOL_MAX` (default 10).

### Componentes de UI

n/a — escopo exclusivo da API.

## Plano de implementação

### Etapa 1: Medição de baseline

- Rodar `npm run loadtest:smoke` e `npm run loadtest:load` (se infra disponível) para capturar p95 atual dos endpoints críticos (chat, connectors, auth).
- Registrar baseline no plano/ADR.

### Etapa 2: Reuso de clientes e imports (RF-01, RF-02, RF-13, RF-14, RF-16)

- Implementar cache em `models.ts` (`getChatModel`, `getEmbeddings`) com instâncias singleton.
- Cachear `import("@langchain/weaviate")` em `weaviate.client.ts` (promise única) e resetar em falha.
- Cachear `import("pdf-parse")` em `fetch-text-extractor.ts`.
- Reutilizar `RecursiveCharacterTextSplitter` em `langchain-chunker.ts`.
- Corrigir `getWeaviateClient` para não reter promise rejeitada.

### Etapa 3: RAG e chat (RF-03, RF-04, RF-05, RF-06)

- Ajustar `retrieveContext` para aplicar filtro de `userId` no Weaviate e reduzir `topK`.
- Reutilizar `WeaviateStore` quando possível.
- Paralelizar `repo.addMessage` (user) e `vectorStore.retrieveContext` no `ChatUseCase`.
- Adicionar timeout (1500ms) ao retrieval com degradação para contexto vazio.

### Etapa 4: Auth (RF-07)

- Throttle de `touchLastUsed` em `SessionService.validate` (limiar 60s), comparando com `session.lastUsedAt`.

### Etapa 5: Banco e paginação (RF-08, RF-09, RF-17)

- Adicionar `limit`/`offset` (defaults 50/0) em `listByUser` (connectors, conversations) e `listMessages`.
- Adicionar índice `conversations_user_updated_idx` via migration.
- Tornar `DATABASE_POOL_MAX` configurável em `database.module.ts` e validado em `packages/env`.

### Etapa 6: Conectores (RF-10, RF-11, RF-12, RF-18)

- Limpar `content` após processamento bem-sucedido (`updateContent(id, null)` ou novo método).
- Adicionar controle de concorrência no processamento (p-limit ou fila simples).
- Implementar timeout/AbortController e limite de tamanho no `FetchTextExtractor` (URL).
- Substituir `console.error` por logger.

### Etapa 7: Experts (RF-15)

- Converter `EXPERTS` lookup para `Map` em `expert.ts` e `ExpertCatalogService`.

### Etapa 8: QA e medição

- Rodar `npm run lint`, `npm run check-types`, `npm run test`.
- Rodar k6 `smoke`/`load` e comparar p95 com baseline; documentar resultado.

## Riscos e ressalvas

| Risco                                                     | Probabilidade | Impacto | Mitigação                                                                                              |
| --------------------------------------------------------- | ------------- | ------- | ------------------------------------------------------------------------------------------------------ |
| Cache de modelo LangChain compartilhar estado entre testes | medium        | medium  | Expor função de reset/invalidate no cache para testes; manter injeção testável.                         |
| Filtro de tenant no Weaviate incompatível com versão      | medium        | high    | Testar integração cedo; manter fallback de filtro em memória se necessário.                            |
| Paralelização no chat alterar ordem de persistência       | low           | medium  | Garantir que mensagem do usuário seja persistida antes do assistant; usar `Promise.all` apenas para independentes. |
| Throttle de `touchLastUsed` atrasar revogação de sessão   | low           | low     | Limiar conservador (60s); sessão ainda validada por expiração.                                         |
| Paginação quebrar consumidores sem limit                 | medium        | medium  | Defaults generosos (50) e manter compatibilidade com chamadas existentes.                               |
| Concorrência de processamento atrasar connectors          | medium        | low     | Limite configurável; processamento já é assíncrono.                                                    |
| Timeout de RAG degradar qualidade de resposta            | medium        | medium  | Contexto vazio apenas em timeout; logar ocorrência.                                                    |
| Migration de índice falhar em ambientes existentes        | low           | medium  | Migration idempotente (`CREATE INDEX IF NOT EXISTS`).                                                  |

## Referências

- `.docs/ARCHITECTURE.md` — stack e estado atual.
- `.docs/DEVELOPMENT.md` — convenções e camadas.
- `.specs/007-testes-de-carga-com-k6.md` — medição de carga.
- `.specs/010-experts-agents.md` — fluxos de chat/conectores.
- `.specs/011-cto-structural-audit.md` — auditoria estrutural.
- LangChain.js docs (caching, Weaviate filter), Drizzle docs (indexes, migrations).