# Artefatos — plano de refatoração e corpo do PR

## 1. Plano de execução

Salve em `.docs/plans/{run-id}-refactor-vertical-slices-plan.md`. O plano é
versionado e vai no PR; `audit.json`, `execution.md` e `qa.md` ficam em
`.refactor/{run-id}/` (ignorado pelo git).

```markdown
# Refatoração de vertical slices — {run-id}

## Metadado

| Campo      | Valor                                          |
| ---------- | ---------------------------------------------- |
| Status     | `proposed` / `approved` / `executing` / `done` |
| Criado em  | YYYY-MM-DD                                     |
| Branch     | `refactor/vertical-slices-{timestamp}`         |
| Base do PR | `main`                                         |
| Escopo     | `{scope}`                                      |
| Slices     | `auth`, `ping`, ...                            |
| Severidade | `blocker+major` / `all`                        |
| Auditoria  | `.refactor/{run-id}/audit.md`                  |
| ADR        | `NNNN-slug` ou "n/a"                           |

## Resumo da auditoria

| Slice | Bloqueadores | Majoritários | Menores | Info |
| ----- | ------------ | ------------ | ------- | ---- |
| ...   | ...          | ...          | ...     | ...  |

Total de achados confirmados: N. Falsos positivos registrados: N.

## Objetivo

[2–3 frases: qual contrato arquitetural passa a valer e por quê.]

## Fora do escopo

- [Ex.: mudança de comportamento de negócio, migração de banco, renomear
  adapters por preferência, refatorar slices fora do escopo.]
- [Ex.: corrigir achados `minor` sem `--include-minor`.]

## Decisões

| Decisão | Racional | Alternativa descartada |
| ------- | -------- | ---------------------- |
| ...     | ...      | ...                    |

Se a convenção de request handler/1:1 ainda não tiver ADR, o plano inclui a
criação do ADR no primeiro work unit de documentação.

## Work units

Cada work unit é uma mudança lógica, testável e commitável isoladamente. A ordem
abaixo é a ordem de execução.

### WU-01 — {título curto}

| Campo            | Valor                                                         |
| ---------------- | ------------------------------------------------------------- |
| Slice            | `{slice}`                                                     |
| Achados          | `{DEP-07, UC-01}`                                             |
| Severidade       | `blocker`                                                     |
| Arquivos         | `criar ...`, `alterar ...`, `remover ...`                     |
| Teste primeiro   | `{arquivo}.test.ts`: {comportamento que deve falhar antes}    |
| Ação             | {passos objetivos, em ordem}                                  |
| Fora de escopo   | {o que não deve ser tocado neste WU}                          |
| Risco            | baixo/médio/alto + motivo                                     |
| Rollback         | reverter os arquivos do WU / `git revert {hash}`              |
| Commit sugerido  | `refactor(api): ...`                                          |
| Critério de done | testes do WU verdes + tipo/lint do workspace + sem mudar HTTP |

[Repita para WU-02...]

## Ordem e dependências

- WU-XX depende de WU-YY porque ...
- Nenhum WU pode deixar a árvore vermelha; o commit acontece só com o alvo verde.

## Gates

| Ordem | Comando                | Quando                          |
| ----- | ---------------------- | ------------------------------- |
| 0     | baseline dos gates     | antes de qualquer edição        |
| 1     | `npm run format:check` | ao final de cada WU (rápido)    |
| 2     | `npm run lint`         | ao final de cada WU (workspace) |
| 3     | `npm run check-types`  | ao final de cada WU             |
| 4     | `npm run test`         | ao final de cada WU afetado     |
| 5     | `npm run build`        | antes do commit final           |
| 6     | `npm run test:e2e`     | se rota/contrato HTTP mudou     |

Se `npm`/`npx` estiverem bloqueados no shell, rode
`cmd /c "npm run <script>"` ou o binário de `node_modules`
(`node node_modules/turbo/bin/turbo run <task>`). O baseline fica em
`.refactor/{run-id}/baseline.md` e é a referência para separar `pre-existing` de
regressão.

## Aprovação

- [ ] Baseline dos gates registrado
- [ ] Auditoria revisada e falsos positivos registrados
- [ ] Plano aprovado pelo usuário
- [ ] Branch criada a partir de `{base}`
- [ ] ADR definido (criar ou referenciar)
- [ ] Working tree limpo

## Execução

| WU    | Status  | Commit | Testes | Observação |
| ----- | ------- | ------ | ------ | ---------- |
| WU-01 | pending | —      | —      | —          |

## Riscos residuais

- {ex.: contrato HTTP pode mudar se o mapeamento de erro for alterado}
- {ex.: cobertura de e2e indisponível por infra}
```

Regras do plano:

- Todo achado `blocker`/`major` confirmado precisa aparecer em algum WU ou ser
  explicitamente justificado como "não será corrigido nesta rodada".
- Nenhum WU pode misturar refatoração com mudança de comportamento. Se a
  correção exigir mudança de contrato HTTP, o WU é separado e destacado.
- O plano não promete o que o gate não consegue provar. Se E2E depende de
  infraestrutura indisponível, escreva `deferred (infra)`.

## 2. Corpo do PR

Salve em `.refactor/{run-id}/pr.md` e use com `gh pr create --body-file` ou com a
URL de comparação.

```markdown
# refactor(api): alinhar vertical slices ao padrão handler/use-case

## Resumo

[O que mudou e por quê, em 2–3 frases.]

## Motivação

A auditoria encontrou N violações (X bloqueadores, Y majoritários) em M slices.
As principais: [lista curta].

## O que mudou

| Slice | Antes | Depois |
| ----- | ----- | ------ |
| auth  | ...   | ...    |

## Contrato aplicado

- `domain` puro, portas e erros tipados.
- `application` com um use case por fluxo (`execute`).
- `infrastructure` como adapter de porta.
- `interface` com um request handler por endpoint, injetando exatamente um
  use case.
- Dependências apontam para dentro.

## Comportamento

- [ ] Nenhuma mudança de contrato HTTP (rotas, status, corpo de erro).
- [ ] Nenhuma migration/alteração de schema.
- [ ] Cobertura de domínio/application preservada ou ampliada.

Se algum item não se aplicar, explique.

## QA

| Verificação    | Resultado                   |
| -------------- | --------------------------- |
| `format:check` | pass/fail/pre-existing      |
| `lint`         | pass/fail/pre-existing      |
| `check-types`  | pass/fail/pre-existing      |
| `test`         | pass/fail/pre-existing      |
| `test:e2e`     | pass/fail/deferred (motivo) |
| `build`        | pass/fail/pre-existing      |

## ADR

[NNNN — título, ou "n/a".]

## Riscos

- ...

## Checklist

- [ ] Auditoria em `.refactor/{run-id}/audit.md`
- [ ] Plano em `.docs/plans/{run-id}-refactor-vertical-slices-plan.md`
- [ ] Sem segredos, `.env`, `node_modules` ou artefatos de build no diff
- [ ] Commits em Conventional Commits com trailer de coautoria
```
