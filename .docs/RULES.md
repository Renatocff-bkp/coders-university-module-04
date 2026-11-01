# Regras

## Fluxo de trabalho

1. **Entenda o contexto** — Identifique a skill aplicável antes de escrever código (ver [AGENTS.md](./AGENTS.md)).
2. **Planeje** — Escreva o plano em `.docs/plans/{spec-name}-plan.md`. Specs refinam em `.specs/`; planos registram a execução.
3. **Refine a spec** — Toda mudança de escopo passa por `refine-spec` antes de virar código.
4. **Implemente com TDD** — Teste antes da implementação.
5. **Registre as decisões** — Toda decisão arquitetural vira ADR (ver abaixo).
6. **Verifique** — Execute todos os comandos de [QA.md](./QA.md).
7. **Audite dependências** — Antes de abrir o PR, o subagent `security-deps-auditor` roda a skill `check-security-dependencys` (ver `/open-pr`). Correção de vulnerabilidade vai em commit `fix(deps)` separado; o commit da feature e a descrição do PR registram lib, advisory e versões.
8. **Abra o PR com `/open-pr`** — Único caminho para abrir PR de feature. Bloqueia em `critical` ou `high` sem correção validada.

## ADRs (Architecture Decision Records)

**Toda decisão arquitetural gera um ADR.** Isso não é opcional e não é burocracia: é o que impede o repositório de voltar a ter duas arquiteturas concorrentes sem registro.

- Um arquivo por decisão, em [`.adrs/`](../.adrs/README.md)
- Nome: `NNNN-slug-da-decisao.md`, numeração sequencial, imutável após aprovação
- Immutable: para reverter uma decisão, crie um ADR novo que a substitua. Não edite o anterior
- Convenção e template: [`.adrs/README.md`](../.adrs/README.md)
- O resumo da decisão também deve ser impresso na resposta ao usuário, não apenas registrado em arquivo

## Entrega

Ao finalizar cada tarefa, apresente:

| Item                   | Conteúdo                                                              |
| ---------------------- | --------------------------------------------------------------------- |
| Resumo                 | O que foi feito, em 2–3 frases                                        |
| Decisões arquiteturais | ADR criado, com o resumo da decisão e suas consequências              |
| Arquivos modificados   | Lista completa de arquivos criados, alterados e removidos             |
| Bibliotecas            | Lista do que foi instalado, com versão e justificativa                |
| Racionais              | Por que cada escolha foi feita, e as alternativas descartadas         |
| QA manual              | Passos para validação humana que os comandos automatizados não cobrem |
| Verificação            | Resultado de cada comando de [QA.md](./QA.md)                         |

Não omita nenhum desses itens. Se algo não se aplica, escreva "n/a" com o motivo.

## Commits

- Formato: `type(scope): descrição` ([Conventional Commits](https://conventionalcommits.org))
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`, `revert`
- A mensagem é validada por `commitlint` (`@commitlint/config-conventional`) no hook `commit-msg`; commit fora do padrão é bloqueado. Configuração em [`commitlint.config.mjs`](../commitlint.config.mjs)
- Ao final de cada spec, rode o comando `/commit-and-push` (analisa o diff, gera a mensagem, commita e publica). Para feature que vai para PR, use `/open-pr`, que inclui a auditoria de dependências
- Correção de dependência de segurança: formato `fix(deps): corrige vulnerabilidades em <libs>`, com corpo listando por achado a lib, a versão anterior → nova, a severidade, a advisory (GHSA/CVE + URL), o workspace e o tipo de dependência
- Commits produzidos por agente carregam `Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>`. O domínio `.invalid` (RFC 2606) garante que o trailer não vincule o commit a nenhuma conta real do GitHub
- Um commit por mudança lógica
- Não misture feature com refactor no mesmo commit
- Corpos com ADR referenciado quando a mudança for arquitetural

## Branches

- `main` — Principal, sempre deployável
- `feat/{spec-name}`, `fix/{slug}`, `docs/{slug}` para trabalho em andamento
- PRs descrevem a mudança, referenciam a spec e marcam os critérios de aceite atendidos

## Regra de divergência

Se a documentação e o código divergirem, **a divergência é um bug**. Não "corrija" a documentação para descobrir como o código é. Descubra por que divergiram e registre a decisão corretamente.

Erros de documentação que já ocorreram neste repositório, para não repetir:

- Listar ferramentas que não existem no `package.json` como se fossem parte da stack
- Remover da documentação decisões de arquitetura que continuam vigentes
- Apagar um requisito (exigência de ADR, de testes) apenas porque ainda não foi implementado
