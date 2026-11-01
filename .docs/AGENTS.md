# Agentes

Diretrizes obrigatórias para agentes de código que atuam neste repositório.

## Skills de workflow

Usar para gerenciar o ciclo de vida das features.

| Skill             | Quando usar                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `breakdown-specs` | Decompor um pedido grande em várias specs antes de criar cada uma     |
| `create-spec`     | Criar uma nova spec a partir de uma ideia ou necessidade              |
| `refine-spec`     | Refinar uma spec existente antes da implementação                     |
| `feature-concept` | Stress-testar um plano com perguntas profundas antes de codar         |
| `implement-me`    | Executar uma spec aprovada (orquestra `feature-concept` internamente) |
| `orchestrate-me`  | Executar um lote de specs em paralelo, com um subagent por spec       |
| `refactor-vertical-slices` | Auditar e refatorar slices para camadas/hexagonal, handlers 1:1 com use cases, gates, push e PR |
| `code-review` | Revisar um PR do GitHub com o agente code-reviewer, publicando comentários inline (Conventional Comments) e revisão final (approve/request changes) |
| `skill-creator`   | Criar ou evoluir uma skill do projeto                                 |
| `find-skills`     | Procurar skill existente no ecossistema antes de criar uma nova       |
| `check-security-dependencys` | Auditar dependências (npm audit), aplicar versão corrigida e validar. Acionada pelo subagent `security-deps-auditor` no `/open-pr` |

## Skills por contexto técnico

| Contexto                   | Skill                                      |
| -------------------------- | ------------------------------------------ |
| UI / Componentes visuais   | `frontend-design`, `web-design-guidelines` |
| Design system / shadcn     | `shadcn`                                   |
| Next.js / App Router       | `next-best-practices`                      |
| React / Performance        | `vercel-react-best-practices`              |
| Banco de dados / SQL / RLS | `supabase-postgres-best-practices`         |
| E2E / Automação de browser | `playwright`                               |

Sempre identificar o contexto da tarefa antes de iniciar e carregar a skill correspondente.

## Onde as skills vivem

Fonte única: **`.agents/skills/<nome>/SKILL.md`**. É o caminho que o OpenCode descobre como fonte de compatibilidade de projeto e o que o CLI `npx skills` grava para o agente `opencode`.

Não criar cópias, junctions ou pastas paralelas em `skills/`, `.claude/skills/` ou `.opencode/skills/`. Junction do Windows é seguida pelo git: commitar uma delas duplica a árvore inteira no repositório, e o histórico passa a divergir de `.agents/skills/`.

Instalar skills do ecossistema sempre com o agente explícito:

```bash
npx skills add <fonte> -a opencode
```

`skills-lock.json` rastreia apenas as skills do ecossistema. As skills próprias do projeto (`breakdown-specs`, `create-spec`, `feature-concept`, `implement-me`, `orchestrate-me`, `refactor-vertical-slices`, `refine-spec`, `code-review`) não estão no lock — são versionadas junto com `.agents/skills/`.

## Comandos do projeto

Comandos do OpenCode vivem em [`.opencode/commands/`](../.opencode/commands/).

| Comando            | Quando usar                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| `/commit-and-push` | Fechar uma unidade de trabalho: lê o diff, gera a mensagem, commita e faz push       |
| `/open-pr`         | Abrir o PR de uma feature: roda o `security-deps-auditor`, commita `fix(deps)` separado, valida gates e abre o PR com a seção de segurança |

Toda execução de spec termina com `/commit-and-push`. O comando segue Conventional Commits e inclui o trailer `Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>`. O domínio `.invalid` é reservado pela RFC 2606: o co-autor aparece como texto no GitHub, sem vínculo com conta de terceiro.

## Regras não negociáveis

1. **Não invente o que existe.** Verificar `package.json`, `turbo.json` e o código antes de afirmar que uma ferramenta está ou não na stack. A confusão entre _estado atual_ e _estado-alvo_ já causou divergência entre spec e código neste repositório.
2. **Divergência entre doc e código é bug.** Não "corrigir" a documentação para adequar ao código. Descobrir por que divergiram.
3. **Toda decisão arquitetural gera ADR** em [`.adrs/`](../.adrs/README.md), com resumo impresso na resposta.
4. **Nada é concluído sem QA.** Todos os comandos de [QA.md](./QA.md) precisam passar. Ver tabela completa.
5. **A entrega é completa.** Resumo, ADRs, arquivos modificados, bibliotecas instaladas, racionais, passos manuais de QA e resultado das verificações. Se não se aplica, escrever "n/a" com o motivo.

## Arquivos de referência

| Arquivo                                | Conteúdo                                                              |
| -------------------------------------- | --------------------------------------------------------------------- |
| [ARCHITECTURE.md](./ARCHITECTURE.md)   | Arquitetura alvo, stack, estado atual e decisões vigentes             |
| [BUSINESS.md](./BUSINESS.md)           | Domínio de negócio, visão e personas dos agentes                      |
| [DESIGN.md](./DESIGN.md)               | Diretrizes visuais e paleta de cores                                  |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Componentes shadcn/ui e padrões de acessibilidade                     |
| [DEVELOPMENT.md](./DEVELOPMENT.md)     | Arquitetura em camadas, vertical slices, TDD, convenções              |
| [QA.md](./QA.md)                       | Comandos de verificação, testes, infraestrutura e critérios de aceite |
| [RULES.md](./RULES.md)                 | Fluxo de trabalho, ADRs, entrega, commits e branches                  |
| [`.adrs/`](../.adrs/README.md)         | Decisões arquiteturais e template                                     |

## Specs e planos

| Caminho                             | Conteúdo                                              |
| ----------------------------------- | ----------------------------------------------------- |
| [`.specs/`](../.specs/_template.md) | Especificações de feature — o que será construído     |
| `.docs/plans/`                      | Planos de execução — como cada spec será implementada |

Specs descrevem **o quê** e **por quê**. Planos descrevem **como**, com etapas e comandos. Mudança de escopo passa por `refine-spec` antes de virar código.
