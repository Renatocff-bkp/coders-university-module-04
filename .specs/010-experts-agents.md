# Agentes Especialistas (Experts) com Chat e Conectores

## Metadado

| Campo         | Valor         |
| ------------- | ------------- |
| Status        | `implemented` |
| Prioridade    | `high`        |
| Criado em     | 2026-11-01    |
| Atualizado em | 2026-11-01    |
| Responsável   | Renato        |

## Resumo

Implementar a experiência principal do produto: um conjunto de agentes de IA especializados em funções executivas (CEO, CMO, CTO, CFO, COO, CPO, Diretor de Vendas, Diretor de Customer Success, Diretor de Customer Hero) acessíveis por uma home simples, com chat em streaming, sugestões de perguntas por expert e conectores de dados (arquivos e URLs) que alimentam uma base vetorial (Weaviate) para RAG. A stack de IA é LangChain.js/LangGraph rodando em módulo do NestJS, com LangSmith (SaaS) para observabilidade/avaliações e modelos OpenAI/Gemini.

## Contexto

O produto é uma plataforma de gestão de agentes de IA customizados, especializados em funções executivas (ver `.docs/BUSINESS.md`). Hoje existem apenas auth, health/ping, status e um placeholder de home. As personas de agentes estão documentadas em `BUSINESS.md` (CEO, CMO, CTO) e serão expandidas para o conjunto completo. A fundação (spec `000`) entregou monorepo NestJS + React/Vite + Postgres + observabilidade LGTM.

Esta spec introduz o núcleo de valor do produto: experts consultáveis via chat, alimentados por dados da empresa via conectores, com RAG sobre Weaviate.

Referências: `.docs/BUSINESS.md`, `.docs/ARCHITECTURE.md`, `.docs/DEVELOPMENT.md`, specs `000` (foundation), `004` (sign-in), `009` (redesign UI).

## Escopo

### Dentro do escopo

- Lista de 9 experts com identidade, prompt de sistema e sugestões de perguntas fixas.
- Home autenticada redesenhada: barra inferior (footer) com dropdown de seleção de expert, textarea de prompt, botão flutuante para adicionar conexões; manter componente de user profile para logout.
- Conectores de dados: upload de PDF, TXT, Markdown, imagens (jpg/jpeg/png), vídeos (mp4), áudio (mp3) e adição de URL externa.
- Deduplicação de fontes: verificar se a conexão já existe (por hash de conteúdo/URL); se existir, reutilizar; caso contrário, extrair chunks, gerar embeddings e inserir no Weaviate + registrar a fonte no Postgres.
- Processamento assíncrono de arquivos com status (pending/processing/ready/failed).
- Chat por expert em streaming (SSE), com persistência de conversas e mensagens no Postgres.
- Capacidade dos experts de gerar imagens (gpt-image-2) e vídeos (Gemini) dentro do chat, exibindo o resultado na conversa.
- Infraestrutura local: Weaviate via Docker Compose; LangChain.js/LangGraph no módulo NestJS; LangSmith SaaS para observabilidade/avaliações; LangSmith Studio para dev local.
- Multi-tenant por usuário/organização com RLS (alinhar com schema existente `organizations`/`organization_members`).
- API REST sob `/api/v1` para experts, conectores, conversas, chat (streaming) e geração de mídia.

### Fora do escopo

- Conectores de terceiros (Notion, Google Drive, Confluence, Jira, ClickUp, Linea) — apenas arquivos e URL nesta spec.
- Geração de áudio/TTS.
- Fine-tuning ou treinamento de modelos.
- Administração multi-organização avançada (convites, billing).
- Deploy em produção (apenas local via Docker).
- LangSmith self-hosted (usar SaaS).
- Dark mode (proibido por `DESIGN.md`).
- Redesign de `apps/docs`.

## Requisitos funcionais

| ID    | Requisito                   | Descrição                                                                                                                                                                                                       |
| ----- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Lista de experts            | O sistema deve expor 9 experts (CEO, CMO, CTO, CFO, COO, CPO, Diretor de Vendas, Diretor de Customer Success, Diretor de Customer Hero), cada um com chave estável, nome, descrição, ícone e prompt de sistema. |
| RF-02 | Sugestões por expert        | Cada expert deve ter 3 a 5 sugestões de perguntas fixas; ao clicar, a sugestão é enviada automaticamente como prompt no chat do expert selecionado.                                                             |
| RF-03 | Seleção de expert           | A home deve permitir selecionar o expert ativo via dropdown na barra inferior; a seleção determina o contexto (prompt de sistema) das mensagens enviadas.                                                       |
| RF-04 | Envio de prompt             | O usuário deve poder digitar um prompt no textarea da barra inferior e enviar (Enter ou botão); a resposta do expert é exibida em formato de chat (mensagens do usuário e do assistente).                       |
| RF-05 | Streaming de resposta       | A resposta do expert deve ser transmitida em streaming (SSE) e renderizada incrementalmente no chat.                                                                                                            |
| RF-06 | Persistência de conversas   | Cada conversa deve ser persistida por usuário e expert, com histórico de mensagens recuperável ao reabrir.                                                                                                      |
| RF-07 | Upload de conexão (arquivo) | O botão flutuante deve abrir fluxo de upload aceitando PDF, TXT, MD, JPG/JPEG/PNG, MP4, MP3; ao enviar, criar/atualizar a fonte e iniciar processamento assíncrono.                                             |
| RF-08 | Conexão por URL             | O usuário deve poder informar uma URL externa; o sistema extrai o texto da página (sem crawl recursivo), cria/atualiza a fonte e processa assíncronamente.                                                      |
| RF-09 | Deduplicação de fontes      | Antes de processar, calcular hash de conteúdo (arquivo) ou URL normalizada; se já existir fonte equivalente para o mesmo tenant, reutilizá-la (sem reprocessar) e vincular ao usuário.                          |
| RF-10 | Processamento assíncrono    | O upload/URL retorna imediatamente com a fonte em status `pending`/`processing`; a UI exibe status até `ready`/`failed`.                                                                                        |
| RF-11 | Extração e embeddings       | Para fonte nova: extrair texto (Document Loaders + DirectoryLoaders do LangChain.js), chunking, gerar embeddings (text-embedding-3-small) e inserir no Weaviate com metadados de tenant/fonte.                  |
| RF-12 | RAG no chat                 | Ao responder, o expert deve recuperar chunks relevantes do Weaviate (filtrados por tenant) e usá-los como contexto, citando a fonte quando aplicável.                                                           |
| RF-13 | Geração de imagem           | Quando o prompt solicitar imagem, o expert deve chamar gpt-image-2 e exibir a imagem gerada na conversa (armazenada/referenciada).                                                                              |
| RF-14 | Geração de vídeo            | Quando o prompt solicitar vídeo, o expert deve chamar Gemini (gemini-omni-flash) e exibir o vídeo gerado na conversa.                                                                                           |
| RF-15 | User profile / logout       | Manter componente de user profile existente permitindo logout; exibir no layout da home.                                                                                                                        |
| RF-16 | Isolamento multi-tenant     | Fontes, conversas, mensagens e assets são isolados por usuário/organização via RLS; Weaviate filtra por metadados de tenant.                                                                                    |

## Requisitos não-funcionais

| ID     | Requisito       | Descrição                                                                                                                                |
| ------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Performance     | Primeiro token da resposta em < 3s; upload retorna em < 1s (processamento assíncrono); chunking/embedding em background.                 |
| RNF-02 | Acessibilidade  | WCAG AA; chat navegável por teclado; textarea com label; dropdown acessível; anúncios de novas mensagens via `aria-live`.                |
| RNF-03 | Responsividade  | Mobile-first; validar em 390×844, 768×1024 e 1280×800; barra inferior fixa e usável em mobile.                                           |
| RNF-04 | Observabilidade | Traces/métricas via OpenTelemetry (existente) + LangSmith (traces de chains/agents, custo, latência); logs estruturados com `requestId`. |
| RNF-05 | Testes          | Cobertura de domain/application; testes de integração para conectores e chat; `npm run lint`, `check-types`, `test` passam.              |
| RNF-06 | Idioma          | Todo texto de interface em en-US; specs/docs em pt-BR.                                                                                   |
| RNF-07 | Segurança       | Validação de tipo/tamanho de arquivo; sanitização de URL; não expor chaves de API ao front-end; RLS em todas as tabelas novas.           |
| RNF-08 | Docker local    | Weaviate (e Redis se usado) via Docker Compose; LangChain.js roda no processo NestJS; apenas chamadas OpenAI/Gemini são externas.        |

## Critérios de aceite

- [ ] 9 experts listados e selecionáveis na home; sugestões clicáveis enviam prompt.
- [ ] Chat exibe mensagens do usuário e do assistente; resposta em streaming.
- [ ] Conversas persistidas e recuperáveis por usuário/expert.
- [ ] Upload de arquivo (PDF/TXT/MD/imagem/vídeo/áudio) cria fonte, processa assincronamente e exibe status até `ready`.
- [ ] Adição de URL cria fonte, extrai texto e processa assincronamente.
- [ ] Deduplicação: reenviar mesmo arquivo/URL não reprocessa; reutiliza fonte existente.
- [ ] RAG: respostas do expert referenciam contexto dos conectores do tenant.
- [ ] Geração de imagem e vídeo funcionam dentro do chat e exibem a mídia.
- [ ] User profile com logout presente na home.
- [ ] Isolamento multi-tenant verificado (RLS + filtro Weaviate).
- [ ] `npm run lint`, `npm run check-types`, `npm run test` passam.
- [ ] Weaviate sobe via Docker Compose e health check passa.

## Impacto técnico

### Arquivos afetados

| Arquivo / Caminho                          | Ação                         | Descrição                                                                                                                                    |
| ------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/src/modules/agents/`             | create                       | Slice `agents`: domain (Expert entity, ExpertKey), application (use cases), infrastructure (config/seed), interface (controllers).           |
| `apps/api/src/modules/connectors/`         | create                       | Slice `connectors`: upload, URL, dedup, processamento async, status.                                                                         |
| `apps/api/src/modules/conversations/`      | create                       | Slice `conversations`: conversas, mensagens, streaming (SSE).                                                                                |
| `apps/api/src/modules/media/`              | create (ou dentro de agents) | Geração de imagem/vídeo (gpt-image-2, Gemini).                                                                                               |
| `apps/api/src/shared/database/schema.ts`   | modify                       | Novas tabelas: `experts`? (ou config), `connectors`, `connector_jobs` (ou status na connector), `conversations`, `messages`, `media_assets`. |
| `apps/api/src/app.module.ts`               | modify                       | Registrar novos módulos.                                                                                                                     |
| `apps/api/package.json`                    | modify                       | Adicionar dependências LangChain.js, LangGraph, Weaviate client, loaders, embeddings, etc.                                                   |
| `apps/app/src/modules/agents/`             | create                       | Front-end: home com footer, chat, sugestões, upload, user profile.                                                                           |
| `apps/app/src/routes/home-placeholder.tsx` | modify                       | Substituir placeholder pela home de experts (ou nova rota).                                                                                  |
| `apps/app/src/shared/api-client.ts`        | modify                       | Endpoints de agents/connectors/conversations.                                                                                                |
| `docker-compose.yml`                       | modify                       | Adicionar serviço Weaviate (e Redis opcional).                                                                                               |
| `infra/`                                   | create/modify                | Config/init do Weaviate se necessário.                                                                                                       |

### Dependências

- Bibliotecas (api): `langchain`, `@langchain/openai`, `@langchain/google-genai`, `@langchain/community` (loaders), `@langchain/weaviate` (ou `weaviate-ts-client`), `langgraph`, `langsmith`, `uuid`, `cheerio` (URL extraction), `pdf-parse`/loaders, `multer` (upload), `bullmq` + `ioredis` (opcional, se fila).
- Infra: Weaviate (Docker), Postgres (existente), Redis (opcional, profile).
- Externos: OpenAI (gpt-4o-mini, text-embedding-3-small, gpt-image-2), Google Gemini (gemini-omni-flash), LangSmith SaaS.
- Specs: `000-foundation`, `004-auth-sign-in` (auth Bearer), `009-redesign-ui-all-pages` (UI base).

### Componentes de UI

| Componente                | Origem        | Uso                                  |
| ------------------------- | ------------- | ------------------------------------ |
| `DropdownMenu` / `Select` | `@repo/ui`    | Seleção de expert.                   |
| `Textarea`                | `@repo/ui`    | Prompt input.                        |
| `Button`                  | `@repo/ui`    | Enviar, upload, logout.              |
| `Card`                    | `@repo/ui`    | Mensagens, containers.               |
| `Avatar`                  | `@repo/ui`    | Expert/usuário no chat.              |
| `Dialog`                  | `@repo/ui`    | Modal de adicionar conexão.          |
| `Progress` / `Badge`      | `@repo/ui`    | Status de processamento.             |
| `ScrollArea`              | `@repo/ui`    | Área de chat.                        |
| Novos (se necessário)     | `packages/ui` | Bolha de mensagem, preview de mídia. |

## Plano de implementação

### Etapa 1: Infraestrutura (Docker + Weaviate)

- Adicionar serviço Weaviate ao `docker-compose.yml` (porta 8080/50051), com volume persistente.
- (Opcional) Redis via profile para filas.
- Atualizar `scripts/infra-health.mjs` para checar Weaviate.
- Adicionar variáveis de ambiente (`WEAVIATE_URL`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`).

### Etapa 2: Dependências e configuração (api)

- Instalar dependências LangChain.js e clientes.
- Criar módulo `shared/ai` (ou dentro de agents) com configuração de modelos (gpt-4o-mini, embeddings, gpt-image-2, Gemini) e LangSmith tracing.
- Configurar Weaviate client e schema/collection `ConnectorChunk`.

### Etapa 3: Banco de dados (schema + migrations)

- Adicionar tabelas `connectors`, `conversations`, `messages`, `media_assets` (e opcional `connector_chunks` metadata) ao `schema.ts`.
- Gerar e aplicar migration (`db:generate`, `db:migrate`).
- RLS policies por `user_id`/`organization_id`.

### Etapa 4: Slice `agents` (domain + application)

- Definir `ExpertKey` enum e entidade `Expert` com prompt de sistema e sugestões.
- Config estática dos 9 experts.
- Use cases: `ListExperts`, `GetExpert`, `GetSuggestions`.

### Etapa 5: Slice `connectors` (upload, URL, dedup, processamento)

- Endpoints: `POST /api/v1/connectors/upload` (multipart), `POST /api/v1/connectors/url`.
- Use cases: `CreateConnectorFromFile`, `CreateConnectorFromUrl`, `DeduplicateConnector`, `ProcessConnector` (async).
- Processamento: loader por tipo → chunking → embeddings → upsert Weaviate → status `ready`/`failed`.
- Endpoint `GET /api/v1/connectors/:id` para status.

### Etapa 6: Slice `conversations` + chat streaming

- Endpoints: `POST /api/v1/conversations` (criar), `GET /api/v1/conversations`, `GET /api/v1/conversations/:id/messages`.
- `POST /api/v1/conversations/:id/messages` com SSE streaming: LangGraph agent (expert prompt + RAG retriever + tools de geração de mídia).
- Persistir mensagens (user + assistant) ao final do stream.

### Etapa 7: Geração de mídia

- Tool do LangGraph: `generateImage` (gpt-image-2) e `generateVideo` (Gemini), salvando asset e retornando URL/referência; exibir no chat.

### Etapa 8: Front-end (home + chat + upload)

- Substituir `home-placeholder` pela home de experts.
- Footer: dropdown de expert, textarea, botão enviar; FAB para adicionar conexão; user profile (logout).
- Chat: lista de mensagens, streaming, sugestões clicáveis.
- Modal de conexão: upload de arquivo / URL, status.
- Clientes de API (TanStack Query) e SSE handling.

### Etapa 9: QA

- Testes unitários/integração para use cases e conectores.
- `npm run lint`, `check-types`, `test`.
- Smoke manual: subir infra (`infra:up`), rodar api/app, testar fluxo completo.
- Verificar LangSmith traces.

## Riscos e ressalvas

| Risco                                                | Probabilidade | Impacto | Mitigação                                                                                 |
| ---------------------------------------------------- | ------------- | ------- | ----------------------------------------------------------------------------------------- |
| Custo/latência de embeddings e LLM                   | medium        | medium  | Usar gpt-4o-mini + text-embedding-3-small; limitar tamanho de chunks e top-k.             |
| Processamento async em processo (perda ao reiniciar) | medium        | medium  | Persistir status no Postgres; retomar jobs `processing` no startup; avaliar BullMQ+Redis. |
| Weaviate schema/versão incompatível com LangChain    | medium        | high    | Pin de versões; testar integração cedo (Etapa 2).                                         |
| Upload de arquivos grandes / tipos maliciosos        | medium        | high    | Limites de tamanho, validação de MIME, armazenamento fora do DB (filesystem/volume).      |
| RLS + Weaviate filtro dessincronizados               | medium        | high    | Testes de isolamento; metadata de tenant obrigatório no upsert.                           |
| Streaming SSE com auth Bearer                        | low           | medium  | Passar token via header; fallback query param se necessário.                              |
| Geração de vídeo (Gemini) lenta/instável             | medium        | medium  | Timeout generoso, status de asset, retry.                                                 |
| Escopo muito grande (spec única)                     | high          | high    | Entregar por etapas; cada etapa deve compilar/testar isoladamente.                        |

## Referências

- `.docs/BUSINESS.md` — domínio e personas.
- `.docs/ARCHITECTURE.md` — stack e estado atual.
- `.docs/DEVELOPMENT.md` — camadas, slices, convenções.
- `.docs/DESIGN.md`, `.docs/DESIGN_SYSTEM.md` — UI.
- `.specs/000-foundation.md`, `.specs/004-auth-sign-in.md`, `.specs/009-redesign-ui-all-pages.md`.
- LangChain.js docs (Document Loaders, Weaviate integration, LangGraph, LangSmith).
- Weaviate docs.
