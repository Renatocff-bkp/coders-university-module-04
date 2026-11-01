# Política de correção — Check Security Dependencies

## Estratégia de fix

| Sinal no `audit.json`                    | Ação                                                            |
| --------------------------------------- | ---------------------------------------------------------------- |
| `fixAvailable.fixes` (não-breaking)    | `npm audit fix` e re-verificar                                  |
| `fixAvailable.isPatch`                  | Patch bump via `npm audit fix`                                  |
| `fixAvailable.isSemVerFix`              | Investigar manualmente (versão exata corrigida) antes de aplicar |
| `fixAvailable.isUpgrade`                | Upgrade para versão corrigida, aplicado como versão exata        |
| `fixAvailable` ausente / null           | Sem fix upstream → escalar ao usuário, manter achado aberto       |

## Regras

1. **Versão exata**: correções de segurança aplicam versão exata no
   `package.json`. O monorepo pinna versões (sem `^`/`~`) em produção; manter o
   padrão.
2. **Lockfile**: sempre `npm install` após edição de versão para regenerar
   `package-lock.json`.
3. **Breaking**: nunca aplicar via `--force` cego. Pesquisar advisory, confirmar a
   versão corrigida, registrar justificativa no relatório.
4. **Overrides**: só com justificativa registrada e teste de regressão; preferir
   bump direto.
5. **DevDeps**: corrigir quando o fix for não-breaking; reportar quando exigir
   ação manual.

## Pesquisa de versão corretora

- Registry: `cmd /c "npm view <pkg> version"`; `cmd /c "npm view <pkg>@<versao>" version`.
- Advisory: <https://github.com/advisories> (GHSA-...) associado ao `url` do achado.
- Confirmar que a versão corrigida cobre o `range` vulnerável.

## Re-verificação

Após cada correção aplicada:

1. `cmd /c "npm audit"` → exit 0 = limpo (ou restos justificados).
2. Gates + validação funcional (Fases 4 e 5 do workflow).
