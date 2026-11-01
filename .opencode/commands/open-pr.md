---
description: Abre o PR de uma feature com auditoria de dependências obrigatória: roda o security-deps-auditor, commita a correção fix(deps) separada, commita a feature com o resumo de segurança, valida os gates e abre o PR com seção de segurança
---

Abra o Pull Request da feature atual.

Contexto adicional informado pelo usuário (pode estar vazio): $ARGUMENTS

Este comando é o gate de segurança de dependências do ciclo de vida (spec 013). Não abra PR por nenhum outro caminho sem passar por ele.

## 1. Pré-voo (bloqueante)

!`git status --short --branch`

!`git log --oneline -5`

1. Branch atual não pode ser `main`. Se for, pare e peça uma branch `feat/{spec-name}`.
2. Verifique `gh auth status`. Se falhar, pare e informe `gh auth login`.
3. Liste as mudanças pendentes e classifique:
   - **Da feature:** arquivos que a feature tocou. Use o plano em `.docs/plans/` e a spec em `.specs/` como referência.
   - **De dependências:** `package.json` ou `package-lock.json` alterados sem relação com a feature.
   - **Alheias:** qualquer outra coisa, inclusive artefatos (`*.json` de eval, pastas `*-workspace/`, `tmp-*`).

Se houver mudança alheia ou de dependência que não pertença à feature, **pare** e liste os arquivos. Não commite nem descarte trabalho alheio sem confirmação. (RF-11)

## 2. Auditoria de dependências

Chame o subagent `security-deps-auditor` com `fix: true`. Ele devolve o bloco JSON definido no próprio agente.

- Se `status` for `blocked` (sem rede, `npm audit` falhou), pare e informe o erro real. Não abra PR.
- Se `blocking` não estiver vazio, pare e liste os achados bloqueantes. Não abra PR. (RF-07)

## 3. Commit de correção `fix(deps)`

Só se `fixes` não estiver vazio.

1. Faça staging **somente** dos arquivos listados em `fixes[].files`, por caminho. Não use `git add -A`.
2. Confira com `git diff --cached --stat`.
3. Commite com esta forma (assunto em um `-m`; corpo em outro `-m`):

```text
fix(deps): corrige vulnerabilidades em <lib1>, <lib2>

- <lib>: <from> → <to> (<severity>, <advisory>, <advisoryUrl>)
  workspace: <workspace> · tipo: <dependencyType> · método: <method>
  motivo: <resumo da advisory>
- (repita uma entrada por achado corrigido)

Não-corrigidos nesta entrega (ver PR):
- <lib> (<severity>, <advisory>): <reason>

Verificação: npm audit → <contagem antes> → <contagem depois>; gates <lista de pass/pre-existing>.

Refs: spec 013
Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>
```

4. Guarde o hash com `git rev-parse --short HEAD`. Ele será usado no commit da feature.

Regras de commit: o hook `commit-msg` (commitlint) precisa passar. Nunca use `--no-verify`.

## 4. Commit da feature

1. Faça staging **somente** dos arquivos da feature, por caminho.
2. Confira com `git diff --cached --stat`.
3. Commite com `type(scope)` pelo efeito real da feature, e inclua o bloco `Security:` no corpo:

```text
<type>(<scope>): <resumo>

- <o que mudou e por quê>
- <decisão relevante>
- <como foi verificado>

Security:
- npm audit: <contagem antes> → <contagem depois>
- <lib> <from> → <to> (<severity>, <advisory>) — correção em <hash fix(deps)>
- (ou, sem achados) npm audit sem achados em <data>

Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>
```

O trailer `Co-authored-by` é obrigatório e fica na última linha.

## 5. Gates

Rode a sequência de `.docs/QA.md`:

```bash
cmd /c "npm run format:check"
cmd /c "npm run lint"
cmd /c "npm run check-types"
cmd /c "npm run test"
cmd /c "npm run build"
```

Se um gate falhar por regressão da feature ou da correção, pare, corrija e refaça o commit. Não abra PR com gate vermelho. Falha `pre-existing` é registrada na descrição do PR.

## 6. Push

1. Sem upstream: `git push -u origin HEAD`.
2. Com upstream: `git push`.
3. Nunca use `--force` nem `--force-with-lease` sem pedido explícito.

## 7. Descrição e abertura do PR

Gere o corpo a partir do relatório `security-audit.md` e do plano da feature. Use este modelo:

```markdown
## Resumo

<2 a 3 frases sobre a feature>

## Spec

<link para .specs/NNN-*.md> — critérios de aceite atendidos: <lista marcada>

## Segurança de dependências

Auditoria: `npm audit` antes → depois: <contagem>.

| Lib   | Severidade | Advisory          | Versão vulnerável | Versão corrigida | Workspace | Ação                                           |
| ----- | ---------- | ----------------- | ----------------- | ---------------- | --------- | ---------------------------------------------- |
| <lib> | <sev>      | <GHSA/CVE + link> | <from>            | <to>             | <ws>      | <npm audit fix / bump exato> (commit `<hash>`) |

<se não houver achados: "npm audit sem achados em <data>.">

### Não corrigidos nesta entrega

- <lib> (<sev>, <advisory>): <razão e ação necessária>

<se não houver: "Nenhum.">

## Gates

| Gate         | Resultado                |
| ------------ | ------------------------ |
| format:check | <pass/fail/pre-existing> |
| lint         | ...                      |
| check-types  | ...                      |
| test         | ...                      |
| build        | ...                      |

## Validação manual

<passos de QA manual, ou "n/a" com motivo>
```

Abra com:

```bash
cmd /c "gh pr create --base main --head <branch> --title \"<type>(<scope>): <resumo>\" --body-file <arquivo-temporario>"
```

Grave o corpo em `.security-deps/{run-id}/pr-body.md` e use `--body-file` (evita problemas de escape no PowerShell).

## 8. Resultado

Reporte:

- URL do PR;
- hashes e mensagens dos commits (`fix(deps)` e feature);
- resumo das vulnerabilidades corrigidas (lib, versão anterior → nova, advisory);
- pendências não corrigidas;
- resultado dos gates.

Se algum passo falhar, mostre o erro real e o próximo passo. Não resuma como "falhou".
