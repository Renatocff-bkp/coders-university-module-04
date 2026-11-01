# Agente de segurança de dependências no ciclo de vida

## Metadado

| Campo         | Valor      |
| ------------- | ---------- |
| Status        | `approved` |
| Prioridade    | `high`     |
| Criado em     | 2026-11-01 |
| Atualizado em | 2026-11-01 |
| Responsável   | Renato     |

## Resumo

Incluir a auditoria de dependências (skill `check-security-dependencys`) como gate obrigatório antes de abrir qualquer PR de feature, com registro detalhado de cada vulnerabilidade corrigida no commit e na descrição do PR.

## Contexto

A skill `check-security-dependencys` existe em `.agents/skills/`, mas não faz parte do fluxo de entrega. Hoje nada obriga a rodar `npm audit` antes de um PR, e o `/commit-and-push` faz um único commit com `git add -A` sem nenhum passo de segurança. Resultado: vulnerabilidades em dependências podem entrar na `main` sem rastro.

O objetivo é que toda feature passe por um agente dedicado que:

1. audita o monorepo;
2. corrige o que for possível com versão exata;
3. registra, no histórico git e no PR, qual era a vulnerabilidade, em qual lib, em qual versão, e para qual versão foi corrigida (ou o que foi feito).

Referências de regra: `.docs/RULES.md` (um commit por mudança lógica; PRs referenciam a spec) e `.docs/AGENTS.md` (skills de workflow e comandos do projeto).

## Escopo

### Dentro do escopo

- Novo subagent `security-deps-auditor` em `.opencode/agents/`, que executa a skill `check-security-dependencys` e devolve um relatório estruturado.
- Novo comando `/open-pr` em `.opencode/commands/`, que orquestra: auditoria → correção → commit → gates → abertura do PR.
- Ajuste no `/commit-and-push` para suportar dois commits na mesma branch: `fix(deps)` (correção de dependência) e `feat`/`fix`/etc. (a feature), sem `git add -A` cego sobre mudanças de dependência.
- Padrão de mensagem de commit `fix(deps)` com dados da vulnerabilidade.
- Seção de segurança obrigatória na descrição do PR.
- Atualização de `.docs/AGENTS.md` e `.docs/RULES.md` para incluir o novo passo no fluxo.

### Fora do escopo

- Execução automática em CI/GitHub Actions (fica para spec futura).
- Auditoria de código, segredos ou arquitetura (é o `cto-auditor`).
- Bump de versão sem advisory associado.
- Alterar a skill `check-security-dependencys` em si (ela é consumida como está).
- Correção automática de vulnerabilidades que exijam mudança de código de aplicação; nesses casos o agente bloqueia e reporta.

## Requisitos funcionais

| ID    | Requisito                     | Descrição                                                                                                                                                                                                                                                                                                   |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Subagent de segurança         | Criar `.opencode/agents/security-deps-auditor.md` que carrega a skill `check-security-dependencys`, executa as fases 1 a 6 e retorna: lista de achados (lib, severidade, advisory/URL, versão vulnerável), correções aplicadas (versão anterior → versão nova), achados sem correção e resultado dos gates. |
| RF-02 | Gate antes do PR              | O `/open-pr` executa o subagent antes de qualquer `gh pr create`. Sem a saída do subagent, o PR não é aberto.                                                                                                                                                                                               |
| RF-03 | Commit de correção separado   | Quando houver correção de dependência, criar commit `fix(deps): ...` próprio, contendo apenas `package.json`, `package-lock.json` e afins. Nunca misturar com arquivos da feature.                                                                                                                          |
| RF-04 | Detalhe no commit `fix(deps)` | Corpo do commit lista, para cada lib corrigida: nome, severidade, advisory (GHSA/CVE e URL), versão vulnerável → versão corrigida, workspace afetado e o tipo de dependência (`dependencies`/`devDependencies`).                                                                                            |
| RF-05 | Resumo no commit da feature   | O corpo do commit da feature inclui uma seção `Security:` com a lista resumida (lib, versão anterior → nova, advisory) e o hash do commit `fix(deps)`. Se não houver achados, a seção diz `Security: npm audit sem achados em <data>`.                                                                      |
| RF-06 | Seção de segurança no PR      | A descrição do PR tem a seção `## Segurança de dependências` com tabela: lib, severidade, advisory, versão vulnerável, versão corrigida, ação tomada. Achados sem correção aparecem em lista separada com justificativa. Quando não há achados, a seção existe e diz isso explicitamente.                   |
| RF-07 | Política de bloqueio          | Achado `critical` ou `high` sem correção aplicada e validada interrompe o `/open-pr`. Achados `moderate` e `low` sem correção não bloqueiam, mas entram na seção de pendências do PR.                                                                                                                       |
| RF-08 | Gates completos               | Após qualquer correção, o subagent roda `npm run format:check`, `lint`, `check-types`, `test` e `build` sobre o monorepo inteiro, conforme `.docs/QA.md`. Qualquer falha nova bloqueia o PR.                                                                                                                |
| RF-09 | Sem atalhos                   | O agente nunca usa `npm audit fix --force` sem justificativa registrada, nunca usa `--no-verify`, nunca introduz `^`/`~` em correção de segurança e nunca adiciona `overrides` sem registro.                                                                                                                |
| RF-10 | Artefatos locais              | Os arquivos de execução (`audit.json`, `inventory.json`, `security-audit.md`) ficam em `.security-deps/{run-id}/`, já ignorado pelo `.gitignore`. Apenas o resumo vai para o commit e o PR.                                                                                                                 |
| RF-11 | Working tree limpo            | O `/open-pr` para se houver mudanças não relacionadas no working tree antes da auditoria, para não misturar trabalho alheio na correção de dependência.                                                                                                                                                     |

## Requisitos não-funcionais

| ID     | Requisito              | Descrição                                                                                                                                                        |
| ------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Rastreabilidade        | Toda correção de segurança deve ser reconstituível a partir do histórico git: `git log --grep=fix(deps)` mostra lib, versões e advisory sem abrir outro arquivo. |
| RNF-02 | Compatibilidade        | Funciona em Windows com `cmd /c "npm ..."`, conforme a skill. Node.js >= 24 e npm 11.                                                                            |
| RNF-03 | Segurança do relatório | Nenhum segredo, token ou valor de `.env` aparece em commit, PR ou relatório. Valores de configuração são mascarados.                                             |
| RNF-04 | Idioma                 | Mensagens de commit e PR em pt-BR para o texto do corpo, e nomes de comandos/arquivos em en-US, conforme `.docs/DEVELOPMENT.md` (specs e documentação em pt-BR). |

## Critérios de aceite

- [ ] `.opencode/agents/security-deps-auditor.md` existe e referencia a skill `check-security-dependencys`.
- [ ] `.opencode/commands/open-pr.md` existe e não chama `gh pr create` antes do subagent retornar resultado.
- [ ] Com um achado simulado (lib com versão vulnerável conhecida), o `/open-pr` gera commit `fix(deps)` com lib, advisory, versão anterior e nova no corpo.
- [ ] O commit da feature contém a seção `Security:` com o hash do commit `fix(deps)`.
- [ ] A descrição do PR contém a seção `## Segurança de dependências` com a tabela preenchida.
- [ ] Com `critical` sem correção, o `/open-pr` para e não abre o PR.
- [ ] Com `moderate` sem correção, o PR é aberto e a pendência aparece na descrição.
- [ ] Sem achados, o commit e o PR dizem explicitamente que o `npm audit` não encontrou vulnerabilidades.
- [ ] `npm run format:check`, `lint`, `check-types`, `test` e `build` passam após a implementação.
- [ ] `.docs/AGENTS.md` e `.docs/RULES.md` refletem o novo passo.
- [ ] Um ADR em `.adrs/` registra a decisão de tornar a auditoria um gate obrigatório antes do PR.

## Impacto técnico

### Arquivos afetados

| Arquivo                                     | Ação     | Descrição                                                                                         |
| ------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `.opencode/agents/security-deps-auditor.md` | `create` | Subagent que executa a skill e devolve relatório estruturado                                      |
| `.opencode/commands/open-pr.md`             | `create` | Orquestra auditoria, commit `fix(deps)`, commit da feature, gates e `gh pr create`                |
| `.opencode/commands/commit-and-push.md`     | `modify` | Suporta a divisão em commit `fix(deps)` + commit da feature e aceita o bloco `Security:` no corpo |
| `.docs/AGENTS.md`                           | `modify` | Inclui `/open-pr` na tabela de comandos e `security-deps-auditor` na lista de agentes             |
| `.docs/RULES.md`                            | `modify` | Inclui o passo de auditoria antes do PR no fluxo de trabalho e o formato de commit `fix(deps)`    |
| `.adrs/NNNN-gate-seguranca-dependencias.md` | `create` | ADR da decisão de gate obrigatório antes de PR                                                    |

### Dependências

- Skill `check-security-dependencys` em `.agents/skills/` (já existe).
- `gh` (GitHub CLI) autenticado, para `gh pr create`.
- Acesso de rede ao registry do npm e ao GitHub Advisory Database durante a auditoria.
- Commitlint e husky já existentes (validam o `fix(deps)`).

### Componentes de UI

n/a: a mudança é de tooling e documentação; não há componente de interface.

## Plano de implementação

### Etapa 1: Subagent de segurança

Criar `.opencode/agents/security-deps-auditor.md` seguindo o formato de `code-reviewer.md` e `cto-auditor.md`. Carrega a skill `check-security-dependencys` e define o formato de saída (achados, correções, pendências, gates).

### Etapa 2: Ajuste do commit-and-push

Alterar `.opencode/commands/commit-and-push.md` para aceitar a separação em dois commits quando o subagent reportar correção de dependência. Remover a dependência de `git add -A` para mudanças de `package.json`/`package-lock.json` que não pertençam à feature.

### Etapa 3: Comando /open-pr

Criar `.opencode/commands/open-pr.md`:

1. Pré-voo: working tree sem mudanças estranhas (RF-11).
2. Chama o `security-deps-auditor`.
3. Se houver correção: commit `fix(deps)` com corpo detalhado (RF-04).
4. Commit da feature com bloco `Security:` (RF-05).
5. Gates (RF-08). Bloqueio conforme RF-07.
6. `git push -u origin HEAD` e `gh pr create` com a seção de RF-06.

### Etapa 4: Documentação

Atualizar `.docs/AGENTS.md` e `.docs/RULES.md` com o novo comando e o passo de segurança. Criar o ADR.

### Etapa 5: Validação

Simular em branch de teste com uma dependência propositalmente desatualizada conhecida e confirmar: commit `fix(deps)`, bloco `Security:`, seção do PR e o bloqueio em `critical`.

```bash
cmd /c "npm audit"
cmd /c "npm run format:check"
cmd /c "npm run lint"
cmd /c "npm run check-types"
cmd /c "npm run test"
cmd /c "npm run build"
```

## Riscos e ressalvas

| Risco                                                                  | Probabilidade | Impacto  | Mitigação                                                                                                        |
| ---------------------------------------------------------------------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm audit` falha por falta de rede ou indisponibilidade do registry   | `medium`      | `high`   | Bloquear o PR e registrar o erro real; nunca declarar "sem achados" sem a varredura ter rodado                   |
| Correção de dependência quebra build ou testes                         | `medium`      | `high`   | Gates completos (RF-08) antes do commit; regressão bloqueia o PR                                                 |
| Commit `fix(deps)` mistura alterações não relacionadas do working tree | `medium`      | `medium` | RF-11 e staging explícito de apenas os arquivos de lockfile/manifest                                             |
| Feature commit referencia hash de commit que ainda não existe          | `low`         | `medium` | Ordem fixa: `fix(deps)` primeiro, feature depois, e o hash é lido com `git rev-parse` antes do commit da feature |
| Subagent dá resultado vago ("auditoria ok") sem dados                  | `medium`      | `medium` | Formato de saída obrigatório em RF-01; `/open-pr` rejeita saída sem a tabela de achados                          |
| Vulnerabilidade sem correção conhecida bloqueia entregas urgentes      | `medium`      | `medium` | Política de RF-07 bloqueia apenas `critical`/`high`; demais viram pendência documentada                          |
| Documentação diverge do comportamento real do comando                  | `low`         | `medium` | Regra de divergência de `.docs/RULES.md`: a divergência é bug; validação na Etapa 5                              |

## Referências

- [`.agents/skills/check-security-dependencys/SKILL.md`](../.agents/skills/check-security-dependencys/SKILL.md)
- [`.docs/AGENTS.md`](../.docs/AGENTS.md)
- [`.docs/RULES.md`](../.docs/RULES.md)
- [`.docs/QA.md`](../.docs/QA.md)
- [`.opencode/commands/commit-and-push.md`](../.opencode/commands/commit-and-push.md)
- [`.specs/011-cto-structural-audit.md`](./011-cto-structural-audit.md) (modelo de agente auditor já existente)
