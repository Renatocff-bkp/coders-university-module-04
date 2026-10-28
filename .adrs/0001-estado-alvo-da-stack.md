# 0001. Estado-alvo da stack do monorepo

- **Status:** accepted
- **Data:** 2026-09-29
- **Decisores:** Renato Figueredo

## Contexto

O repositório foi inicializado com `create-turbo`, que gera um monorepo com dois apps Next.js (`apps/web` e `apps/docs`) e pacotes de configuração compartilhados.

A spec `000-foundation` e a documentação de arquitetura original descreviam um cenário diferente:

- `apps/api` com NestJS
- `apps/app` como cliente React.js com Vite
- Supabase para autenticação, banco e storage
- shadcn/ui e TailwindCSS como design system
- TanStack (Query, Table, Chart) e date-fns
- Vitest, Playwright e Supertest
- Observabilidade via stack LGTM desde o dia zero

Ao tentar refinar a spec `000-foundation`, a spec foi reescrita para descrever apenas o que o template havia gerado — dois apps Next.js, sem backend, sem banco e sem testes. Isso apagou a intenção de projeto sem que houvesse decisão registrada para tanto.

A divergência não podia ser resolvida adivinhando qual documento estava certo. O repositório ficou com duas arquiteturas concorrentes e sem registro de qual era a pretendida.

## Decisão

A documentação de arquitetura e a spec `000-foundation` definem a arquitetura **alvo**, e o scaffold do `create-turbo` é tratado como estado divergente a ser corrigido.

O estado-alvo é:

| App         | Stack                        | Responsabilidade                          |
| ----------- | ---------------------------- | ----------------------------------------- |
| `apps/api`  | NestJS + TypeScript          | API REST, regras de negócio, persistência |
| `apps/app`  | React.js + Vite + TypeScript | Cliente web (SPA)                         |
| `apps/docs` | Next.js                      | Documentação                              |

Com Supabase como backend-as-a-service para auth, Postgres e Storage; shadcn/ui sobre TailwindCSS como design system; TanStack para dados, tabelas e gráficos; Vitest e Playwright para testes; e stack LGTM para observabilidade desde o dia zero.

A distinção entre _estado atual_ e _estado-alvo_ passa a ser explícita em `ARCHITECTURE.md`, para que o scaffold nunca mais seja confundido com a arquitetura pretendida.

## Alternativas consideradas

| Alternativa                                             | Por que não foi escolhida                                                                                                                                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Manter Next.js nos dois apps e corrigir a spec          | Descarta a intenção de SPA com Vite sem que ninguém tenha decidido isso. Next.js nos dois apps também traz SSR para um cliente que não precisa dele, e o boilerplate do `create-turbo` teria-se tornado a fonte da verdade por acaso |
| Assumir que a spec estava obsoleta                      | Era exatamente o erro que já tinha sido cometido. Não há evidência de que a spec tenha sido superada — a spec é anterior ao scaffold                                                                                                 |
| Esperar a decisão e deixar a spec ambígua               | Mantém o repositório sem fonte da verdade, que é a condição que causou o problema                                                                                                                                                    |
| Separar em duas specs (fundação atual + backend depois) | Plausível, porém deixa a questão de framework do cliente sem resolver, e é a decisão mais difícil de revisar depois. Resolver aqui é mais barato                                                                                     |

## Consequências

### Positivas

- A spec e a documentação passam a descrever a mesma arquitetura
- A origem do conflito fica registrada, evitando repetição
- A distinção entre estado atual e alvo torna o trabalho pendente visível em vez de oculto
- A regra de divergência em `RULES.md` previne a classe inteira do erro

### Negativas

- A `000-foundation` cresce bastante: passa a cobrir API, cliente, banco, testes e observabilidade
- Converte `apps/web` (Next.js) em `apps/app` (React + Vite) — trabalho adicional, não reaproveitamento
- Requer adicionar ferramentas que ainda não existem no repositório

### Neutras / riscos aceitos

- A stack é ampla para a fase inicial. Aceito porque o produto é uma plataforma de agentes conectada a múltiplas fontes de dados, e não um site estático
- `apps/docs` permanece em Next.js mesmo com o cliente em Vite. Aceito por ser um app de conteúdo para o qual o SSR traz benefício real |
- Migrações de banco e filas não têm ADR próprio ainda. Devem ser criados quando a primeira migration real existir, não agora

## Referências

- [.specs/000-foundation.md](../.specs/000-foundation.md)
- [.docs/ARCHITECTURE.md](../.docs/ARCHITECTURE.md)
- [.docs/DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
