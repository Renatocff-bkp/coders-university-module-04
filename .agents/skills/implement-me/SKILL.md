---
name: implement-me
description: Orchestrator skill for executing specs. Loads project context, uses feature-concept to refine requirements, and implements the spec. Use when the user says "implement spec X", "execute spec X", or wants to convert an approved plan into code. Triggers on "implement", "execute spec", "run spec", or when a spec file needs to be turned into working code.
---

# Implement Me

Skill orquestradora para execução de specs. Recebe o nome de uma spec, carrega contexto do projeto, utiliza a skill `feature-concept` para refinar requisitos e executa a implementação.

## Quando usar

- Quando o usuário diz "implemente a spec X" ou "execute a spec X"
- Quando há uma spec pronta em `.specs/` que precisa ser implementada
- Quando o usuário quer converter um plano aprovado em código

## Argumentos

| Argumento   | Obrigatório | Descrição                                                  |
| ----------- | ----------- | ---------------------------------------------------------- |
| `spec-name` | Sim         | Nome do arquivo de spec (sem extensão) ou caminho relativo |

## Fluxo

### 1. Carregar contexto

Antes de executar qualquer coisa:

1. Leia `.docs/AGENTS.md` — regras e skills obrigatórias
2. Leia `.docs/ARCHITECTURE.md` — estrutura e stack
3. Leia `.docs/BUSINESS.md` — domínio e visão
4. Leia `.docs/DEVELOPMENT.md` — convenções de código
5. Leia `.docs/DESIGN_SYSTEM.md` — componentes disponíveis
6. Leia `.docs/QA.md` — critérios de verificação

### 2. Carregar a spec

1. Procure a spec em `.specs/{spec-name}.md`
2. Se não encontrar, procure em `.specs/{spec-name}/README.md`
3. Se ainda não encontrar, pergunte ao usuário onde está a spec
4. Leia a spec completa e identifique:
   - Objetivo
   - Requisitos funcionais
   - Requisitos não-funcionais
   - Critérios de aceite
   - Dependências

### 3. Feature Concept (refinamento)

Antes de implementar, execute o fluxo de interrogatório da skill `feature-concept`:

1. Explore o codebase para entender o que existe
2. Faça perguntas profundas sobre pontos ambíguos da spec
3. Consolide o entendimento em um plano de ação
4. Salve o plano refinado em `.docs/plans/{spec-name}-plan.md`
5. Confirme o plano com o usuário antes de implementar

### 4. Implementação

Com o plano aprovado:

1. **Siga as convenções** de `.docs/DEVELOPMENT.md`
2. **Use o design system** de `.docs/DESIGN_SYSTEM.md`
3. **Carregue skills relevantes** conforme o contexto (ver tabela abaixo)
4. **Implemente incrementalmente** — uma mudança lógica por vez
5. **Teste conforme avança** — execute verificações de QA periodicamente

#### Skills por contexto

| Contexto             | Skill                                                |
| -------------------- | ---------------------------------------------------- |
| UI / Componentes     | `frontend-design`, `web-design-guidelines`, `shadcn` |
| Next.js / App Router | `next-best-practices`                                |
| React / Performance  | `vercel-react-best-practices`                        |
| Banco de dados       | `supabase-postgres-best-practices`                   |
| Testes E2E           | `playwright`                                         |

### 5. Verificação final

Após implementar, execute todas as verificações de `.docs/QA.md`:

```bash
npm run lint
npm run check-types
npm run build
```

Se algo falhar, corrija antes de finalizar.

### 6. Entrega

Apresente o resumo final conforme `.docs/RULES.md`:

| Item               | Conteúdo                              |
| ------------------ | ------------------------------------- |
| Resumo             | O que foi implementado                |
| Decisões           | Racional técnico das escolhas         |
| Arquivos alterados | Lista de arquivos modificados/criados |
| Verificação        | Resultado dos comandos de QA          |
| Próximos passos    | O que pode ser melhorado ou falta     |

### 7. Publicação

Com a entrega apresentada, execute o comando `/commit-and-push`:

1. Ele analisa o diff, gera a mensagem em Conventional Commits, commita e faz push
2. Se a spec tiver etapas independentes, rode ao final de cada etapa; caso contrário, ao final da spec
3. O trailer `Co-authored-by: OpenCode Agent <opencode-agent@opencode.invalid>` é obrigatório e o comando já o inclui (domínio `.invalid`, RFC 2606, para não vincular a conta real de terceiro)
4. Sem remote configurado, informe o usuário em vez de deixar o push falhar silenciosamente

## Regras

- **Nunca pule o feature-concept** — Mesmo que a spec pareça clara, sempre refine
- **Nunca implemente sem plano aprovado** — O usuário deve confirmar o plano antes do código
- **Toda spec termina publicada** — a última ação é `/commit-and-push`; nada fica só no working tree
- **Seja transparente** — Se encontrar problemas durante a implementação, comunique
- **Mantenha o usuário informado** — Reporte progresso a cada etapa significativa
- **Documente decisões** — Se tomar decisões não previstas na spec, registre no plano

## Estrutura esperada de specs

```markdown
# [Nome da Feature]

## Objetivo

[O que e por que]

## Requisitos funcionais

- [RF1]
- [RF2]

## Requisitos não-funcionais

- [RNF1]

## Critérios de aceite

- [CA1]

## Dependências

- [Dependências técnicas ou de outras specs]
```
