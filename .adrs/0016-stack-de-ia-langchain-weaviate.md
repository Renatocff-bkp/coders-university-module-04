# 0016. Stack de IA: LangChain.js + Weaviate + modelos OpenAI/Gemini

- **Status:** accepted
- **Data:** 2026-11-01
- **Decisores:** Renato

## Contexto

O produto (plataforma de agentes de IA executivos) precisa de capacidades de RAG, chat com streaming, geração de imagem/vídeo e observabilidade de LLM. Até agora o monorepo não possuía stack de IA. A spec `010-experts-agents.md` introduz os agentes especialistas.

Restrições: tudo deve rodar local via Docker (exceto chamadas a provedores de modelo); o back-end é NestJS (Node) em monólito modular; banco Postgres existente com RLS/multi-tenant.

## Decisão

Adotar **LangChain.js + LangGraph** rodando como módulo dentro do NestJS (`apps/api`), com **Weaviate** como banco de dados vetorial via Docker Compose, **LangSmith (SaaS)** para observabilidade/avaliações/tracing, e os modelos:

- Base/chat: OpenAI `gpt-4o-mini`
- Embeddings: OpenAI `text-embedding-3-small`
- Imagem: OpenAI `gpt-image-2`
- Vídeo: Google Gemini (`gemini-omni-flash`)

Carregamento de arquivos via Document Loaders + DirectoryLoaders do LangChain.js. LangSmith Studio para desenvolvimento local.

## Alternativas consideradas

| Alternativa                            | Por que não foi escolhida                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| LangChain em Python (serviço separado) | Stack duplicada; integração com NestJS/TypeScript mais complexa; time já em TS.                                    |
| OpenAI Assistants API direta           | Menos controle sobre RAG/Weaviate e multi-tenant; vendor lock-in forte.                                            |
| pgvector (Postgres) em vez de Weaviate | Weaviate tem suporte nativo no LangChain.js e recursos de vector search; mantém Postgres para dados transacionais. |
| LangSmith self-hosted                  | Licença/infra pesada; SaaS suficiente para dev e observabilidade.                                                  |

## Consequências

### Positivas

- Stack unificada em TypeScript/NestJS.
- Weaviate com suporte LangChain.js e filtros por tenant.
- LangSmith fornece tracing, custo e avaliações out-of-the-box.

### Negativas

- Nova dependência de infraestrutura (Weaviate) e variáveis de API (OpenAI, Gemini, LangSmith).
- Custo operacional de chamadas a provedores externos.

### Neutras / riscos aceitos

- Processamento assíncrono inicialmente in-process; pode evoluir para BullMQ+Redis.

## Referências

- `.specs/010-experts-agents.md`
- `.docs/ARCHITECTURE.md`
