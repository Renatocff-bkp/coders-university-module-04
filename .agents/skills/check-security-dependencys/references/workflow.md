# Fluxo detalhado — Check Security Dependencies

Referência de execução da skill. O `SKILL.md` é o contrato resumido; este
arquivo detalha cada fase.

## Fase 1 — Inventário e varredura

1. Criar run dir: `.security-deps/{run-id}/` (id `YYYYMMDD-HHMMSS`).
2. Inventário:

   ```bash
   node .agents/skills/check-security-dependencys/scripts/inventory-deps.mjs \
     --json "..security-deps/{run-id}/inventory.json" \
     --md   ".security-deps/{run-id}/inventory.md"
   ```

3. Varredura:

   ```bash
   cmd /c "npm audit --json" > ".security-deps/{run-id}/audit.json"
   cmd /c "npm audit"
   ```

4. Capturar `exit code` e resumo em `run.md`.

## Fase 2 — Triagem

Critérios de priorização:

| Severidade | Prioridade | Ação |
| ---------- | ---------- | ---- |
| critical   | 1          | Correção imediata, com validação obrigatória |
| high       | 2          | Correção no ciclo atual |
| moderate   | 3          | Correção no ciclo atual se não-breaking |
| low        | 4          | Correção se trivial; senão reportar |

Regras de classificação:

- `isDirect: true` → dep declarada no workspace → ação deliberada.
- `isDev: true` → devDep → reportar; corrigir se fix não-breaking disponível.
- `effects` → workspaces consumidores a validar após o fix.

## Fase 3 — Correção

Ordem de aplicação:

1. `cmd /c "npm audit fix"` → se limpar, encerrar ciclo aqui.
2. Caso restante: pesquisa de versão corretora via registry/advisory.
3. Bump de versão exata no `package.json` do workspace afetado.
4. `cmd /c "npm install"`.
5. Re-rodar `cmd /c "npm audit"` até limpar ou escalar.

Nunca: `npm audit fix --force` cego, overrides sem justificativa, downgrade.

## Fase 4 — QA gates

Sequência canônica do `.docs/QA.md`:

1. `npm run format:check`
2. `npm run lint`
3. `npm run check-types`
4. `npm run test`
5. `npm run build`

Comportamento em caso de falha:

- Falha pré-existente (no baseline) e fora do diff → `pre-existing`.
- Falha nova ou em arquivo tocado → regrediu; corrigir ou reverter.

## Fase 5 — Validação funcional

1. Mapear consumidores via `effects` + inventário.
2. Rodar testes/build dos workspaces consumidores.
3. Subir a aplicação somente com autorização e infra de pé → senão `deferred`.

## Fase 6 — Relatório

Ver `references/report-template.md`.
