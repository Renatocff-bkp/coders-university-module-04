# Plano de implementação — 010-experts-agents

## Decisões consolidadas (feature-concept)

- **Storage de arquivos/mídia:** Postgres (bytea/base64). Limites: upload máx. 25 MB; imagens geradas armazenadas como base64 (bytea); vídeos gerados armazenados como base64 se Gemini retornar bytes, caso retorne URL, armazenar apenas a URL.
- **Tenant:** escopo por `userId` (usuário autenticado) nesta spec; `organizationId` nullable para evolução futura. Isolamento por filtro de aplicação + RLS policies (defense-in-depth). API continua conectando como superuser (limitação pré-existente).
- **Processamento async:** in-process (fire-and-forget com status no Postgres), retomando jobs `processing` no startup. BullMQ+Redis fica como evolução futura.
- **Weaviate:** container Docker (porta 8080), collection `ConnectorChunk` com metadata `userId`, `connectorId`, `sourceName`, `chunkIndex`.
- **LangSmith:** SaaS (env `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`).
- **Modelos:** gpt-4o-mini (chat), text-embedding-3-small (embeddings), gpt-image-2 (imagem), Gemini gemini-omni-flash (vídeo).
- **Experts:** config estática em código (array), não persistida em DB.
- **Conversas:** persistidas (conversations + messages) no Postgres.
- **Sugestões:** fixas por expert (config estática).
- **URL connector:** extração de texto de uma única página (cheerio), sem crawl.
- **Streaming:** SSE via NestJS, autenticado por Bearer token (header).

## Arquitetura de módulos (NestJS)

Novos slices em `apps/api/src/modules/`:

- `agents/` — experts, sugestões, (media tools).
- `connectors/` — upload, URL, dedup, processamento.
- `conversations/` — conversas, mensagens, chat streaming (LangGraph).
- `media/` — geração de imagem/vídeo (pode ser submódulo de agents).

Shared: `apps/api/src/shared/ai/` — configuração de modelos, Weaviate client, LangSmith tracing.

## Schema (Drizzle) — adições

```ts
// connectors
connectors: id (uuid pk), userId (uuid fk auth_users), organizationId (uuid nullable fk organizations),
  type ('file'|'url'), name (text), sourceHash (text unique per user? or global?), status ('pending'|'processing'|'ready'|'failed'),
  mimeType (text nullable), sizeBytes (int nullable), url (text nullable), content (bytea nullable for files),
  errorMessage (text nullable), metadata (jsonb), createdAt, updatedAt, processedAt

// conversations
conversations: id (uuid pk), userId, expertKey (text), title (text nullable), createdAt, updatedAt

// messages
messages: id (uuid pk), conversationId (fk), role ('user'|'assistant'|'system'), content (text),
  metadata (jsonb nullable: toolCalls, mediaIds), createdAt

// media_assets
media_assets: id (uuid pk), userId, messageId (fk nullable), type ('image'|'video'), mimeType, data (bytea nullable), url (text nullable),
  prompt (text), model (text), createdAt
```

Índices: connectors(userId, status), connectors(userId, sourceHash), conversations(userId, expertKey), messages(conversationId, createdAt).

## API endpoints (sob /api/v1)

- `GET /experts` — lista experts.
- `GET /experts/:key/suggestions` — sugestões.
- `POST /connectors/upload` (multipart) → cria fonte, inicia processamento, retorna `{ id, status }`.
- `POST /connectors/url` (JSON `{ url }`) → idem.
- `GET /connectors/:id` → status.
- `GET /connectors` → lista do usuário.
- `POST /conversations` (JSON `{ expertKey, title? }`) → cria.
- `GET /conversations?expertKey=` → lista.
- `GET /conversations/:id/messages` → mensagens.
- `POST /conversations/:id/messages` (SSE) → envia mensagem do usuário e streama resposta do assistant. Body `{ content }`.
- `GET /media/:id` → retorna bytes (ou URL redirect).

## LangGraph agent

Um agent por request (expert selecionado), com:

- System prompt do expert.
- Tool: `retrieve_context` (Weaviate similarity search filtrado por userId, top-k 5).
- Tool: `generate_image` (gpt-image-2) → salva media_asset, retorna referência.
- Tool: `generate_video` (Gemini) → idem.
- Streaming de tokens via LangGraph stream.

## Processamento de connector (async)

1. Criar registro `pending`.
2. Marcar `processing`.
3. Extrair texto:
   - file: Document Loader por MIME (PDFLoader, TextLoader, etc.).
   - url: fetch + cheerio (Readability).
4. Chunking (RecursiveCharacterTextSplitter, ~1000 chars, overlap 200).
5. Embeddings (text-embedding-3-small).
6. Upsert no Weaviate (batch) com metadata.
7. Marcar `ready` + processedAt; ou `failed` + errorMessage.

Dedup: antes de criar, calcular `sourceHash`:

- file: sha256 do buffer.
- url: sha256 da URL normalizada.
  Se existir connector com mesmo (userId, sourceHash), retornar existente sem reprocessar.

## Front-end (apps/app)

- Substituir `home-placeholder` por `ExpertsHome` (rota `/app`).
- Layout: área de chat (mensagens), footer fixo com Select (expert), Textarea, Button enviar, FAB (Dialog upload/URL), user profile (logout).
- Sugestões: chips clicáveis que enviam prompt.
- Streaming: consumir SSE via fetch + ReadableStream, append tokens.
- Upload: multipart via api-client; polling de status.
- Componentes: usar @repo/ui (Select, Textarea, Button, Card, Dialog, Avatar, Badge, ScrollArea). Adicionar se necessário.

## Infra (docker-compose)

- Adicionar serviço `weaviate` (semver 1.27.x) com volume persistente, porta 8080.
- Env vars na api: `WEAVIATE_URL`, `OPENAI_API_KEY`, `GOOGLE_API_KEY` (ou `GEMINI_API_KEY`), `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`, `LANGSMITH_TRACING`.

## QA / testes

- Unit: dedup hash, chunking config, expert config.
- Integração: connectors upload/url (mock Weaviate/OpenAI), conversations.
- Lint, check-types, build, format:check.
- Smoke manual: subir infra, api, app; fluxo completo.

## Ordem de execução (etapas)

1. Infra Weaviate + env + deps (api + app).
2. Schema Drizzle + migration.
3. Shared AI module (modelos, Weaviate client).
4. Slice agents (experts config, endpoints).
5. Slice connectors (upload, url, dedup, processamento).
6. Slice conversations + chat streaming (LangGraph).
7. Media generation (image/video).
8. Front-end (home, chat, upload, profile).
9. QA + ajustes.

Cada etapa deve compilar e passar lint/check-types antes da próxima.
