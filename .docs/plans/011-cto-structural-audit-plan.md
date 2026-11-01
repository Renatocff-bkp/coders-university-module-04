# Plano de implementação — 011-cto-structural-audit

## Resumo

Entregar um agente OpenCode `cto-auditor` + comando `/cto-audit` que audita `apps/api` + `apps/app` (e pacotes compartilhados consumidos), gerando relatório em `.cto-audit/{run-id}/` e aplicando apenas auto-fixes da lista branca (default ativo), com rollback em falha de QA.

Escopo de entrega (ajustado após refinamento):
- `.opencode/agents/cto-auditor.md`
- `.opencode/commands/cto-audit.md`
- `scripts/cto-audit/scan-secrets.mjs`
- `scripts/cto-audit/check-env.mjs`
- `.gitignore` (adicionar `.cto-audit/`)
- Sem skill `.agents/skills/cto-audit` (apenas agente + comando), conforme decisão.

## Decisões técnicas

1. **Scripts em `scripts/cto-audit/`** (não em `.agents/skills/...`), pois não haverá SKILL.md. O agente referenciará esses caminhos.
2. **Auto-fix default ativo** (`--fix`), com `--no-fix` para relatório puro.
3. **Permissões do agente**: `read/glob/grep/shell` allow; `write/edit` allow, mas o prompt restringe a lista branca. Justificativa: OpenCode não suporta allowlist por caminho de forma granular no frontmatter; a restrição é reforçada por instrução e por checklist de rollback.
4. **Gates padrão**: lint + check-types + test (build opcional via `--with-build`), para manter < 10 min.
5. **Run-id**: `YYYYMMDD-HHMMSS` (UTC).
6. **Mascaramento**: qualquer valor que case com padrões de segredo é substituído por `****` no relatório; o agente nunca imprime valores.
7. **Reutilização**: o agente invoca `audit-slices.mjs` da skill `refactor-vertical-slices` para a categoria "arquitetura", em vez de duplicar lógica.
8. **Sem novas dependências**: scripts em Node.js puro, seguindo `audit-slices.mjs`.

## Estrutura de arquivos a criar

```
.opencode/agents/cto-auditor.md
.opencode/commands/cto-audit.md
scripts/cto-audit/scan-secrets.mjs
scripts/cto-audit/check-env.mjs
.gitignore  (modify)
```

## Plano de execução (etapas)

### Etapa A — Gitignore + scripts

1. Adicionar `.cto-audit/` ao `.gitignore`.
2. Criar `scripts/cto-audit/scan-secrets.mjs`:
   - Percorre arquivos rastreados pelo git (via `git ls-files`), excluindo `node_modules`, `dist`, `coverage`, `*.lock`.
   - Aplica regexes de segredo (AWS access key, OpenAI `sk-`, GitHub tokens, JWT, connection strings com senha, senhas hardcoded em assignments).
   - Allowlist de falsos positivos: `*.test.*`, `*.spec.*`, arquivos em `db/`, placeholders (`example`, `changeme`, `password` em testes).
   - Saída JSON: `{ findings: [{ file, line, rule, maskedSnippet }] }`.
3. Criar `scripts/cto-audit/check-env.mjs`:
   - Coleta env vars referenciadas em `apps/api/src`, `apps/app/src`, `packages` via regex `process\.env\.(\w+)` e `import\.meta\.env\.(\w+)` e `VITE_(\w+)`.
   - Lê `.env.example` e `packages/env/src/server.ts` (schema).
   - Reporta: vars usadas mas ausentes do `.env.example`; vars no schema mas não usadas; vars no `.env.example` mas não no schema (informativo).
   - Saída JSON.

### Etapa B — Agente CTO

Escrever `.opencode/agents/cto-auditor.md` com:
- Frontmatter (description, mode: subagent, permissions).
- Persona CTO + princípios.
- Entrada: parâmetros `scope`, `fix`, `categories`, `with-build`, `skip-gates`.
- Fases 0–10:
  0. Preflight (validar scope, ler contexto).
  1. Contexto (docs + ADRs + package.json/turbo.json).
  2. Inventário (árvore, scripts, deps, configs).
  3. Gates (lint, check-types, test, build opcional).
  4. Segredos (rodar scan-secrets.mjs + análise manual).
  5. Redundância (leitura/grep, duplicação).
  6. Configurações (rodar check-env.mjs + análise manual).
  7. Arquitetura (invocar audit-slices.mjs + análise manual).
  8. Testes/QA (cobertura, módulos sem teste).
  9. Auto-fix (lista branca) + rollback.
  10. Relatório (escrever audit.md + audit.json).
- Formato de saída estrito (JSON no chat ao final, além dos arquivos).
- Mascaramento obrigatório.

### Etapa C — Comando

Escrever `.opencode/commands/cto-audit.md` com:
- Descrição, argumentos, exemplos.
- Validação de parâmetros.
- Invocação do agente `cto-auditor`.

### Etapa D — QA e smoke test

1. `npm run lint` e `npm run check-types` nos arquivos novos.
2. Smoke test: rodar `/cto-audit --no-fix --categories secrets,config` em estado limpo; validar relatório gerado e nenhum arquivo alterado.
3. Documentar smoke test no plano/README se necessário.

### Etapa E — Publicação

- `/commit-and-push` ao final.

## Critérios de aceite (refinados)

- [ ] `.opencode/agents/cto-auditor.md` carregável.
- [ ] `.opencode/commands/cto-audit.md` funcional.
- [ ] Scripts executam em Node puro e produzem JSON válido.
- [ ] `/cto-audit --no-fix` gera relatório e não altera arquivos.
- [ ] `/cto-audit` (default) aplica apenas lista branca e reexecuta gates; rollback em falha.
- [ ] `.cto-audit/` gitignored.
- [ ] lint + check-types passam.

## Riscos e mitigações (refinados)

- Falsos positivos em segredos: allowlist + severidade `blocker` apenas com evidência forte; sem auto-fix para segredos.
- Auto-fix quebra build: lista branca + rollback.
- Scripts dependentes de `git ls-files`: rodar a partir da raiz do repo; documentar.

## Confirmação

Aguardando aprovação do usuário para iniciar a implementação (Etapa A).