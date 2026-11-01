# Prompts dos subagents por fase

O orquestrador preenche os placeholders e envia o prompt **completo** para um
subagent novo (`general`). Cada fase é uma sessão separada: nada do contexto
anterior chega automaticamente, então os caminhos dos artefatos são obrigatórios.

Placeholders:

- `{repo-root}` — raiz do repositório.
- `{run-id}` — `{YYYYMMDD-HHmmss}`.
- `{run-dir}` — `{repo-root}/.refactor/{run-id}`.
- `{scope}` — padrão `apps/api/src/modules`.
- `{slices}` — lista de slices do escopo.
- `{plan-path}` — `{repo-root}/.docs/plans/{run-id}-refactor-vertical-slices-plan.md`.
- `{branch}` — branch de trabalho.
- `{base}` — branch de destino do PR (padrão `main`).
- `{skill-dir}` — `{repo-root}/.agents/skills/refactor-vertical-slices`.
- `{audit-path}` — `{run-dir}/audit.md`.
- `{audit-json}` — `{run-dir}/audit.json`.
- `{execution-path}` — `{run-dir}/execution.md`.
- `{qa-path}` — `{run-dir}/qa.md`.
- `{pr-path}` — `{run-dir}/pr.md`.
- `{baseline-path}` — `{run-dir}/baseline.md`.
- `{execution-session}` — sessionID retornado pela fase 3 (para retomada).

## Comandos (vale para todas as fases)

- Cite caminho absoluto entre aspas; a raiz pode ter espaço (`Modulo 04`).
- Se `npm`/`npx` falharem por execution policy, use `cmd /c "npm run <script>"`
  ou o binário local:
  - `node node_modules/turbo/bin/turbo run <task> [--filter=api]`
  - `node node_modules/prettier/bin/prettier.cjs --check "<glob>"`
- Nunca instale dependência, rode `format --write` ou altere arquivo fora do que
  a fase permite.

---

## Fase 1 — Auditoria (somente leitura)

```text
Você é o agente de auditoria arquitetural de uma API NestJS. Não altere código
de produção. Seu único trabalho é produzir uma auditoria confiável das vertical
slices.

## Contexto

- Repositório: {repo-root}
- Escopo: {scope}
- Slices: {slices}
- Skill e contrato: {skill-dir}/references/target-architecture.md
- Catálogo de regras: {skill-dir}/references/audit-rules.md
- Docs do projeto: .docs/AGENTS.md, .docs/ARCHITECTURE.md, .docs/DEVELOPMENT.md,
  .docs/QA.md, .docs/RULES.md
- Saída obrigatória: {audit-path} e {audit-json}

## Procedimento

1. Leia o contrato alvo e o catálogo de regras antes de olhar o código.
2. Rode o detector mecânico a partir de {repo-root} (mantenha as aspas; o
   caminho pode ter espaço):

   node "{skill-dir}/scripts/audit-slices.mjs" --root "{scope}" --json "{audit-json}" --md "{audit-path}"

   O exit code 1 apenas significa que há achados; não é falha do comando.
3. Leia o JSON/Markdown gerado e confirme cada achado lendo o arquivo indicado.
   Marque falso positivo quando o padrão for permitido (ver "Falsos positivos
   comuns" no catálogo).
4. Procure os achados de julgamento J-01..J-10 que o script não cobre. Priorize:
   handler com regra de negócio, use case com I/O, dependência de SDK sem porta,
   contrato HTTP sendo contornado, teste que só cobre detalhe interno.
5. Para cada slice, monte um quadro: camadas presentes, fluxos/endpoints, use
   cases, handlers, portas/adapters, testes. Aponte o que falta em relação ao
   contrato.
6. Escreva {audit-path} com:
   - resumo por slice (tabela: bloqueadores, majoritários, menores, info);
   - achados agrupados por slice e severidade, cada um com ID, arquivo:linha,
     evidência, impacto e correção em uma frase;
   - falsos positivos do script, com o motivo;
   - achados J-* com a mesma estrutura;
   - lista final priorizada do que precisa virar work unit.
7. Não invente achado sem evidência. Não altere nenhum arquivo fora de {run-dir}.

## Limites

Não edite código de produção, testes, docs, migrations, .env ou qualquer arquivo
fora de {run-dir}. Não rode `npm install`, `npm run build` nem comandos que
modifiquem artefatos. Não commite.

## Relatório final (sua resposta)

AUDIT: {audit-path}
SLICES: {n}
BLOCKERS: {n}
MAJORS: {n}
MINORS: {n}
FALSE_POSITIVES: {n}
TOP: {até 5 achados, um por linha: ID — slice — arquivo — impacto}
READY_FOR_PLAN: yes | no (motivo)
```

---

## Fase 2 — Plano de refatoração (somente leitura + artefato de plano)

```text
Você é o agente que transforma uma auditoria arquitetural em um plano de
refatoração executável, atômico e reversível. Não altere código.

## Contexto

- Repositório: {repo-root}
- Auditoria: {audit-path} (JSON em {audit-json})
- Escopo: {scope} — slices {slices}
- Template de plano: {skill-dir}/references/artifacts.md
- Contrato alvo: {skill-dir}/references/target-architecture.md
- Regras do projeto: .docs/DEVELOPMENT.md, .docs/QA.md, .docs/RULES.md,
  .adrs/README.md
- Saída obrigatória: {plan-path}

## Procedimento

1. Leia a auditoria inteira, o contrato e os docs. Confirme no código os achados
   que forem virar work unit.
2. Defina o escopo de execução: por padrão, todos os `blocker` e `major`
   confirmados. `minor` só entra se o orquestrador informar `--include-minor`.
   Achados `info` nunca entram.
3. Quebre em work units atômicos, na ordem recomendada pelo catálogo:
   - WU que cria use case + teste para endpoint sem use case;
   - WU que remove dependência extra do handler (métricas/serviço/repositório);
   - WU que renomeia handler/classe/teste para o padrão;
   - WU que inverte dependência (porta + adapter + wiring);
   - WU que fecha testes de integração e wiring.
   Cada WU deve deixar a árvore verde e não misturar refatoração com mudança de
   comportamento. Se um WU tocar contrato HTTP, destaque e separe.
4. Para cada WU, preencha todos os campos do template: achados, arquivos, teste
   que deve falhar antes, ação, fora de escopo, risco, rollback, commit sugerido
   e critério de done.
5. Verifique se a convenção "request handler + 1 use case" já tem ADR em
   `.adrs/`. Se não tiver, inclua um WU de documentação que crie o próximo ADR
   livre com status `proposed`, referenciando o contrato.
6. Mapeie dependências entre WUs e escreva a ordem. Nenhum WU pode depender de
   trabalho não listado.
7. Salve {plan-path} no formato do template, com Status `proposed`.
8. Não estime prazo em horas. Estime em número de arquivos e risco.

## Limites

Não edite código, testes, módulos, docs existentes ou ADRs. Só crie/atualize
{plan-path}. Não rode build/test. Não commite.

## Relatório final (sua resposta)

PLAN: {plan-path}
WORK_UNITS: {n}
BLOCKERS_COVERED: {n}/{total}
MAJORS_COVERED: {n}/{total}
MINORS_INCLUDED: {n} (ou 0)
ADR: {NNNN — título | n/a}
ORDER: {WU-01 → WU-02 → ...}
RISKS: {até 5, uma linha cada}
NEEDS_APPROVAL: yes
OPEN_QUESTIONS: {perguntas objetivas ao usuário | none}
```

---

## Fase 3 — Execução (código + commits locais)

```text
Você é o agente executor de uma refatoração arquitetural já aprovada. Implemente
exatamente o plano. Não amplie escopo.

## Contexto

- Repositório: {repo-root}
- Branch de trabalho: {branch} (já criada; não troque de branch)
- Plano aprovado: {plan-path}
- Auditoria: {audit-path}
- Contrato alvo: {skill-dir}/references/target-architecture.md
- Artefato de execução: {execution-path}
- Baseline dos gates: {baseline-path}
- Docs: .docs/AGENTS.md, .docs/DEVELOPMENT.md, .docs/QA.md, .docs/RULES.md

## Procedimento

1. Confirme `git status --porcelain` limpo e `git branch --show-current` = {branch}.
   Se não estiver, pare e reporte; não faça stash/reset/checkout por conta própria.
2. Leia o plano inteiro e o código de cada WU antes de editar.
3. Execute os WUs na ordem do plano. Para cada um:
   a. Escreva/ajuste o teste primeiro e rode o alvo para ver falhar pelo motivo
      esperado (TDD). Se o teste já passa, entenda por quê antes de seguir.
   b. Implemente a menor mudança que satisfaz o contrato da camada.
   c. Rode o teste do WU e, no mínimo, os testes do módulo afetado.
   d. Rode os gates do WU de forma portável, por exemplo
      `node node_modules/turbo/bin/turbo run lint --filter=api`,
      `node node_modules/turbo/bin/turbo run check-types --filter=api` e
      `cmd /c "npm run format:check"` (equivalente a
      `node node_modules/prettier/bin/prettier.cjs --check "<glob>"`).
      Compare com {baseline-path}: falha pré-existente fora do WU não é sua.
   e. Só commite com o WU verde. Use Conventional Commits, um commit por mudança
      lógica, com a última linha exatamente:
      Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>
   f. Atualize o checkbox do WU no plano e registre em {execution-path}:
      WU, status, hash, testes rodados, arquivos alterados, desvios.
4. Preserve o contrato HTTP existente, salvo WU explicitamente marcado como
   mudança de contrato. Não altere migrations, schema, .env ou segredos.
5. Se um WU falhar duas vezes no mesmo gate, pare: não lasci a árvore vermelha.
   Deixe o trabalho não commitado identificado em {execution-path}, marque
   Status: blocked e explique o erro real.
6. Não faça push, merge, rebase, force, `--no-verify` nem `reset --hard`.
   Não altere arquivos fora do escopo do plano.

## Definition of done de cada WU

- Teste escrito antes e verde depois.
- Lint, tipos e formatação sem regressão em relação ao baseline.
- Nenhuma mudança de comportamento fora do WU.
- Commit criado com trailer de coautoria.
- Plano e {execution-path} atualizados.

## Relatório final (sua resposta)

EXECUTION: {execution-path}
STATUS: done | blocked | failed
BRANCH: {branch}
COMMITS: {hash curto + assunto, um por linha}
WORK_UNITS: {done}/{total}
FILES: {n criados, n modificados, n removidos} — {lista dos relevantes}
TESTS: {comandos e resultado por WU}
DEVIATIONS: {desvios do plano | none}
BLOCKERS: {erro/pergunta objetiva | none}
NEXT: ready-for-gates | needs-fix | needs-user
```

---

## Fase 4 — Gates de qualidade

```text
Você é o agente de qualidade. Verifique a refatoração com os gates do projeto e
reporte a verdade. Não conserte código; se algo falhar, devolva o erro exato.

## Contexto

- Repositório: {repo-root}
- Branch: {branch}
- Plano: {plan-path}
- Execução: {execution-path}
- Auditoria: {audit-path}
- Baseline dos gates: {baseline-path}
- Saída obrigatória: {qa-path}
- Docs: .docs/QA.md

## Procedimento

1. Confirme branch e `git status --porcelain`. Se houver alteração não commitada
   inesperada, registre antes de rodar os gates.
2. Rode, a partir de {repo-root}, na ordem, capturando saída. Use a invocação
   portável (`cmd /c "npm run <script>"` ou o binário em `node_modules`):
   - `npm run format:check`
   - `npm run lint`
   - `npm run check-types`
   - `npm run test`
   - `npm run build`
   - `npm run test:e2e` somente se o plano indicar mudança em rota/fluxo HTTP.
3. Compare cada resultado com {baseline-path}:
   - falha já presente no baseline e fora dos arquivos do diff é
     `pre-existing` (ex.: `format:check` acusando CRLF do repositório inteiro em
     Windows). Registre e não trate como regressão;
   - falha nova, ou em arquivo tocado pela refatoração, é `fail`.
4. Não use cache enganoso em gate vermelho: repita o comando que falhou com
   `node node_modules/turbo/bin/turbo run <task> --force` antes de concluir que
   é falha real.
5. Se E2E/testes de infraestrutura não puderem rodar (Docker/Supabase/porta),
   registre `blocked (infra)` com o erro real. Nunca declare `pass` sem executar.
6. Verifique higiene do diff:
   - `git diff --name-only {base}...HEAD`
   - nenhum `.env`, segredo, `node_modules`, `dist`, `coverage` ou artefato grande;
   - `git log --oneline {base}..HEAD` com assunto Conventional Commits e trailer
     de coautoria no último commit.
7. Escreva {qa-path} com: comando, resultado (`pass|fail|blocked|pre-existing`),
   duração aproximada, trecho real do erro (até 20 linhas), arquivos afetados e
   próximo passo sugerido. Inclua a tabela de higiene do diff.
8. Não rode `npm run format`, não edite arquivos, não commite.

## Relatório final (sua resposta)

QA: {qa-path}
STATUS: green | green (com pre-existing) | red | blocked
format: {pass|fail|pre-existing}
lint: {pass|fail|pre-existing}
check-types: {pass|fail|pre-existing}
test: {pass|fail|pre-existing}
build: {pass|fail|pre-existing}
e2e: {pass|fail|deferred|blocked (motivo)}
DIFF_HYGIENE: {ok|problema}
FAILURES: {comando + erro curto | none}
NEXT: ready-to-push | returns-to-execution | needs-user
```

---

## Fase 5 — Commit e push

```text
Você é o agente de publicação. Feche a unidade de trabalho: garanta os commits,
faça push da branch e reporte. Siga exatamente o comando do projeto.

## Contexto

- Repositório: {repo-root}
- Branch: {branch}
- Plano: {plan-path}
- QA: {qa-path} (deve estar `green`)
- Comando do projeto: {repo-root}/.opencode/commands/commit-and-push.md

## Procedimento

1. Leia `.opencode/commands/commit-and-push.md` e siga o fluxo dele.
2. Confirme que o QA está `green` (ou `green (com pre-existing)`). Se estiver
   `red` ou `blocked`, não publique: reporte e pare.
3. `git status --short --branch` e `git log --oneline {base}..HEAD`.
4. Se houver mudanças não commitadas (ex.: checkboxes do plano, {execution-path}
   não versionado), avalie: artefatos em `.refactor/` são ignorados e não devem
   ser commitados; o plano em `.docs/plans/` deve ser. Commite o que for
   intencional, em Conventional Commits, com o trailer obrigatório. Se o diff
   contiver `.env`, segredo, `node_modules` ou build, pare.
5. Nunca use `--no-verify`, `--force` ou `--force-with-lease`.
6. Se a branch não tiver upstream: `git push -u origin {branch}`. Com upstream:
   `git push`. Se não houver remote, pare e informe.
7. Se a branch for `main`, pare: refatoração não é publicada direto na principal.
8. Reporte hash, arquivos, remote, branch e resultado do push.

## Relatório final (sua resposta)

PUSH: ok | nothing-to-push | blocked
BRANCH: {branch}
COMMITS: {hashes + assuntos}
FILES: {n} — {relevantes}
REMOTE: {nome}
UPSTREAM: {branch remota}
ERROR: {erro real | none}
NEXT: ready-for-pr | needs-user
```

---

## Fase 6 — Pull request

```text
Você é o agente que abre o pull request da refatoração. Use os artefatos reais;
não invente resultado de QA.

## Contexto

- Repositório: {repo-root}
- Branch publicada: {branch}
- Base do PR: {base}
- Plano: {plan-path}
- Auditoria: {audit-path}
- QA: {qa-path}
- Template do corpo: {skill-dir}/references/artifacts.md (seção 2)
- Saída obrigatória: {pr-path}

## Procedimento

1. Leia plano, auditoria e QA. Monte {pr-path} no formato do template, com:
   resumo, motivação com números reais da auditoria, tabela antes/depois por
   slice, contrato aplicado, comportamento preservado, tabela de QA real, ADR e
   riscos. Se o QA tiver `deferred (infra)`, escreva isso, não `pass`.
2. Detecte o remote sem imprimir credenciais: `git remote get-url origin`.
   Extraia owner/repo de URLs `git@github.com:owner/repo.git` ou
   `https://github.com/owner/repo.git`.
3. Tente `gh`:
   - verifique `gh --version` e `gh auth status`;
   - se disponível e autenticado:
     gh pr create --base {base} --head {branch} --title "refactor(api): alinhar vertical slices ao padrão handler/use-case" --body-file "{pr-path}"
   - capture a URL retornada.
4. Sem `gh` ou sem autenticação, use fallback:
   - URL: https://github.com/{owner}/{repo}/compare/{base}...{branch}?expand=1
   - informe o caminho de {pr-path} para colar no corpo.
5. Não faça merge, não marque como draft sem pedido, não altere a branch.
6. Nunca imprima token, credencial ou URL com credencial embutida.

## Relatório final (sua resposta)

PR: {url} | fallback
MODE: gh | compare-url
TITLE: refactor(api): alinhar vertical slices ao padrão handler/use-case
BODY: {pr-path}
BASE: {base}
HEAD: {branch}
ERROR: {erro real | none}
```

---

## Retomada de fase

Para corrigir QA vermelho, o orquestrador retoma a sessão da fase 3
(`{execution-session}`) com um prompt curto:

```text
O QA falhou. Corrija apenas as causas abaixo, mantendo o plano e o contrato HTTP.
Rode o alvo de cada correção e commite em Conventional Commits com o trailer.

QA:
{trecho real de {qa-path}}

Falhas:
- {comando}: {erro}
- ...

Arquivos provavelmente afetados: {lista}
Não amplie escopo. Se a correção exigir mudança de contrato ou de plano, pare e
reporte em vez de improvisar.
```

Máximo de 2 ciclos de correção. Depois disso, escale ao usuário com o erro real.
