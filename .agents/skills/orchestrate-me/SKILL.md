---
name: orchestrate-me
description: Orquestra a implementação de várias specs a partir de um range numérico, em paralelo, com um subagent de fundo por spec e integração em worktrees isolados. Use quando o usuário pedir "orchestrate-me", "orchestrate specs 001-010", "implemente as specs 001 a 010", "rodar specs em paralelo", "orquestrar specs" ou qualquer lote de specs. Triggers on "orchestrate-me", "orchestrate specs", "orquestrar specs", "specs em paralelo", "implementar range de specs".
---

# Orchestrate Me

Skill orquestradora para implementar **N specs de uma vez** a partir de um range numérico. O agente principal **não implementa**: ele planeja, sobe **um subagent de fundo (`general`) por spec**, cada um em um **git worktree isolado**, acompanha o progresso e integra os resultados.

Diferença em relação a `implement-me`:

- `implement-me` executa uma spec de ponta a ponta no diretório atual;
- `orchestrate-me` executa um lote, em paralelo, com isolamento por worktree e integração posterior.

## Quando usar

- "orchestrate-me 001-010"
- "implemente as specs 001 a 010"
- "rode essas specs em paralelo"
- "orquestre as specs 001, 003 e 005"
- Qualquer lote de specs aprovadas que precise virar código de ponta a ponta.

Para uma única spec, use `implement-me`.

## Argumentos

| Argumento                | Obrigatório | Padrão                           | Descrição                                                               |
| ------------------------ | ----------- | -------------------------------- | ----------------------------------------------------------------------- |
| `range`                  | Sim         | —                                | Range, lista ou spec única: `001-010`, `001..010`, `001,003,005`, `005` |
| `--mode`                 | Não         | `auto`                           | `parallel`, `waves`, `sequential` ou `auto`                             |
| `--max-parallel=N`       | Não         | tamanho do lote                  | Teto de subagents simultâneos; o restante entra em fila                 |
| `--base=<ref>`           | Não         | `HEAD`                           | Commit/branch de onde os worktrees partem                               |
| `--integration=<branch>` | Não         | `feat/orchestrate-{start}-{end}` | Branch onde os resultados são integrados                                |
| `--worktree-root=<path>` | Não         | `.orchestrate/worktrees`         | Diretório dos worktrees                                                 |
| `--keep-worktrees`       | Não         | falso                            | Não remove worktrees ao final                                           |
| `--no-push`              | Não         | falso                            | Não publica a branch de integração                                      |
| `--dry-run`              | Não         | falso                            | Só produz o plano, sem criar worktrees nem subagents                    |
| `--yes`                  | Não         | falso                            | Aprova o plano automaticamente somente se não houver bloqueios          |

### Normalização do range

1. Aceite `-`, `..` ou `:` como separador de range.
2. Aceite 1, 3 ou 4 dígitos por número; normalize para 3 dígitos (`1` → `001`, `0001` → `001`).
3. Ordene, remova duplicatas e expanda o range de forma inclusiva.
4. Resolva cada número para um arquivo em `.specs/` cujo prefixo numérico seja igual:
   - `.specs/{NNN}-*.md`, ou
   - `.specs/{NNN}-*/README.md`.
5. Ignore `_template.md`.
6. Números sem spec correspondente: liste-os e **pergunte** se devem ser pulados. Nunca invente uma spec.

## Fluxo

### 1. Carregar contexto

Leia, nesta ordem:

1. `.docs/AGENTS.md`
2. `.docs/ARCHITECTURE.md`
3. `.docs/BUSINESS.md`
4. `.docs/DEVELOPMENT.md`
5. `.docs/DESIGN_SYSTEM.md`
6. `.docs/QA.md`
7. `.docs/RULES.md`
8. Cada spec do lote, por completo, com foco em objetivo, dependências, arquivos afetados e critérios de aceite.

### 2. Pré-voo (obrigatório, antes de qualquer subagent)

Execute e registre cada item. Se um item bloqueante falhar, **pare e reporte** em vez de improvisar.

| #   | Verificação              | Como                                                                                                    | Bloqueante |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | Working tree limpo       | `git status --porcelain`                                                                                | Sim        |
| 2   | Specs existem na base    | `git cat-file -e "{base}:.specs/{arquivo}"` para cada spec                                              | Sim        |
| 3   | Status da spec           | `approved` ou `refined`; `draft` e `implemented` exigem decisão do usuário                              | Sim        |
| 4   | Grafo de dependências    | Seção `Dependências` de cada spec; classifique em `interna` (também no lote) e `externa` (fora do lote) | Não        |
| 5   | Sobreposição de arquivos | Seção `Arquivos afetados`; conte caminhos compartilhados entre specs                                    | Não        |
| 6   | Ambiente                 | `node -v`, `npm -v`, `package-lock.json`, espaço em disco, remote configurado                           | Sim        |
| 7   | Branches livres          | `git branch --list "feat/{spec}"` para cada spec                                                        | Sim        |

Por que o working tree precisa estar limpo: cada worktree é um checkout de um **commit**. Arquivos não commitados (inclusive specs novas em `.specs/`) não existem nos worktrees. Se houver mudanças pendentes, mostre `git status --short` e peça commit ou stash. Nunca faça stash/reset por conta própria.

Nunca imprima o remote com credencial embutida. Para checar remote, use `git remote` (só os nomes), não `git remote -v`.

### 3. Escolher o modo

| Situação encontrada                                        | Modo padrão  | Motivo                                                 |
| ---------------------------------------------------------- | ------------ | ------------------------------------------------------ |
| Nenhuma dependência interna entre as specs do lote         | `parallel`   | Todas partem da mesma base, sem esperar ninguém        |
| Qualquer dependência interna (`A` depende de `B` no lote)  | `waves`      | `A` só pode começar quando `B` estiver integrada       |
| Muitos arquivos compartilhados ou migrations/rotas/schemas | `waves`      | Reduz conflitos de merge e reordenação de migrations   |
| Mais de 6 specs ou recursos limitados                      | `waves`      | Limita CPU, disco e instalações simultâneas            |
| Sem suporte a subagent em background                       | `sequential` | Cai para `implement-me` por spec, informando o usuário |

`auto` aplica a tabela acima. `parallel` com dependências internas só pode ser usado com **override explícito** do usuário, depois de avisar que os dependentes vão partir de uma base sem a dependência e que os conflitos serão resolvidos na integração.

Monte as ondas: `onda(spec) = 1 + maior onda das dependências internas`. Dependências externas são consideradas satisfeitas pela base — confirme isso lendo o código, não apenas a spec.

### 4. Apresentar o plano e obter aprovação

Apresente o plano em uma tabela única e peça confirmação. Com `--yes`, apenas apresente e prossiga se não houver bloqueios.

| Spec | Título | Depende de | Onda | Branch | Worktree | Subagent |
| ---- | ------ | ---------- | ---- | ------ | -------- | -------- |

Inclua também:

- modo escolhido e justificativa;
- `max-parallel` efetivo;
- branch de integração e base;
- arquivos compartilhados que provavelmente gerarão conflito;
- números de ADR pré-alocados por spec (ver abaixo);
- o que será adiado para a integração (E2E, migrations, QA completo).

Em `--dry-run`, pare aqui.

### 5. Preparar o run

1. Garanta `.orchestrate/` no `.gitignore` do repositório. Se não estiver, adicione antes de criar o diretório de run — senão o próprio runtime aparece como working tree sujo.
2. Crie `.orchestrate/{run-id}/` com `run-id = {start}-{end}-{YYYYMMDD-HHmmss}`.
3. Crie `run.md` com metadados, plano, tabela de status e mapa `spec → sessionID`.
4. Crie `progress/{NNN}-{slug}.md` para cada spec com `Status: pending`.
5. Pré-aloque ADRs: leia `.adrs/`, descubra o próximo número e reserve **um número por spec**. O subagent só cria ADR se houver decisão arquitetural, usando **exatamente** o número reservado. Números não usados ficam reservados e são documentados em `run.md` — evita colisão entre subagents concorrentes.
6. Crie a branch de integração a partir da base: `git switch -c "{integration}" "{base}"`.
7. Para cada spec da primeira onda (ou de todas, no modo `parallel`), crie o isolamento:

```bash
git worktree add ".orchestrate/worktrees/{spec}" -b "feat/{spec}" "{base-ou-integration}"
```

8. Copie `.env` do repositório principal para cada worktree, se existir. Copie por bytes, nunca exiba o conteúdo, nunca commite.
9. Não rode `npm ci` no orquestrador: o subagent faz o setup no próprio worktree, em paralelo.

### 6. Subir os subagents

Use a ferramenta `subagent` com `agent: "general"` e `background: true`. Suba todos os subagents da fila atual **na mesma resposta**, em chamadas paralelas, respeitando `max-parallel`.

Regras de disparo:

- Um subagent por spec; nunca dois na mesma spec, branch ou worktree.
- O subagent herda o diretório de trabalho do agente principal. O prompt **precisa** dizer que o único diretório editável é o worktree e que todo comando deve usar `workdir`/caminho absoluto do worktree.
- Não use `model` override.
- Guarde o `sessionID` retornado em `run.md`; ele será usado para retomar o subagent em caso de bloqueio, falha ou conflito.

Forma da chamada (uma por spec, todas na mesma resposta para rodarem em paralelo):

```text
subagent({
  agent: "general",
  description: "Implement spec 002-auth-sign-up",
  background: true,
  prompt: "<template preenchido>"
})
```

Em `waves`, crie os worktrees da onda seguinte somente depois de integrar a onda atual.

#### Template de prompt (preencher e enviar completo)

```text
Você é o subagent responsável por implementar UMA spec de ponta a ponta.

## Identidade e isolamento

- Repositório principal (NÃO EDITE): {repo-root}
- Seu worktree (ÚNICO diretório editável para código): {worktree-path}
- Sua branch: feat/{spec}
- Spec: {repo-root}/.specs/{spec-file}
- Plano de execução: {worktree-path}/.docs/plans/{spec}-plan.md
- Arquivo de progresso (fora do worktree, mas você DEVE atualizar): {run-dir}/progress/{spec}.md
- ADR reservado: {adr-number} (use somente se houver decisão arquitetural; não escolha outro número)

Todo comando de shell deve rodar com working directory = {worktree-path}. Toda ferramenta de arquivo deve usar caminho absoluto dentro de {worktree-path}. A única exceção fora do worktree é o seu arquivo de progresso em {run-dir}/progress/{spec}.md. Nunca rode git fora do worktree. Nunca altere o repositório principal. Nunca edite outra spec nem outro plano.

## Leitura obrigatória

Leia, nesta ordem: .docs/AGENTS.md, .docs/ARCHITECTURE.md, .docs/BUSINESS.md, .docs/DEVELOPMENT.md, .docs/DESIGN_SYSTEM.md, .docs/QA.md, .docs/RULES.md, a spec acima e os arquivos de código que ela referencia.

## Autonomia

Não há usuário nesta sessão. Não use ferramentas interativas e não espere confirmação. Resolva ambiguidades com os docs, com o código existente e com o princípio mais conservador; registre cada suposição no plano e no progresso. Se faltar uma informação que só o usuário tem (credencial, integração externa, decisão de produto), marque Status: blocked, escreva a pergunta objetiva no progresso e entregue o que já fez. Nunca invente segredo, endpoint ou credencial.

## Procedimento

1. Setup: `npm ci --prefer-offline --no-audit --no-fund` no worktree (se `node_modules` ausente). Atualize o progresso com Phase: setup.
2. Plano: execute uma versão autônoma do feature-concept — explore o codebase, responda às próprias perguntas nos docs, consolide o plano em `.docs/plans/{spec}-plan.md` com etapas, riscos e critérios. Atualize Phase: plan.
3. Implementação com TDD, seguindo camadas e vertical slices de DEVELOPMENT.md e o design system. Uma mudança lógica por vez. Atualize Phase: implement.
4. Verificação local: `npm run lint`, `npm run check-types`, `npm run test`, `npm run build`, `npm run format:check`. Para reduzir tempo, valide primeiro os workspaces afetados com `npx turbo run <task> --filter=<workspace>` e depois o comando raiz. Atualize Phase: qa.
5. E2E e qualquer teste que dependa de infraestrutura compartilhada (Supabase local, portas fixas, Docker) NÃO devem ser executados aqui: escreva/atualize os testes e marque `deferred` no relatório. A execução serializada é feita pelo orquestrador na integração.
6. Não rode `npm run dev`, `infra:up`, `db:reset` nem `db:migrate` — a infraestrutura é compartilhada entre worktrees.
7. Commit(s) locais em Conventional Commits, um por mudança lógica, com a última linha exatamente `Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>`. Nunca use `--no-verify`. Não faça push, merge, rebase ou checkout de outra branch.
8. Se houver decisão arquitetural, crie o ADR no número reservado seguindo `.adrs/README.md` e cite no corpo do commit.
9. Atualize o progresso para done/failed/blocked com checkpoints, suposições, pendências e arquivos alterados.

## Limites de escopo

- Só implemente o que está na spec. Mudança de escopo exige refine-spec e aprovação humana — registre e não faça.
- Não altere `.env`, segredos, `node_modules`, artefatos de build ou arquivos de outras specs.
- Não atualize o Status da spec para implemented; isso é feito na integração.
- Não apague nem reverta trabalho alheio.

## Formato do progresso

Atualize {run-dir}/progress/{spec}.md em cada fase, mantendo este formato:

# Progress — {spec}
Status: pending | running | blocked | failed | done
Phase: setup | plan | implement | qa | commit | handoff
Updated: {ISO-8601}
Branch: feat/{spec}
Assumptions:
- ...
Blockers:
- none
Checkpoints:
- [x] contexto
- [x] plano
- [ ] implementação
- [ ] QA
- [ ] commit
Files changed:
- ...

## Relatório final (sua resposta final)

Retorne exatamente:

SPEC: {spec}
STATUS: done | blocked | failed
BRANCH: feat/{spec}
COMMITS: {hash curto + assunto, um por linha}
FILES: {N criados, N modificados} — {lista dos relevantes}
QA: lint={pass|fail} check-types={pass|fail} test={pass|fail} build={pass|fail} format={pass|fail} e2e=deferred
ADR: {número e título | n/a}
ASSUMPTIONS: {lista curta | none}
BLOCKERS: {pergunta objetiva | none}
INTEGRATION NOTES: {arquivos sensíveis, migrations, ordem, riscos de conflito | none}
```

### 7. Acompanhar o progresso

O harness não transmite streaming de subagents em background. O progresso chega por dois canais:

1. o arquivo `progress/{spec}.md`, atualizado pelo subagent;
2. a notificação de conclusão do subagent.

Leia os arquivos de progresso apenas quando:

- um subagent concluir e você for notificado;
- o usuário pedir status;
- você for iniciar a integração.

Não faça loop de espera, sleep ou polling contínuo.

A cada conclusão:

1. Leia `progress/{spec}.md` e o relatório final.
2. Atualize `run.md` (status, commits, QA, sessionID, notas de integração).
3. Informe o usuário em uma linha por spec: `{spec}: {status} — {fase/última ação}`. Não despeje o transcript.
4. Se houver vaga e specs na fila, suba o próximo subagent.
5. Em `waves`, só inicie a onda seguinte depois de **integrar** toda a onda atual (não basta concluir).

### 8. Integrar

Ordem: numérica crescente dentro de cada onda; em `waves`, uma onda por vez.

Para cada spec concluída:

```bash
git switch "feat/{spec}"
git rebase "{integration}"
git switch "{integration}"
git merge --ff-only "feat/{spec}"
```

- Conflito simples (imports, listas, rotas aditivas): resolva no orquestrador preservando a intenção das duas specs, rode as verificações dos workspaces afetados e continue o rebase.
- Conflito não trivial (mesma regra de negócio, ordem de migration, schema): **não adivinhe**. Retome a sessão do subagent daquela spec via `sessionID`, passe os arquivos em conflito e o diff da integração, e peça resolução + commit. Se o subagent não puder resolver, escale para o usuário.
- Migrations: garanta ordem cronológica/timestamps coerentes e sem colisão; renumere apenas se o projeto usar numeração sequencial.
- Spec `failed`, `blocked` ou com QA vermelho: **não integre**. Marque como `não integrada` e siga com as independentes.
- Em `waves`, dependentes de uma spec não integrada ficam `skipped (dependência falhou)` e não são disparados.

Após integrar todo o lote (ou tudo que era integrável):

1. Rode o QA completo na branch de integração, sem cache enganoso:

```bash
npm run format:check
npm run lint
npm run check-types
npm run test
npm run build
npm run test:e2e
```

Se `test:e2e` ou testes de infraestrutura não puderem rodar (Docker/Supabase indisponível), registre `blocked (infra)` com o erro real. Nunca declare `pass` sem executar.

2. Atualize o `Status` de cada spec integrada para `implemented` e `Atualizado em` para a data atual. Atualize `.docs/plans/*-plan.md` se a execução divergiu do plano.
3. Rode `/commit-and-push` na branch de integração para publicar status, planos e correções de conflito. Com `--no-push`, apenas commit e informe.
   Publicar uma vez na branch de integração mantém o histórico coeso, evita 10 branches remotas e preserva um commit por spec dentro do lote. Cada spec continua rastreável pelos commits que o subagent criou.
4. Não faça merge da branch de integração na `main` sem pedido explícito. Entregue a branch pronta para PR.

### 9. Encerrar

- Remova os worktrees integrados: `git worktree remove --force ".orchestrate/worktrees/{spec}"`, salvo `--keep-worktrees`.
- Apague branches locais já totalmente integradas. Nunca apague branch não integrada.
- Confirme que nenhuma sessão de subagent ficou órfã; liste as que não concluíram.
- Preserve `.orchestrate/{run-id}/` como auditoria (é ignorado pelo git).

## Tratamento de falhas

| Situação                         | Ação                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `blocked` por informação ausente | Agrupe as perguntas de todos os bloqueados, pergunte uma vez ao usuário, retome cada `sessionID` |
| `failed` em QA                   | Retome a mesma sessão com a saída real do erro; máximo 2 tentativas; depois escale               |
| Subagent caiu sem relatório      | Verifique o worktree e o progresso; retome a sessão ou reinicie um subagent no mesmo worktree    |
| Conflito de merge simples        | Resolva no orquestrador, preserve as duas intenções, rode QA dos workspaces afetados             |
| Conflito de merge complexo       | Retome o subagent da spec com o contexto do conflito                                             |
| Dependência falhou               | Não dispare dependentes; marque `skipped`; ofereça retry e depois reprocesse a onda              |
| Branch já existe                 | Pare e pergunte; nunca delete ou sobrescreva branch do usuário                                   |
| Spec ausente no range            | Pergunte pular ou abortar; registre no `run.md`                                                  |
| Infra compartilhada indisponível | Marque E2E/integração como `blocked (infra)`; não omita nem falsifique o resultado               |
| Sem subagent em background       | Avise e caia para `sequential` usando o fluxo de `implement-me`, uma spec por vez                |

## Regras não negociáveis

- **Um worktree e uma branch por spec concorrente.** Dois subagents no mesmo diretório corrompem o trabalho.
- **Nunca dispare `implement-me` em paralelo.** Ela não isola worktree nem branch e publica no diretório atual; para paralelismo, use este contrato de subagent.
- **Subagent nunca faz push, merge ou rebase.** Publicação é responsabilidade do orquestrador.
- **O orquestrador não implementa spec.** Ele planeja, dispara, monitora, integra e reporta.
- **Nunca pule o pré-voo.** Working tree sujo, spec ausente ou branch ocupada invalidam o lote.
- **Nunca faça polling em loop.** Reaja a notificações e a pedidos do usuário.
- **Nunca use `--no-verify`, `--force` ou `reset --hard` no repositório principal.**
- **Nunca leia nem imprima segredos.** Copie `.env` sem exibir; jamais commite.
- **Nunca declare QA verde sem executar.** `deferred` e `blocked` são resultados válidos; mentira não é.
- **Nunca integre spec com QA vermelho.** Isole o problema e siga com o que é independente.
- **Toda decisão arquitetural gera ADR** no número pré-alocado; sem colisão entre subagents.
- **Mudança de escopo passa por `refine-spec` e aprovação humana.** Subagent não redefine a spec.
- **Mantenha o usuário informado**: plano inicial, uma linha por conclusão, resumo final por spec.

## Entrega final

Apresente, conforme `.docs/RULES.md`:

| Item                   | Conteúdo                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| Resumo                 | Quantas specs foram integradas, quantas falharam/bloquearam e por quê |
| Tabela por spec        | Status, branch, commits, QA local, ADR                                |
| Integração             | Branch, ordem de merge, conflitos resolvidos e como                   |
| Decisões arquiteturais | ADRs criados, com resumo e consequências                              |
| Arquivos modificados   | Consolidado por spec ou lista completa                                |
| Bibliotecas            | Instaladas, versão e justificativa                                    |
| QA                     | Resultado de cada comando de `.docs/QA.md` na branch de integração    |
| QA manual              | Passos humanos que os comandos não cobrem                             |
| Pendências             | Specs não integradas, bloqueios, próximos passos e PR sugerido        |

## Exemplo

`orchestrate-me 001-010`

1. Resolve `001`…`010` em `.specs/`, confere status e lê `Dependências` e `Arquivos afetados`.
2. Detecta que `002` depende de `001`, `003` de `002`, e assim por diante → modo `waves`.
3. Onda 1: `001`. Ao integrar, cria `feat/orchestrate-001-010` e roda o subagent de `001`.
4. Onda 2: `002`; onda 3: `003`; e assim até `010`. Specs irmãs sem dependência entre si rodam em paralelo na mesma onda.
5. Se o usuário pedir `--mode=parallel`, avisa que todas partirão da mesma base e que os conflitos serão resolvidos na integração; só então dispara os 10 subagents de uma vez.
6. No fim, roda o QA completo na branch de integração, publica e entrega a tabela por spec.
