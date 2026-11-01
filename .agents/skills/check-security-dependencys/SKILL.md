---
name: check-security-dependencys
description: Audita as dependências do monorepo (npm workspaces) quanto a vulnerabilidades conhecidas, pesquisa a versão corretora disponível na internet, aplica a correção com segurança e valida que nada quebrou. Use sempre que o usuário pedir para "checar dependências", "auditar segurança", "verificar vulnerabilidades", "npm audit", "tem alguma lib com alerta", "atualizar lib com problema" ou "dependência com vulnerabilidade" — mesmo que ele não diga "security" nem "audit". Também use antes de releases, ao adicionar uma nova dependência ou quando uma advisory de segurança for publicada para uma lib em uso.
compatibility: Node.js >= 24 e npm 11. Em Windows com execution policy bloqueada, usar `cmd /c "npm ..."` ou binários locais em vez de `npm`/`npx` puros.
---

# Check Security Dependencies

Audita as dependências do monorepo, tria vulnerabilidades conhecidas, pesquisa a
versão corretora, aplica a correção e valida a superfície afetada.

O objetivo não é apenas rodar `npm audit` e declarar pronto: cada achado precisa
virar correção com versão exata, gates verdes e validação funcional nos
workspaces que consomem a lib trocada.

## Quando usar

- "Checa as dependências do projeto?", "roda o npm audit?", "tem vulnerabilidade?"
- Antes de release, após receber advisory, ao adicionar dependência nova.
- Quando o usuário menciona "atualizar", "corrigir", "patch", "upgrade" de libs.

Não use para:

- Auditoria de código, segredos ou arquitetura (use `cto-audit` / agente
  `cto-auditor`).
- Bump de versão sem advisory associado (use `refactor-vertical-slices` só se
  o bump virar mudança arquitetural).

## Pré-voo

Item bloqueante que falhar interrompe a skill.

| # | Verificação              | Como                                        | Bloqueante |
| - | ------------------------ | ------------------------------------------- | ---------- |
| 1 | Working tree limpo       | `git status --porcelain`                    | sim        |
| 2 | Node/npm                 | `node -v`; `cmd /c "npm -v"`                | sim        |
| 3 | Escopo do monorepo       | presença de `package.json` na raiz e em `apps/*`, `packages/*`                | sim        |
| 4 | Diretório de runs       | criar `.security-deps/{run-id}/`                                              | não        |

- Working tree sujo: pare; peça commit/stash. Nunca descarte trabalho alheio.
- Se `npm audit` exigir rede e falhar: registre o bloqueio, não invente achados.

## Fluxo

### Fase 1 — Inventário e varredura

1. Rode o inventário e a varredura:

   ```bash
   cmd /c "npm audit --json" > .security-deps/{run-id}/audit.json
   cmd /c "npm audit"          # saída humana legível
   ```

2. O lockfile na raiz cobre todos os workspaces (`apps/*`, `packages/*`), portanto
   um único `npm audit` na raiz é suficiente.
3. Salve o JSON e a saída humana em `.security-deps/{run-id}/`. O JSON é a fonte
   da verdade para triagem.

### Fase 2 — Triagem

Leia `audit.json` e produza a lista de achados:

- `metadata.vulnerabilities` → totais e `bySeverity` (low, moderate, high, critical).
- `vulnerabilities` → chave de caminho (ex.: `node_modules/next`,
  `node_modules/@nestjs/platform-express/node_modules/multer`) → `{ name, severity,
  isDirect, isDev, fixAvailable, range, effects, url }`.
- Achado com `isDirect: true` é vulnerabilidade de dependência declarada no
  `package.json` do workspace — exige ação deliberada.
- Achado com `isDev: true` é vulnerabilidade em devDependency — reportar, mas
  priorizar a correção quando o fix for trivial e não-breaking.

### Fase 3 — Correção (com segurança)

1. Priorize: `critical > high > moderate > low`.
2. Tente antes o fix não-breaking:

   ```bash
   cmd /c "npm audit fix"
   ```

3. Se `fixAvailable` sinalizar fix, e se `npm audit` sair limpo, manter. Se ainda
   houver achados, investigue.
4. Se o fix for breaking (`fixAvailable.isSemVerFix` / `npm audit fix --force`
   sugerindo downgrade/fora de range): NÃO aplique com força cega. Pesquise a versão
   corretora:
   - `cmd /c "npm view <pkg> version"` e `cmd /c "npm view <pkg>@<versao> version"`;
   - conferir advisory em <https://github.com/advisories> (via web) para a versão
     exata corrigida.
5. Aplique a versão exata no `package.json` do workspace correspondente
   (o projeto pinna versões exatas; não introduza `^`/`~` na correção).
6. Atualize o lockfile: `cmd /c "npm install"`.

### Fase 4 — QA gates

Rode os gates do projeto (ver `.docs/QA.md`) e registre resultado real:

- `npm run format:check`
- `npm run lint`
- `npm run check-types`
- `npm run test`
- `npm run build`

No Windows, use `cmd /c "npm run <script>"`. Para isolamento por workspace:

```bash
node node_modules/turbo/bin/turbo run <task> --filter=<workspace>
```

Falha pré-existente no baseline → `pre-existing`; falha nova em arquivo tocado →
regressão.

### Fase 5 — Validação funcional nos workspaces afetados

A lib foi trocada; agora valide o uso real:

1. Identifique os workspaces consumidores da lib vulnerável (do `effects` do audit
   ou do `package.json` onde a dep direta está).
2. Rode os testes e o build **desses workspaces específicos**.
3. Suba a aplicação apenas se o usuário autorizar e a infra estiver de pé; caso
   contrário, registre `deferred (infra)`.

### Fase 6 — Relatório

Escreva `.security-deps/{run-id}/security-audit.md`:

1. Resumo (totais por severidade, achados bloqueadores).
2. Achados corrigidos (lib, advisory, versão anterior → versão corrigida).
3. Achados não corrigidos (sem fix disponível) — ação necessária.
4. Resultado dos gates e da validação funcional.
5. Pendências.

## Referências

Antes de executar cada fase, leia o documento correspondente:

- `references/workflow.md` — passo a passo completo das fases (inventário, triagem,
  correção, gates, validação).
- `references/fix-policy.md` — como decidir entre `npm audit fix` e bump manual,
  política de versões e pesquisa de advisory.
- `references/report-template.md` — template obrigatório do relatório.

## Comandos portáveis

- `npm`/`npx` bloqueados no shell do OpenCode no Windows: use
  `cmd /c "npm run <script>"` ou binários locais, ex.:
  `node node_modules/turbo/bin/turbo run <task> --filter=api`.
- Cite caminhos com espaços entre aspas no comando.

## Política de correção

- Correção não-breaking: `npm audit fix`.
- Correção breaking: pesquisa + bump de versão exata + validação; nunca
  `--force` cego sem justificativa registrada.
- Nunca introduzir ranges flexíveis (`^`, `~`) em correção de segurança.
- Nunca desabilitar advisories (`--omit=dev`, overrides sem justificativa).

## Tratamento de falhas

| Situação | Ação |
| -------- | ------ |
| Working tree sujo | Pare; peça commit/stash |
| Sem rede / audit falha | Bloqueie; registre; não invente achados |
| Fix breaking sem versão conhecida | Pesquise advisory; escale ao usuário |
| Gate vermelho após correção | Regrediu? Corrija ou reverta; nunca ignore |
| Lib sem versão corrigida | Reporte no relatório; ação manual pendente |

## Regras não negociáveis

- Auditoria antes da correção; correção aplicada; gates depois.
- Nenhuma correção sem advisory confirmado.
- Correção em versão exata; lockfile consistente.
- Toda correção aplicada passa nos gates e na validação funcional.
- Nada de segredo no relatório; valores mascarados.

## Exemplo

`check-security-dependencys`

1. Pré-voo: working tree limpo, Node 24/npm 11 ok.
2. Varredura: `npm audit` → 22 vulnerabilidades (1 low, 18 moderate, 2 high, 1 critical).
3. Triagem: `next` (critical, advisory GHSA...), `multer` via `@nestjs/platform-express` (high),
   `esbuild` via `drizzle-kit` (moderate).
4. Correção: `npm audit fix` resolve alguns; breaking (`next`) → bump para versão corrigida.
5. Gates: format/lint/types/test/build verdes nos workspaces tocados.
6. Relatório: `.security-deps/{run-id}/security-audit.md`.
