# Plano — 013 Agente de segurança de dependências no ciclo de vida

- Spec: [`.specs/013-security-deps-agent.md`](../../.specs/013-security-deps-agent.md)
- Branch: `feat/013-security-deps-agent`
- Data: 2026-11-01

## Diagnóstico do estado atual

| Item                                                                                     | Estado                                                                                            | Ação                                                                               |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `.agents/skills/check-security-dependencys/`                                             | Existe, não rastreada                                                                             | Commitar junto (é a skill consumida pelo agente)                                   |
| `.opencode/agents/`                                                                      | Tem `code-reviewer.md` e `cto-auditor.md` (formato: frontmatter `mode: subagent` + `permissions`) | Criar `security-deps-auditor.md` no mesmo formato                                  |
| `.opencode/commands/commit-and-push.md`                                                  | `git add -A` e um commit único                                                                    | Ajustar para commit `fix(deps)` separado e staging explícito                       |
| `.opencode/commands/`                                                                    | Não há comando de abertura de PR                                                                  | Criar `open-pr.md`                                                                 |
| `.docs/AGENTS.md`                                                                        | Já tem a linha de `check-security-dependencys` (alteração não commitada)                          | Manter e acrescentar `/open-pr`                                                    |
| `.gitignore`                                                                             | Já tem `.security-deps/` (alteração não commitada)                                                | Manter (é desta feature)                                                           |
| `.docs/RULES.md`                                                                         | Fluxo sem passo de segurança                                                                      | Acrescentar passo e formato `fix(deps)`                                            |
| `.adrs/`                                                                                 | Último ADR é `0016`                                                                               | Criar `0017-gate-de-seguranca-de-dependencias-antes-do-pr.md` e atualizar o índice |
| `package-lock.json`, `apps/docs/package.json`                                            | Alterados por trabalho anterior, fora desta feature                                               | **Não commitar** nesta entrega; ver Riscos                                         |
| `audit-security-eval.json`, `check-security-dependencys-workspace/`, `scripts/tmp-*.cjs` | Artefatos de eval/temporários                                                                     | **Não commitar**                                                                   |

Remote: `origin` existe. A URL atual contém credencial embutida (ver Riscos).

## Decisões de implementação

1. **Testes (TDD):** os entregáveis são prompts de agente/comando em Markdown e docs; não há código de aplicação para teste unitário. A verificação é (a) checagem estrutural dos arquivos (frontmatter, campos obrigatórios da spec) e (b) execução real da auditoria em modo somente leitura (`npm audit --json`) para validar o parsing que o agente faz. O cenário de dependência vulnerável simulada (Etapa 5 da spec) fica como QA manual, por alterar lockfile.
2. **Staging explícito:** o `commit-and-push` atual usa `git add -A`, que arrastaria o trabalho alheio. A nova regra adiciona staging por lista de caminhos quando há mudança de dependência fora da feature.
3. **Branch:** criar `feat/013-security-deps-agent` (RULES.md). Não publicar em `main`.
4. **Abertura de PR:** o `/open-pr` é o comando que abre o PR. Nesta execução ele não é rodado sobre a própria 013, porque a árvore tem `package-lock.json` alterado de fora (RF-11 bloqueia). Isso fica registrado como pendência.

## Etapas

### Etapa 1 — Subagent `security-deps-auditor`

- Criar `.opencode/agents/security-deps-auditor.md`.
- Entradas: `fix` (bool, default `true`), `run-id`.
- Saída: bloco JSON com `findings`, `fixes`, `unfixed`, `gates`, `blocking`, e caminho do `security-audit.md`.
- Proibições: `npm audit fix --force` cego, `--no-verify`, `^`/`~`, `overrides` sem justificativa.

### Etapa 2 — Comando `/open-pr`

- Criar `.opencode/commands/open-pr.md`: pré-voo (RF-11) → subagent (RF-02) → commit `fix(deps)` (RF-03/04) → commit da feature com bloco `Security:` (RF-05) → gates (RF-08) → push → `gh pr create` com seção de segurança (RF-06) → bloqueio (RF-07).

### Etapa 3 — Ajuste em `commit-and-push`

- Acrescentar seção sobre commit `fix(deps)` separado, staging por caminhos e bloco `Security:` no corpo.

### Etapa 4 — Documentação

- `.docs/AGENTS.md`: linha do `/open-pr` na tabela de comandos.
- `.docs/RULES.md`: passo de auditoria no fluxo e formato de commit `fix(deps)`.
- ADR `0017` e índice em `.adrs/README.md`.

### Etapa 5 — Verificação

1. Checagem estrutural dos novos arquivos.
2. `cmd /c "npm audit --json"` em modo leitura, gravando em `.security-deps/<run-id>/` para validar o parsing.
3. Gates de `.docs/QA.md`: `format:check`, `lint`, `check-types`, `test`, `build`. Falhas pré-existentes ficam registradas como `pre-existing`.

### Etapa 6 — Publicação

- Commit `docs(tooling)`/`feat(tooling)` da feature, com apenas os arquivos desta spec.
- Push da branch `feat/013-security-deps-agent`.

## Riscos

| Risco                                                            | Mitigação                                                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Credencial do GitHub embutida na URL do remote (`git remote -v`) | Não copiar a URL para commit, PR ou relatório. Recomendar rotação e troca para `credential helper`/`gh auth`. |
| `package-lock.json` alterado de fora entra no commit             | Staging por caminhos; não commitar esse arquivo nesta entrega.                                                |
| `npm`/`npx` bloqueados no PowerShell                             | Usar `cmd /c "npm ..."` conforme a skill.                                                                     |
| Gates com falha pré-existente                                    | Comparar com baseline; marcar `pre-existing` e não atribuir à 013.                                            |
| `gh` ausente ou sem autenticação                                 | `/open-pr` para e informa; não tenta abrir PR.                                                                |
