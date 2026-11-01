---
name: refactor-vertical-slices
description: Audita e refatora vertical slices da API NestJS para o padrão em camadas com portas/adapters hexagonais, use cases 1:1 com request handlers e dependências apontando para dentro. Use sempre que o usuário pedir para "refatorar slices", "adequar a arquitetura", "aplicar hexagonal", "separar controller e use case", "auditar camadas", "transformar controllers em request handlers", "quebrar controller por endpoint", "padronizar use cases", "ver o que não segue a arquitetura" ou revisar se uma slice segue domain/application/infrastructure/interface — mesmo que ele não diga "skill" nem "vertical slice". Também use antes de abrir PR de refatoração arquitetural na API.
---

# Refactor Vertical Slices

Orquestra uma refatoração arquitetural de ponta a ponta na API: audita as slices,
transforma os achados em um plano atômico, executa, roda os gates, publica a
branch e abre o PR. Cada fase roda em um subagent separado e deixa um artefato
para a fase seguinte.

Por que separar em agentes: a auditoria precisa de olhar cético e contexto limpo;
o plano precisa raciocinar sobre o contrato sem já ter mexido no código; a
execução precisa de foco em TDD; os gates precisam ser independentes de quem
escreveu o código. Misturar tudo em uma sessão faz o agente "defender" a própria
implementação e declarar verde o que não rodou.

## Quando usar

- "Refatore as slices da API para o padrão hexagonal."
- "Audite o que não segue domain/application/infrastructure/interface."
- "Transforme os controllers em request handlers 1:1 com use cases."
- "Por que esse controller injeta repositório? Padronize."
- Antes de um PR que muda arquitetura, nomenclatura de handlers ou wiring de DI.

Não use para:

- Criar uma feature nova (use `create-spec` + `implement-me`).
- Corrigir bug pontual sem violação arquitetural.
- Refatorar UI/React (o escopo padrão é `apps/api/src/modules`).
- Grandes lotes de features independentes (use `orchestrate-me`).

## Contrato e referências

Leia antes de executar:

- `references/target-architecture.md` — o contrato que será aplicado.
- `references/audit-rules.md` — catálogo de violações, severidades e falsos positivos.
- `references/subagent-prompts.md` — prompts completos das 6 fases.
- `references/artifacts.md` — template do plano e do corpo do PR.
- `scripts/audit-slices.mjs` — detector mecânico, sem dependências.

Docs do projeto que sempre valem: `.docs/AGENTS.md`, `.docs/ARCHITECTURE.md`,
`.docs/DEVELOPMENT.md`, `.docs/QA.md`, `.docs/RULES.md` e `.adrs/`.

## Argumentos

| Argumento             | Padrão                          | Efeito                                                                 |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| `--scope=<path>`      | `apps/api/src/modules`          | Diretório das slices auditadas                                         |
| `--slice=<a,b>`       | todas                           | Restringe a slices específicas                                         |
| `--severity=<modo>`   | `blocker+major`                 | `blocker`, `blocker+major` ou `all` (inclui `minor`)                   |
| `--branch=<nome>`     | `refactor/vertical-slices-{ts}` | Branch de trabalho                                                     |
| `--base=<ref>`        | `main`                          | Branch de destino do PR                                                |
| `--dry-run`           | falso                           | Para depois do plano; não cria branch nem executa                      |
| `--yes`               | falso                           | Pula a aprovação humana (só se não houver decisão de produto pendente) |
| `--no-pr`             | falso                           | Faz commit/push e para antes do PR                                     |
| `--max-fix-loops=<n>` | `2`                             | Ciclos de correção após QA vermelho                                    |

## Comandos portáveis

Os subagents rodam no mesmo shell do orquestrador. Antes de mandar um comando
para um subagent, confirme que ele funciona neste ambiente:

- Se `npm`/`npx` falharem por execution policy (`npm.ps1`/`npx.ps1` bloqueados),
  use `cmd /c "npm run <script>"` ou o binário local direto:
  - `node node_modules/turbo/bin/turbo run <task> [--filter=api]`
  - `node node_modules/prettier/bin/prettier.cjs --check "<glob>"`
- Prefira o binário de `node_modules` a inventar `npx`. Registre no `qa.md` se o
  script do `package.json` e a invocação direta divergirem.
- Cite caminho absoluto **entre aspas**: a raiz deste repositório tem espaço
  (`Modulo 04`), então todo `{scope}`, `{audit-json}`, `{plan-path}` e
  `{pr-path}` precisa de aspas na linha de comando.
- Nunca rode `npm install`, `format --write` ou qualquer comando que altere o
  repositório durante auditoria/QA.

## Artefatos

| Artefato  | Caminho                                                 | Versionado? |
| --------- | ------------------------------------------------------- | ----------- |
| Run       | `.refactor/{run-id}/`                                   | não         |
| Baseline  | `.refactor/{run-id}/baseline.md`                        | não         |
| Auditoria | `.refactor/{run-id}/audit.md` + `audit.json`            | não         |
| Execução  | `.refactor/{run-id}/execution.md`                       | não         |
| QA        | `.refactor/{run-id}/qa.md`                              | não         |
| PR        | `.refactor/{run-id}/pr.md`                              | não         |
| Plano     | `.docs/plans/{run-id}-refactor-vertical-slices-plan.md` | sim         |

`.refactor/` deve estar no `.gitignore`. O plano entra no commit/PR; os demais
artefatos são auditoria local. Nunca commite `.refactor/`, `.env` ou segredo.

## Fluxo

### Fase 0 — Pré-voo e preparação do run

Execute e registre. Item bloqueante que falhar interrompe a skill.

| #   | Verificação              | Como                                     | Bloqueante    |
| --- | ------------------------ | ---------------------------------------- | ------------- |
| 1   | Working tree limpo       | `git status --porcelain`                 | sim           |
| 2   | Branch atual             | `git branch --show-current`              | sim           |
| 3   | Remote existe            | `git remote` (só nomes; nunca `-v`)      | não (para PR) |
| 4   | Node/npm                 | `node -v`; `npm -v` ou `cmd /c "npm -v"` | sim           |
| 5   | Escopo existe            | `Test-Path {scope}` / `ls {scope}`       | sim           |
| 6   | `.refactor/` ignorado    | `git check-ignore .refactor/`            | não           |
| 7   | `gh` disponível          | `gh --version` e `gh auth status`        | não           |
| 8   | Branch de trabalho livre | `git branch --list "{branch}"`           | sim           |

- Working tree sujo: mostre `git status --short` e peça commit ou stash. **Nunca**
  faça stash, reset ou checkout por conta própria.
- Se `.refactor/` não estiver ignorado, adicione ao `.gitignore` e trate isso como
  parte do primeiro commit da refatoração (ou peça ao usuário para commitar antes).
- Crie `.refactor/{run-id}/` e `run.md` com: data, escopo, slices, branch, base,
  severidade, sessionIDs das fases e status.

Rode também o **baseline dos gates**, antes de qualquer edição, e salve em
`.refactor/{run-id}/baseline.md`: `format:check`, `lint`, `check-types`, `test`
e `build`, com resultado e trecho real do erro. O baseline existe para o QA
distinguir regressão de falha pré-existente:

- Em Windows com `core.autocrlf=true`, `format:check` acusa o repositório
  inteiro por CRLF. Classifique como `pre-existing (platform)` e não como quebra
  do refactor.
- Falha que já estava no baseline e não toca arquivo do diff é `pre-existing`:
  registre e siga.
- Falha nova, ou em arquivo tocado pela refatoração, é `fail` e volta para a
  execução.

### Fase 1 — Auditoria (subagent `general`, somente leitura)

1. Leia `references/subagent-prompts.md`, seção "Fase 1".
2. Preencha o prompt com `{repo-root}`, `{run-id}`, `{run-dir}`, `{scope}`,
   `{slices}` e `{skill-dir}`.
3. Dispare **um** subagent `general` em foreground. Não use `model` override.
4. Ao concluir, verifique se `audit.md` e `audit.json` existem e se o relatório
   trouxe contagens. Se o agente não rodou o script, rode você mesmo antes de
   seguir.
5. Atualize `run.md` com o `sessionID`, contagens e status.

Se o escopo tiver mais de 8 slices ou o usuário pedir paralelismo, rode um
subagent de auditoria por grupo de slices (mesmo prompt, `{scope}` específico) e
consolide você mesmo em `audit.md`. A consolidação é do orquestrador, não de um
subagent que não viu os outros relatórios.

Se a auditoria não encontrar nenhuma violação `blocker`/`major`, apresente o
resultado, encerre sem branch/PR e não invente trabalho.

### Fase 2 — Plano (subagent `general`, somente leitura)

1. Preencha o prompt da "Fase 2" com `{audit-path}`, `{audit-json}`,
   `{plan-path}` e o escopo.
2. Dispare um subagent `general`. Ele escreve apenas o plano.
3. Valide o plano contra `references/artifacts.md`:
   - todo `blocker`/`major` confirmado está coberto ou justificado;
   - cada WU tem teste primeiro, arquivos, risco, rollback e critério de done;
   - nenhum WU mistura refatoração com mudança de comportamento;
   - a ordem respeita dependências;
   - há decisão sobre ADR (criar ou referenciar).
4. Apresente ao usuário, em uma única tabela:

   | WU  | Slice | Achados | Ação | Risco | Commit |
   | --- | ----- | ------- | ---- | ----- | ------ |

   Inclua contagens da auditoria, o que ficou fora do escopo, o ADR e os gates.

5. Peça aprovação explícita. Com `--yes`, prossiga apenas se não houver pergunta
   em aberto. Em `--dry-run`, pare aqui.

### Fase 3 — Execução (subagent `general`)

Somente após aprovação:

1. Se a branch atual for `main` ou não for a branch de trabalho, crie-a a partir
   do HEAD atual: `git switch -c "{branch}"`. Se `{branch}` já existir, pare e
   pergunte.
2. Preencha o prompt da "Fase 3" com `{branch}`, `{plan-path}`, `{audit-path}`,
   `{execution-path}`, `{baseline-path}` e `{skill-dir}`.
3. Dispare um subagent `general` em foreground e guarde o `sessionID`.
4. Ao concluir, leia `execution.md` e o relatório. Se `blocked`/`failed`, não
   siga para os gates: apresente o bloqueio e as opções.
5. Atualize `run.md` e o status do plano para `executing`.

O executor commita por WU. A publicação fica para a fase 5.

### Fase 4 — Gates (subagent `general`)

1. Preencha o prompt da "Fase 4" com `{qa-path}`, `{plan-path}`,
   `{execution-path}`, `{baseline-path}` e `{base}`.
2. Dispare um subagent `general`. Ele não corrige código; ele reporta.
3. Leia `qa.md`. Resultado:
   - `green`: siga para a fase 5.
   - `green (com pre-existing)`: falha antiga do baseline, fora do diff; siga e
     declare no PR.
   - `red`: retome a sessão da fase 3 (`{execution-session}`) com o trecho real
     do erro e peça correção. Rode os gates de novo. Máximo
     `--max-fix-loops` ciclos; depois escale ao usuário.
   - `blocked (infra)`: siga para commit/push/PR somente se o bloqueio for
     exclusivamente E2E/infraestrutura e o restante estiver verde. Registre
     `deferred (infra)` no PR. Nunca mascare como `pass`.

### Fase 5 — Commit e push (subagent `general`)

1. Preencha o prompt da "Fase 5" com `{branch}`, `{base}`, `{plan-path}` e
   `{qa-path}`.
2. Dispare um subagent `general`. Ele segue
   `.opencode/commands/commit-and-push.md`, commita o que faltar (plano,
   checkboxes) e faz push.
3. Se a branch for `main`, pare. Se não houver remote, pare e informe.
4. Nunca use `--force`, `--force-with-lease`, `--no-verify` ou `reset --hard`.
5. Atualize `run.md` com commits e push.

### Fase 6 — Pull request (subagent `general`)

1. Preencha o prompt da "Fase 6" com `{branch}`, `{base}`, `{plan-path}`,
   `{audit-path}`, `{qa-path}` e `{pr-path}`.
2. Dispare um subagent `general`. Ele monta `pr.md` e tenta `gh pr create`.
3. Sem `gh` ou sem autenticação, ele usa a URL `compare` do GitHub e deixa o
   corpo pronto em `pr.md`. Isso é entrega válida; não instale ferramenta sem
   pedir.
4. Com `--no-pr`, pare depois do push e informe a URL de comparação.
5. Nunca faça merge da branch no `main` sem pedido explícito.

### Encerramento

Apresente o relatório de entrega de `.docs/RULES.md`:

| Item                   | Conteúdo                                                    |
| ---------------------- | ----------------------------------------------------------- |
| Resumo                 | Slices auditadas, violações corrigidas, o que ficou de fora |
| Decisões arquiteturais | ADR criado/referenciado e consequências                     |
| Arquivos modificados   | Lista completa (criados, alterados, removidos)              |
| Bibliotecas            | Instaladas, versão e justificativa (normalmente "n/a")      |
| Racionais              | Por que cada correção foi feita e alternativas descartadas  |
| QA manual              | Passos humanos que os gates não cobrem                      |
| Verificação            | Resultado real de cada comando de `.docs/QA.md`             |
| Publicação             | Branch, commits, push, URL do PR ou fallback                |

## Tratamento de falhas

| Situação                               | Ação                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------- |
| Working tree sujo                      | Pare; peça commit/stash. Nunca descarte trabalho alheio.                              |
| Auditoria sem violação                 | Encerre com o relatório; não crie branch vazia.                                       |
| Agente de auditoria não gerou artefato | Rode o script no orquestrador, confira e repita a fase com a sessão retomada.         |
| Plano cobre só parte dos achados       | Retome a sessão do plano com a lista faltante; máximo 2 tentativas.                   |
| Usuário rejeita o plano                | Ajuste com a sessão do plano ou pare; não execute.                                    |
| QA vermelho                            | Retome a execução com o erro real; máximo `--max-fix-loops`; depois escale.           |
| QA vermelho por infra                  | Registre `blocked (infra)`; siga só se o restante estiver verde.                      |
| Gate já vermelho no baseline           | Registre `pre-existing`; só bloqueie por regressão nova. Não conserte o repositório.  |
| `npm`/`npx` bloqueado no shell         | Use `cmd /c "npm ..."` ou `node node_modules/...`; registre no QA.                    |
| Branch já existe                       | Pare e pergunte; nunca delete ou sobrescreva branch do usuário.                       |
| Push falha                             | Mostre o erro real e o próximo passo; não resuma como "falhou".                       |
| `gh` ausente/sem auth                  | Use a URL `compare` + `pr.md`; não instale nem autentique sem permissão.              |
| Correção exige mudança de contrato     | Pare, atualize o plano (novo WU) e peça aprovação. Não amplie escopo silenciosamente. |
| Conflito com trabalho do usuário       | Pare e mostre o conflito; nunca `reset --hard`, `checkout --` ou stash automático.    |

## Regras não negociáveis

- **Auditoria antes do plano; plano aprovado antes do código.** Sem exceção, salvo
  `--yes` explícito e ausência de pergunta aberta.
- **Uma fase, um subagent, um artefato.** O orquestrador não implementa; ele
  valida, aprova, retoma e integra.
- **Nenhuma mudança de comportamento.** A refatoração preserva rotas, status,
  corpos de erro e regras. Mudança de contrato vira WU separado e aprovado.
- **Um endpoint, um handler, um use case.** Handler injeta exatamente um
  `*UseCase` e nada mais.
- **Dependências apontam para dentro.** Corrija invertendo com porta + adapter,
  não movendo regra para a camada errada.
- **Cada WU termina verde e commitado**, em Conventional Commits, com a última
  linha `Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>`.
- **Gate só é verde se foi executado.** `deferred` e `blocked` são resultados
  válidos; mentira não é.
- **Gate se compara ao baseline.** Falha pré-existente e fora do diff é
  `pre-existing`, não regressão; falha nova ou em arquivo do diff é `fail`.
- **Nada de segredo no diff.** Nunca leia, imprima ou commite `.env` e chaves.
- **Nunca** `--force`, `--force-with-lease`, `--no-verify`, `reset --hard`,
  `stash` automático, merge na `main` ou push na `main`.
- **Toda decisão arquitetural gera ADR** em `.adrs/`, numerado sequencialmente e
  com status `proposed` até aprovação humana.
- **`minor` só entra com `--severity=all`.** `info` nunca vira trabalho.
- **Mantenha o usuário informado**: contagens da auditoria, plano, uma linha por
  WU concluído, resultado dos gates e publicação.

## Exemplo

`refactor-vertical-slices --scope=apps/api/src/modules --base=main`

1. Pré-voo: branch limpa, remote ok, `.refactor/` ignorado.
2. Auditoria: 3 slices, 3 bloqueadores (auth-session sem use case, ping com
   métrica no handler), 9 majoritários (handlers com nome legado).
3. Plano: WU-01 cria `GetAuthSessionUseCase` + teste; WU-02 move métrica do ping
   para o use case; WU-03 renomeia handlers/classe/testes; WU-04 wiring; WU-05
   ADR do request handler pattern.
4. Usuário aprova. Executor implementa WU a WU, TDD, commits locais.
5. Gates: `format:check`, `lint`, `check-types`, `test`, `build` verdes; E2E
   `deferred (infra)` se Supabase/Docker não estiverem de pé.
6. Push da branch e PR com a tabela antes/depois, QA real e riscos.
