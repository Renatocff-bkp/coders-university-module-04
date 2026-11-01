# Agente CTO de Auditoria Estrutural (Backend + Frontend)

## Metadado

| Campo         | Valor         |
| ------------- | ------------- |
| Status        | `draft`       |
| Prioridade    | `high`        |
| Criado em     | 2026-11-01    |
| Atualizado em | 2026-11-01    |
| Responsável   | Renato        |

## Resumo

Criar um agente OpenCode (`cto-auditor`) que atua como CTO e audita as aplicações de backend (`apps/api`) e frontend (`apps/app`) em busca de problemas estruturais: redundância/DRY, configurações faltando, informações críticas expostas, violações de arquitetura em camadas e lacunas de testes/QA. O agente gera um relatório estruturado (markdown + JSON) em `.cto-audit/` e aplica automaticamente apenas correções de baixo risco (lista branca), reexecutando os gates de QA ao final. A invocação se dá pelo comando `/cto-audit`.

## Contexto

O repositório é um monorepo Turborepo (NestJS + React/Vite) com fundação parcialmente executada (specs `000`–`010`). Existem agentes OpenCode especializados (ex.: `code-reviewer`) e skills de auditoria (ex.: `refactor-vertical-slices` com `audit-slices.mjs`), mas não há uma auditoria abrangente que combine segurança de segredos, redundância, configurações e testes sob a ótica de um CTO. Divergências entre documentação e código já causaram bugs neste repositório (regra não negociável #2), e segredos/PII em logs ou `.env` commitado são riscos de alto impacto. Este agente fecha essa lacuna com uma visão holística e acionável.

Referências: `.docs/AGENTS.md`, `.docs/ARCHITECTURE.md`, `.docs/DEVELOPMENT.md`, `.docs/QA.md`, `.docs/RULES.md`, `.adrs/`, `.specs/010-experts-agents.md`, `.opencode/agents/code-reviewer.md`.

## Escopo

### Dentro do escopo

- Definição do agente `.opencode/agents/cto-auditor.md` (modo subagente, persona CTO).
- Comando `.opencode/commands/cto-audit.md` com parâmetros (`scope`, `--fix`/`--no-fix`, `--categories`).
- Auditoria de `apps/api` + `apps/app` (+ pacotes compartilhados consumidos: `packages/env`, `packages/ui`, `packages/eslint-config`, `packages/typescript-config`).
- Categorias: redundância/DRY, configurações faltando, segredos/dados críticos expostos, arquitetura em camadas, testes/QA.
- Relatório em `.cto-audit/{run-id}/audit.md` + `audit.json`.
- Auto-fix seguro (lista branca) + reexecução dos gates de QA.
- Atualização do `.gitignore` para ignorar `.cto-audit/`.
- (Opcional) Script auxiliar de varredura mecânica (segredos + consistência de env) em `.agents/skills/cto-audit/scripts/`.

### Fora do escopo

- Auditoria de `apps/docs` (Next.js vitrine) — fora do escopo escolhido; pode ser adicionado depois.
- Infraestrutura LGTM/Postgres em profundidade (coberto por `infra-health` e pgTAP) — apenas checagens de configuração.
- Deploy/CI/CD externo (Vercel) — apenas verificação de presença de config local.
- Refatoração arquitetural completa (coberta por `refactor-vertical-slices`).
- Geração de código de produto/feature.
- Correções semânticas ou de lógica de negócio (nunca auto-aplicadas).

## Requisitos funcionais

| ID    | Requisito                     | Descrição                                                                                                                                                                                                                                     |
| ----- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Definição do agente CTO       | Criar `.opencode/agents/cto-auditor.md` com persona de CTO, permissões de leitura/escrita controladas, e processo de auditoria em fases. O agente nunca edita arquivos fora da lista branca de auto-fix.                                       |
| RF-02 | Comando `/cto-audit`          | Criar `.opencode/commands/cto-audit.md` que dispara o agente com parâmetros: `scope` (default `apps/api,apps/app`), `--fix` (default ativo), `--no-fix`, `--categories` (subset). Valida parâmetros antes de executar.                             |
| RF-03 | Carregamento de contexto      | O agente deve ler `.docs/AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `QA.md`, `RULES.md`, ADRs relevantes e `package.json`/`turbo.json` antes de auditar. Divergência doc↔código deve ser registrada como achado, não "corrigida" na doc. |
| RF-04 | Inventário estrutural         | Mapear árvore de arquivos, scripts npm, dependências, tsconfig, eslint, prettier, docker-compose, migrations e variáveis de ambiente referenciadas.                                                                                            |
| RF-05 | Gates de QA                   | Executar `npm run lint`, `npm run check-types`, `npm run test` (e `npm run build` quando viável) e registrar falhas como achados `blocker`/`major` com saída resumida.                                                                         |
| RF-06 | Varredura de segredos         | Detectar segredos/credenciais hardcoded (chaves de API, tokens, senhas, connection strings), arquivos `.env` rastreados pelo git, PII em logs, CORS permissivo, headers de segurança ausentes e respostas de erro que vazam stack/segredo.     |
| RF-07 | Redundância / DRY             | Identificar código duplicado (blocos/funções), lógica repetida entre módulos, imports não utilizados, configurações duplicadas e componentes equivalentes.                                                                                    |
| RF-08 | Configurações faltando        | Verificar env vars referenciadas no código vs. `.env.example`, validação de env (`packages/env`), tsconfig strict, eslint `--max-warnings 0`, prettier, docker-compose, observabilidade (OTel/LGTM) e health checks.                         |
| RF-09 | Arquitetura em camadas        | Verificar dependências apontando para dentro (domain sem I/O), estrutura de slices (`domain/application/infrastructure/interface`), handlers 1:1 com use cases, e ausência de controllers legados. Pode reutilizar `audit-slices.mjs`.        |
| RF-10 | Testes / QA                   | Identificar módulos de `domain`/`application` sem testes, testes frágeis (sleep fixo, mocks excessivos), ausência de testes de integração para fluxos críticos e cobertura abaixo do esperado.                                               |
| RF-11 | Relatório estruturado         | Gerar `.cto-audit/{run-id}/audit.md` e `audit.json` com: resumo executivo, contagens por categoria/severidade, lista de achados (id, categoria, severidade, arquivo, linha, evidência, impacto, recomendação, status de auto-fix).            |
| RF-12 | Auto-fix seguro               | Aplicar automaticamente apenas itens da lista branca (RF-13), registrando cada alteração no relatório. Após aplicar, reexecutar os gates de QA; se algum gate falhar, reverter os auto-fixes aplicados nesta execução.                     |
| RF-13 | Lista branca de auto-fix      | Auto-fix permitido somente para: (a) formatação via Prettier; (b) `eslint --fix` com regras de baixo risco; (c) remoção de imports/variáveis não utilizadas confirmadas pelo compilador; (d) adição de variáveis faltantes em `.env.example` (documentação); (e) adição de entradas no `.gitignore` para arquivos sensíveis rastreados. Nenhum outro arquivo de código de produção pode ser alterado automaticamente. |
| RF-14 | Gitignore                     | Adicionar `.cto-audit/` ao `.gitignore` (artefatos de auditoria são locais, não versionados).                                                                                                                                                |
| RF-15 | Rastreabilidade               | Cada achado deve referenciar evidência verificável (trecho de código, comando ou arquivo). Achados sem evidência não podem ser reportados.                                                                                                     |
| RF-16 | Idempotência                  | Reexecutar a auditoria no mesmo estado deve produzir o mesmo conjunto de achados (mesmos ids), salvo mudanças no código.                                                                                                                      |

## Requisitos não-funcionais

| ID     | Requisito        | Descrição                                                                                                                             |
| ------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Segurança        | O agente nunca imprime segredos em logs/relatório; mascara valores (ex.: `sk-...****`). Arquivos `.env` reais nunca são commitados.    |
| RNF-02 | Read-only por padrão | Sem `--fix`, o agente não altera nenhum arquivo.                                                                                      |
| RNF-03 | Performance      | Auditoria completa de `apps/api`+`apps/app` deve concluir em tempo razoável (< 10 min) em máquina de dev; gates pesados podem ser opcionais via flag. |
| RNF-04 | Idioma           | Relatório e saída do agente em en-US (identificadores/código) e spec/docs em pt-BR; achados podem citar código em en-US.               |
| RNF-05 | Testes           | O agente deve ser validável por smoke test: rodar em estado limpo e produzir relatório sem crash; `npm run lint`/`check-types` passam nos arquivos do agente/comando. |
| RNF-06 | Compatibilidade  | Funcionar no OpenCode com a configuração existente (`.opencode/opencode.json`), sem novas dependências de runtime obrigatórias.        |
| RNF-07 | Determinismo     | Scripts auxiliares devem ser determinísticos e sem dependências externas (Node.js puro), seguindo o padrão de `audit-slices.mjs`.       |

## Critérios de aceite

- [ ] `.opencode/agents/cto-auditor.md` existe e é carregável pelo OpenCode.
- [ ] `.opencode/commands/cto-audit.md` existe e executa a auditoria com parâmetros documentados.
- [ ] Executar `/cto-audit` em estado limpo gera `.cto-audit/{run-id}/audit.md` e `audit.json`.
- [ ] O relatório contém achados categorizados (redundância, config, segredos, arquitetura, testes) com severidade e evidência.
- [ ] Segredos/dados críticos expostos (se houver) são reportados como `blocker`.
- [ ] Com `--no-fix`, nenhum arquivo é alterado (verificável via `git status`).
- [ ] Com `--fix`, apenas itens da lista branca são aplicados; gates de QA reexecutados; em caso de falha, rollback realizado.
- [ ] `.cto-audit/` está no `.gitignore`.
- [ ] `npm run lint`, `npm run check-types` passam nos arquivos adicionados.
- [ ] Smoke test documentado e executável.

## Impacto técnico

### Arquivos afetados

| Arquivo / Caminho                               | Ação   | Descrição                                                                                      |
| ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `.opencode/agents/cto-auditor.md`               | create | Definição do agente CTO (persona, fases, permissões, formato de saída).                        |
| `.opencode/commands/cto-audit.md`               | create | Comando de invocação com parâmetros e validação.                                               |
| `.agents/skills/cto-audit/SKILL.md`             | create | (Descartado) Não criado — decisão de refinamento: apenas agente + comando.                    |
| `scripts/cto-audit/scan-secrets.mjs`            | create | Varredura mecânica de segredos (Node puro).                                                   |
| `scripts/cto-audit/check-env.mjs`               | create | Consistência env vars código vs. `.env.example`/schema.                                       |
| `.gitignore`                                    | modify | Adicionar `.cto-audit/`.                                                                      |
| `.cto-audit/`                                   | create (runtime) | Artefatos de auditoria (gitignored).                                                  |

### Dependências

- Node.js (runtime dos scripts) — já presente.
- Ferramentas existentes: eslint, tsc, vitest, prettier — já na stack.
- Reutiliza `audit-slices.mjs` da skill `refactor-vertical-slices` (sem duplicar).
- Nenhuma nova dependência de produção.

### Componentes de UI

N/A — ferramenta de desenvolvimento, sem UI.

## Plano de implementação

### Etapa 1: Estrutura e gitignore

- Criar diretório `.cto-audit/` no `.gitignore`.
- Criar estrutura `.agents/skills/cto-audit/` (se skill for usada).

### Etapa 2: Agente CTO

- Escrever `.opencode/agents/cto-auditor.md` com:
  - Frontmatter (description, mode: subagent, permissions: read/glob/grep/shell allow; write/edit allow com instrução restritiva).
  - Persona CTO e princípios (risco primeiro, evidência obrigatória, não inventar).
  - Fases 0–9 (preflight, contexto, inventário, gates, segredos, redundância, config, arquitetura, testes, auto-fix, relatório).
  - Formato de saída JSON/markdown estrito.
  - Mascaramento de segredos.

### Etapa 3: Comando

- Escrever `.opencode/commands/cto-audit.md` com parâmetros e exemplos de uso.

### Etapa 4: Scripts auxiliares

- `scan-secrets.mjs`: varredura de padrões de segredos em arquivos rastreados (excluindo node_modules/dist), com allowlist de falsos positivos documentados.
- `check-env.mjs`: compara env vars referenciadas (process.env / import.meta.env) com `.env.example` e com validação em `packages/env`.

### Etapa 5: Documentação

- Atualizar `.docs/AGENTS.md` (tabela de agentes/comandos) se aplicável.
- Criar smoke test documentado (rodar `/cto-audit --no-fix` e validar relatório).

### Etapa 6: QA

- `npm run lint`, `npm run check-types` nos arquivos novos.
- Smoke test: executar auditoria e verificar relatório.

## Riscos e ressalvas

| Risco                                                      | Probabilidade | Impacto | Mitigação                                                                                           |
| ---------------------------------------------------------- | ------------- | ------- | --------------------------------------------------------------------------------------------------- |
| Falsos positivos em segredos (ex.: hashes de teste)        | high          | medium  | Allowlist documentada; achados de segredos exigem confirmação manual antes de auto-fix; severidade `blocker` apenas com evidência forte. |
| Auto-fix quebra build/testes                               | medium        | high    | Lista branca restrita; reexecução de gates; rollback automático em falha.                            |
| Auditoria lenta (gates completos)                          | medium        | low     | Flags para pular gates pesados (`--skip-build`); default roda lint+check-types+test.                  |
| Divergência doc↔código registrada como achado indefinidamente | medium     | low     | Achado de divergência exige referência ao ADR/spec; recomendação aponta para `refine-spec`, não edição de doc. |
| Escopo muito amplo (agente "faz tudo")                     | high          | medium  | Categorias selecionáveis via `--categories`; padrão cobre as 5 categorias escolhidas.                 |
| Mascaramento insuficiente de segredos no relatório         | low           | high    | Regra RNF-01 + revisão de saída do agente; nunca incluir valor completo.                             |

## Referências

- `.docs/AGENTS.md`, `.docs/ARCHITECTURE.md`, `.docs/DEVELOPMENT.md`, `.docs/QA.md`, `.docs/RULES.md`
- `.adrs/README.md` e ADRs vigentes (0004, 0005, 0006, 0007, 0014, 0015)
- `.specs/000-foundation.md`, `.specs/010-experts-agents.md`
- `.opencode/agents/code-reviewer.md` (modelo de agente read-only)
- `.agents/skills/refactor-vertical-slices/` (modelo de auditoria + script mecânico)
- `.agents/skills/create-spec/SKILL.md`