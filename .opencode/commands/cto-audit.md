---
description: Executa a auditoria estrutural CTO (redundância, config, segredos, arquitetura, testes) em apps/api + apps/app
---

Audite a estrutura do projeto sob a ótica de um CTO.

Argumentos informados pelo usuário (podem estar vazios): $ARGUMENTS

## Parâmetros

- `scope=<paths>` — caminhos separados por vírgula. Default: `apps/api,apps/app`.
- `--fix` / `--no-fix` — aplica (ou não) auto-fixes da lista branca. Default: `--fix`.
- `--categories=<list>` — subset de `redundancy,config,secrets,architecture,tests`. Default: todas.
- `--with-build` — inclui `npm run build` nos gates (default: não).
- `--skip-gates` — pula os gates de QA (default: não).

Exemplos:
- `/cto-audit`
- `/cto-audit --no-fix --categories=secrets,config`
- `/cto-audit scope=apps/api --with-build`

## 1. Parse dos argumentos

Extraia os parâmetros acima de `$ARGUMENTS`. Se um parâmetro for inválido, pare e explique o uso correto.

## 2. Validação

Verifique se cada caminho em `scope` existe. Se algum não existir, pare e reporte.

## 3. Execução

Invoque o subagente `cto-auditor` passando os parâmetros parseados. O agente é responsável por:
- criar o run dir `.cto-audit/{run-id}/`,
- executar as fases 0–10,
- escrever `audit.md` e `audit.json`,
- aplicar auto-fixes (se `--fix`) e fazer rollback em caso de falha de gate.

Aguarde a conclusão e apresente ao usuário o resumo retornado pelo agente (JSON compacto em bloco cercado), além dos caminhos dos arquivos gerados.

## 4. Resultado

Reporte:
- run-id e caminhos de `audit.md` / `audit.json`
- contagens por severidade
- top 5 achados (id, severidade, título, arquivo)
- auto-fixes aplicados e status de rollback
- resultado dos gates
- próximo passo sugerido (ex.: rodar `refactor-vertical-slices` se houver muitos achados de arquitetura)