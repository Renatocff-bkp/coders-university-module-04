---
name: code-review
description: Reviews a GitHub pull request with the code-reviewer agent. Fetches the PR, performs a deep review, posts inline comments using Conventional Comments, and submits a final review (approve or request changes). Use when the user provides a GitHub PR URL/number or asks to review a pull request.
---

# Code Review

Skill para revisar um Pull Request do GitHub de ponta a ponta: coleta o diff, executa uma revisão profunda com o agente `code-reviewer`, publica comentários inline no formato Conventional Comments e submete a revisão final (aprovação ou request changes).

## Quando usar

- O usuário fornece um link de PR do GitHub (`https://github.com/owner/repo/pull/123`)
- O usuário pede "revise o PR #123", "code review no PR", "review this pull request"
- Antes de merge de uma feature implementada

## Quando não usar

- Revisão de código local sem PR (use o agente diretamente sobre o diff do working tree)
- PRs de repositórios privados sem token de acesso configurado

## Argumentos

| Argumento | Obrigatório | Descrição                    |
| --------- | ----------- | ---------------------------- |
| `pr-url`  | Sim         | URL completa do PR no GitHub |

## Pré-requisitos

- Variável de ambiente `GITHUB_TOKEN` (ou `GH_TOKEN`) com escopo `repo` (para PRs privados) ou ao menos `public_repo`
- Node.js disponível (os scripts auxiliares usam `fetch` nativo)
- Agente `code-reviewer` registrado (`.opencode/agents/code-reviewer.md`)

Se o token não estiver configurado, informe o usuário e peça para definir `GITHUB_TOKEN` antes de prosseguir. Não tente revisar sem acesso à API.

## Convenção de comentários (Conventional Comments)

Todos os comentários inline e o comentário geral seguem o formato:

```
<label> [decorations]: <subject>

[discussion]
```

Labels suportados: `praise`, `nitpick`, `suggestion`, `issue`, `todo`, `question`, `thought`, `chore`, `note`, `typo`, `polish`, `quibble`.

Decorações suportadas: `(blocking)`, `(non-blocking)`, `(if-minor)` e decorações de domínio como `(security)`, `(performance)`, `(a11y)`, `(i18n)`, `(test)`.

Regra de decisão final:

- Se existir **pelo menos um** comentário com label `issue` **ou** decoração `(blocking)`, a revisão final deve ser **request changes**.
- Caso contrário, a revisão final deve ser **approve**.
- Não existe revisão "neutra" (comment-only). Sempre aprove ou solicite mudanças.

## Fluxo

### 1. Validar entrada

1. Confirme que `pr-url` é uma URL de PR do GitHub (`https://github.com/{owner}/{repo}/pull/{number}`).
2. Extraia `owner`, `repo` e `number`.
3. Verifique `GITHUB_TOKEN`/`GH_TOKEN`. Se ausente, avise e pare.

### 2. Carregar contexto do projeto

Antes de revisar, leia os documentos de convenção do projeto (se existirem) para calibrar a revisão:

1. `.docs/AGENTS.md`
2. `.docs/ARCHITECTURE.md`
3. `.docs/DEVELOPMENT.md`
4. `.docs/QA.md`
5. `.docs/DESIGN_SYSTEM.md`

Se algum não existir, ignore sem erro. O agente `code-reviewer` também pode ler arquivos do repositório do PR conforme necessário (via API/GitHub não; apenas o diff já coletado). Para inspecionar o codebase local equivalente, use `read`/`grep`/`glob`.

### 3. Coletar dados do PR

Execute o script auxiliar:

```bash
node .agents/skills/code-review/scripts/fetch-pr.mjs "<pr-url>"
```

Ele retorna um JSON com `owner`, `repo`, `number`, `pr` (metadados incluindo `head.sha`), `files` e `diff`. Salve esse JSON em um arquivo temporário se necessário (ex.: `.tmp/pr-data.json`).

Se o script falhar (token inválido, PR não encontrado), reporte o erro e pare.

### 4. Executar a revisão com o agente

Invoque o subagente `code-reviewer` passando:

- A URL do PR
- O JSON coletado (ou caminho do arquivo)
- Os documentos de convenção carregados
- Instrução explícita: "Retorne APENAS um objeto JSON no formato acordado, dentro de um bloco de código cercado. Sem prosa adicional."

O agente deve produzir um JSON no seguinte formato:

```json
{
  "summary": "Markdown com resumo geral da revisão",
  "comments": [
    {
      "path": "caminho/relativo/do/arquivo",
      "line": 42,
      "side": "RIGHT",
      "label": "issue",
      "decorations": ["blocking"],
      "subject": "Mensagem principal curta",
      "discussion": "Contexto, raciocínio e sugestão de correção (opcional)"
    }
  ]
}
```

Campos:

- `path`: caminho do arquivo no repositório (como aparece no diff).
- `line`: número da linha no arquivo (lado `RIGHT` para linhas adicionadas/modificadas; `LEFT` para removidas).
- `side`: `RIGHT` ou `LEFT`.
- `label`: um dos labels convencionais.
- `decorations`: lista (pode ser vazia) de decorações, sem parênteses.
- `subject`: mensagem principal.
- `discussion`: texto adicional opcional.

Inclua ao menos um `praise` quando houver algo positivo genuíno (regra do Conventional Comments). Não invente elogios.

### 5. Normalizar e validar comentários

1. Para cada comentário, monte o corpo:

   ```
   **{label}{decorations}:** {subject}

   {discussion}
   ```

   Onde `{decorations}` é ` (dec1,dec2)` se houver decorações, senão vazio. Exemplo: `**issue (blocking):** ...`.

2. Remova comentários duplicados ou que não correspondam a linhas presentes no diff (o GitHub rejeitará linhas fora do diff).
3. Recompute o bloqueio: `has_blocking = comments.some(c => c.label === 'issue' || c.decorations.includes('blocking'))`.

### 6. Decidir a revisão final

- Se `has_blocking` for verdadeiro → `event = "REQUEST_CHANGES"`.
- Caso contrário → `event = "APPROVE"`.

### 7. Publicar a revisão

Monte o payload:

```json
{
  "commit_id": "<head.sha do PR>",
  "body": "<summary do agente + legenda de decisão>",
  "event": "APPROVE | REQUEST_CHANGES",
  "comments": [
    {
      "path": "...",
      "line": 42,
      "side": "RIGHT",
      "body": "**issue (blocking):** ..."
    }
  ]
}
```

Execute:

```bash
node .agents/skills/code-review/scripts/post-review.mjs "<pr-url>" /caminho/payload.json
```

O script imprime a URL da revisão criada. Se falhar, reporte o erro e o payload para o usuário publicar manualmente.

### 8. Entrega

Apresente ao usuário:

| Item               | Conteúdo                        |
| ------------------ | ------------------------------- |
| PR                 | owner/repo#number               |
| Decisão            | Aprovado / Mudanças solicitadas |
| Comentários inline | Quantidade por label            |
| Bloqueadores       | Lista resumida (se houver)      |
| Link da revisão    | URL retornada pelo script       |

## Regras

- **Sempre publique uma decisão final** — nunca apenas comentários soltos.
- **Conventional Comments obrigatório** — todo comentário inline e o geral seguem o formato.
- **Não invente problemas** — só comente o que está sustentado pelo diff/código.
- **Não aprove com bloqueador** — se houver `issue` ou `(blocking)`, force `request changes`.
- **Respeite o escopo** — não exija mudanças fora do escopo do PR (registre como `thought`/`suggestion` non-blocking).
- **Seja específico** — cite arquivo e linha.
- **Use o agente `code-reviewer`** — não faça a revisão manualmente sem o agente; a skill orquestra, o agente analisa.

## Critérios de revisão (não exaustivo)

O agente deve cobrir, no mínimo:

1. **Padrões** — aderência a lint, formatação, convenções do projeto, arquitetura, nomenclatura, estrutura de pastas, imports, DRY, SOLID.
2. **Performance** — complexidade, re-renders, N+1, queries, bundle, memoização, lazy loading, caching.
3. **Bug/Funcionalidade** — corretude, casos de borda, null/undefined, tratamento de erros, regressões, contratos de API, estados de loading/erro.
4. **Legibilidade** — clareza, nomes, funções curtas, comentários úteis, ausência de código morto.
5. **Componentes acessíveis** — semântica HTML, ARIA, foco, teclado, contraste, labels, screen readers.
6. **I18n** — strings hardcoded, chaves de tradução, formatação de datas/números/moedas, RTL quando aplicável.
7. **QA** — testes unitários/integração/e2e presentes e adequados, casos de borda cobertos, mocks apropriados, ausência de testes frágeis.
8. **Observabilidade (011y)** — logs estruturados, métricas, tracing, correlação de erros, sem PII em logs, níveis adequados.

Além desses, o agente não deve se limitar: segurança, tipos, migrações de banco, compatibilidade retroativa, acessibilidade de APIs, documentação, configuração, CI/CD, performance de build, etc.

## Scripts auxiliares

- `scripts/fetch-pr.mjs <pr-url>` — coleta metadados, arquivos e diff do PR.
- `scripts/post-review.mjs <pr-url> <payload.json>` — publica a revisão e os comentários inline.
