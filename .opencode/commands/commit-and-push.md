---
description: Analisa as mudanças pendentes, cria um commit em Conventional Commits com co-autoria do opencode e faz push
---

Feche a unidade de trabalho atual: entenda o que mudou, escreva a mensagem, commite e publique.

Contexto adicional informado pelo usuário (pode estar vazio): $ARGUMENTS

## 1. Diagnóstico

Rode e leia a saída:

!`git status --short --branch`

!`git diff --stat`

!`git diff --cached --stat`

!`git log --oneline -5`

Depois use suas ferramentas para ler o que o `--stat` não mostra:

- `git diff` para mudanças não staged
- `git diff --cached` para mudanças já staged
- leia por completo os arquivos novos

Nunca descreva uma mudança que você não viu.

## 2. Decisão

- Working tree limpo e nada à frente do upstream → responda **"Nada a commitar"** e pare.
- Mudanças de naturezas independentes (ex.: feature + refactor não relacionado) → proponha a divisão em commits e aguarde confirmação.
- Caso contrário → um único commit coeso.

Escolha o `type` pelo efeito real da mudança:

| Type       | Quando usar                                        |
| ---------- | -------------------------------------------------- |
| `feat`     | comportamento novo                                 |
| `fix`      | correção de defeito                                |
| `docs`     | apenas documentação                                |
| `test`     | apenas testes                                      |
| `refactor` | reestruturação sem mudar comportamento             |
| `perf`     | ganho de performance                               |
| `build`    | build, empacotamento, dependências                 |
| `ci`       | pipeline de integração contínua                    |
| `chore`    | manutenção que não se encaixa nas categorias acima |

`scope` é a área afetada: `api`, `app`, `docs`, `ui`, `infra`, `env`, `tooling`, `specs`.

## 3. Mensagem

Formato:

```text
<type>(<scope>): <resumo no imperativo, minúsculo, sem ponto final>

- <o que mudou e por quê>
- <decisão relevante, desvio ou consequência>
- <como foi verificado>

Co-authored-by: opencode <noreply@opencode.ai>
```

Regras:

- Assunto com até 72 caracteres; linhas do corpo com até 100.
- Descreva o **porquê**, não repita o diff.
- Se houver ADR, cite no corpo: `Refs: ADR 0003`.
- O trailer `Co-authored-by` é obrigatório e deve ser a **última linha**.

## 4. Commit

1. `git add -A`
2. Confira o que entrou com `git diff --cached --stat`. Se aparecer `.env`, segredo, `node_modules`, artefato de build ou arquivo grande não intencional, **pare** e reporte.
3. Commite com a mensagem acima (assunto em um `-m`, corpo e trailer em outro, ou use arquivo temporário).
4. O hook `commit-msg` valida com `commitlint`. Se falhar, corrija a mensagem e repita. **Nunca use `--no-verify`.**

## 5. Push

1. Sem remote (`git remote` vazio) → **pare** e informe: `git remote add origin <url>`.
2. Sem upstream → `git push -u origin HEAD`.
3. Com upstream → `git push`.
4. **Nunca** use `--force` nem `--force-with-lease` sem pedido explícito.

Se a branch atual for `main`, avise no resultado que o push foi para a branch principal.

## 6. Resultado

Reporte:

- hash curto e mensagem do commit
- arquivos incluídos (quantidade e os relevantes)
- branch, remote e resultado do push

Se o push falhar, mostre o erro real e o próximo passo — não resuma como "falhou".
