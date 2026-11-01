---
name: breakdown-specs
description: Breaks a broad feature request into a sequence of small, independently implementable specs. Use whenever the user describes an epic or a whole module instead of a single feature — authentication (sign-up, sign-in, confirm-account, forgot-password), CRUD for several entities (users, products, orders), an admin area, onboarding, payments, notifications. Triggers on "breakdown", "break down into specs", "quebrar em specs", "dividir em specs", "decompor", "specs para cada parte", or when one prompt clearly contains multiple features that should ship one at a time, even if the user never says "spec". Do not use for a single cohesive feature.
---

# Breakdown Specs

Skill para transformar um pedido grande em várias specs pequenas, cada uma implementável, testável e publicável sozinha, usando o fluxo da skill `create-spec`.

O objetivo não é produzir mais documentos. É permitir que cada parte seja **implementada e publicada antes da próxima começar**, reduzindo o tamanho do diff e o risco de uma spec com quarenta requisitos que nunca fica pronta.

## Quando usar

- O prompt descreve um módulo inteiro: autenticação, CRUD de várias entidades, painel administrativo, onboarding, faturamento
- O prompt contém várias features que dependem umas das outras
- Uma spec existente está grande demais para uma única implementação
- O usuário pede explicitamente para quebrar, dividir ou decompor

## Quando não usar

Se o pedido já é uma feature única e coesa, **não force uma divisão**. Informe que cabe em uma spec e siga direto para `create-spec`. Dividir artificialmente cria specs que só fazem sentido juntas — o oposto do objetivo.

O mesmo vale para uma feature pequena com dois ou três requisitos: ela é uma spec, não um épico.

## Argumentos

| Argumento | Obrigatório | Descrição                                                      |
| --------- | ----------- | -------------------------------------------------------------- |
| `prompt`  | Sim         | Descrição do módulo ou épico a ser decomposto                  |
| contexto  | Não         | Restrições, ordem desejada, prazo, o que já existe no codebase |

## Fluxo

### 1. Carregar contexto

1. Leia `.docs/AGENTS.md` — regras e skills obrigatórias
2. Leia `.docs/ARCHITECTURE.md` — estrutura e stack
3. Leia `.docs/BUSINESS.md` — domínio e visão
4. Leia `.docs/DEVELOPMENT.md` — convenções e vertical slices
5. Leia `.specs/_template.md` — estrutura esperada
6. Liste `.specs/*.md` — numeração usada e features já especificadas
7. Liste `.docs/plans/` — o que já está em andamento

A numeração das specs é sequencial e nunca reaproveitada. Descobrir o próximo número antes de fatiar evita renumerar tudo depois.

### 2. Entender o domínio antes de fatiar

Não comece por telas, endpoints ou arquivos. Extraia do prompt:

| Dimensão    | Pergunta-chave                                        |
| ----------- | ----------------------------------------------------- |
| Atores      | Quem usa? Existem papéis diferentes?                  |
| Jornadas    | O que cada ator faz, do início ao fim?                |
| Entidades   | Quais dados existem e como se relacionam?             |
| Regras      | O que é obrigatório, proibido, calculado, notificado? |
| Integrações | E-mail, pagamento, storage, serviço externo, webhook? |
| Operação    | Seeds, migrações, observabilidade, backoffice?        |

Se o prompt não responde alguma dessas dimensões e a resposta muda o corte, pergunte — **uma pergunta por vez**, com uma recomendação baseada no projeto, como manda o `feature-concept`.

### 3. Fatiar em fatias verticais

Regra central: **uma spec entrega um resultado observável do ponto de vista de quem usa.** Se para demonstrar a spec é preciso que a próxima já esteja pronta, o corte está errado.

Padrões de corte que funcionam:

| Pedido                        | Fatiar por                 | Exemplo                                                                                      |
| ----------------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| Autenticação                  | etapa da jornada           | sign-up → confirm-account → sign-in → forgot-password → reset-password → sessão e permissões |
| CRUD de várias entidades      | entidade                   | users → products → orders                                                                    |
| CRUD complexo de uma entidade | operação com regra própria | listagem e busca → cadastro → edição → exclusão/arquivamento                                 |
| Painel administrativo         | domínio administrado       | admin de usuários → admin de catálogo → admin de pedidos                                     |
| Integração externa            | contrato → efeito → falha  | webhook recebido → conciliação do pagamento → reprocessamento e fallback                     |
| Notificações                  | canal e gatilho            | e-mail transacional → preferências → fila com retentativa                                    |

**Fundação compartilhada.** Quando várias fatias dependem da mesma base (schema, tabela de perfis, cliente de e-mail, guard de rota), crie uma spec de fundação primeiro e diga que ela é dependência. Nunca esconda trabalho compartilhado dentro da primeira feature: isso faz a primeira spec parecer maior do que é e deixa as outras sem base explícita.

Não use como critério de corte:

| Anti-padrão                           | Por que falha                                                 |
| ------------------------------------- | ------------------------------------------------------------- |
| Spec por camada (models, API, UI)     | Nenhuma entrega valor sozinha; o diff não fecha               |
| Spec de infraestrutura sem consumidor | Não há critério de aceite observável                          |
| Specs que só funcionam juntas         | Dependência circular disfarçada de ordem                      |
| Micro-spec de componente isolado      | Só se for dependência compartilhada real, não por organização |
| Uma spec por endpoint                 | Fragmenta a jornada e multiplica cerimônia sem reduzir risco  |
| Vinte specs para um CRUD simples      | Over-splitting: burocracia maior que a feature                |

### 4. Definir a ordem

Monte um grafo de dependências e ordene topologicamente:

- Fundação antes de quem consome
- Fluxo feliz antes de recuperação e casos de borda
- Sempre que possível, a primeira spec deve ser publicável sozinha em produção, mesmo que atrás de feature flag
- Dependência de outra spec é dita pelo número: `Depende de: 004`

Se aparecer ciclo, o corte está errado. Junte as specs envolvidas ou introduza uma fundação que quebre o ciclo.

### 5. Validar o mapa com o usuário

Antes de criar qualquer arquivo, apresente o mapa e peça aprovação:

| Ordem | Spec                       | Entrega                          | Depende de | Tamanho |
| ----- | -------------------------- | -------------------------------- | ---------- | ------- |
| 001   | `001-auth-foundation`      | schema, perfis e guard de sessão | —          | M       |
| 002   | `002-auth-sign-up`         | cadastro com e-mail e senha      | 001        | S       |
| 003   | `003-auth-confirm-account` | confirmação por e-mail           | 001, 002   | S       |

Explique em uma frase por que cada corte foi feito e o que ficou de fora. Ajuste antes de escrever os arquivos — reescrever o mapa é barato, reescrever sete specs não é.

### 6. Criar as specs com `create-spec`

Para cada fatia aprovada, execute o fluxo do `create-spec`, com dois cuidados:

1. **Não repita a entrevista.** O que já foi respondido nas etapas 2 a 4 vale para todas as specs. Pergunte apenas o que é específico daquela fatia — normalmente critérios de aceite e detalhes de UI.
2. **Deixe as fronteiras explícitas.** Cada spec precisa deixar claro onde termina:

- `## Contexto` cita o épico e a ordem das specs
- `### Fora do escopo` nomeia as specs irmãs e o que pertence a cada uma
- `### Dependências` lista os números das specs que precisam existir antes
- `## Referências` aponta para as specs vizinhas

Numeração e nome:

- Arquivo: `.specs/NNN-{slug-kebab-case}.md`
- `NNN` = próximo inteiro livre, três dígitos, sequencial, nunca reutilizado
- Status inicial `draft`; `refined` quando as respostas já foram coletadas na entrevista

### 7. Registrar o mapa do épico

Salve o mapa em `.docs/plans/{epic}-breakdown.md` com ordem, dependências, status e o que cada spec entrega. É o índice que permite retomar o épico semanas depois sem reler todas as specs, e o que o `implement-me` consulta para saber o que vem depois.

Atualize o status (`draft`, `approved`, `implemented`) conforme as specs avançam.

### 8. Entrega

Apresente conforme `.docs/RULES.md`:

| Item             | Conteúdo                                                         |
| ---------------- | ---------------------------------------------------------------- |
| Resumo           | Quantas specs, em que ordem, qual o critério de corte            |
| Decisões         | Por que cada fronteira foi desenhada assim                       |
| Arquivos criados | Specs e mapa do épico                                            |
| Fora do escopo   | O que foi deliberadamente deixado para outra spec ou para depois |
| Verificação      | Conferência de numeração, dependências e fronteiras              |
| Próximos passos  | `implement-me` na primeira spec                                  |

## Critérios de uma spec bem fatiada

Antes de considerar a fatia pronta:

- [ ] Tem um único resultado observável
- [ ] Um ator principal
- [ ] No máximo seis requisitos funcionais
- [ ] Critérios de aceite verificáveis sem depender da próxima spec
- [ ] `Fora do escopo` nomeia as specs irmãs
- [ ] Dependências explícitas e sem ciclo
- [ ] Dá para implementar, testar e publicar sozinha

Se algum item falhar, divida mais. Se a fatia for grande demais mas indivisível, registre o risco no mapa em vez de escondê-lo.

## Exemplo: autenticação

Prompt recebido: _"precisamos de autenticação com sign-in, sign-up, confirmação de conta, recuperação de senha e áreas restritas"_.

Corte:

| Ordem | Spec                    | Entrega                                              | Depende de |
| ----- | ----------------------- | ---------------------------------------------------- | ---------- |
| 001   | `auth-foundation`       | tabela de perfis, guard de sessão, cliente de e-mail | —          |
| 002   | `auth-sign-up`          | cadastro com e-mail e senha                          | 001        |
| 003   | `auth-confirm-account`  | confirmação por e-mail e reenvio                     | 001, 002   |
| 004   | `auth-sign-in`          | login, logout e sessão                               | 001, 003   |
| 005   | `auth-forgot-password`  | solicitação e redefinição de senha                   | 004        |
| 006   | `auth-protected-routes` | redirecionamento e permissões por papel              | 004        |

O que não entra em nenhuma delas: login social, MFA, gestão de dispositivos. Fica registrado como fora do escopo no mapa, não esquecido.

Cada spec cita as outras e diz o que **não** faz. A `auth-sign-in` não implementa recuperação de senha; a `auth-forgot-password` não redefine a sessão de outros dispositivos.

## Regras

- **Uma feature por spec** — Se a spec precisa de duas jornadas para fazer sentido, são duas specs
- **Fatia vertical, nunca camada** — models, API e UI da mesma entrega ficam juntos
- **Toda spec é implementável sozinha** — esse é o teste que valida o corte
- **Dependências explícitas e acíclicas** — número da spec que precisa existir antes
- **Fronteiras escritas nas duas direções** — `Fora do escopo` aponta os irmãos, `Referências` também
- **Numeração estável** — nunca renumere uma spec criada
- **Não implemente** — esta skill apenas decompõe e cria specs; a execução é do `implement-me`
- **Não divida o que não precisa** — uma feature coesa é uma spec só
