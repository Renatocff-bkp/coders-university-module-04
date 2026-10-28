---
name: refine-spec
description: Refines an existing spec file by filling gaps, clarifying ambiguities, and ensuring completeness. Use when the user says "refine spec X", "improve spec", or when a spec needs to be updated before implementation. Triggers on "refine", "improve spec", "update spec", or when a spec file is incomplete or ambiguous.
---

# Refine Spec

Skill para refinar uma spec existente, preenchendo lacunas, clarificando ambiguidades e garantindo completude antes da implementação.

## Quando usar

- Quando o usuário diz "refine a spec X" ou "melhore a spec X"
- Quando uma spec está incompleta ou ambígua
- Quando uma spec precisa ser atualizada antes da implementação
- Como parte do fluxo da skill `implement-me`

## Argumentos

| Argumento   | Obrigatório | Descrição                                                  |
| ----------- | ----------- | ---------------------------------------------------------- |
| `spec-name` | Sim         | Nome do arquivo de spec (sem extensão) ou caminho relativo |

## Fluxo

### 1. Carregar contexto

1. Leia `.docs/AGENTS.md` — regras e skills obrigatórias
2. Leia `.docs/ARCHITECTURE.md` — estrutura e stack
3. Leia `.docs/BUSINESS.md` — domínio e visão
4. Leia `.docs/DEVELOPMENT.md` — convenções de código
5. Leia `.specs/_template.md` — estrutura esperada de uma spec

### 2. Carregar a spec

1. Procure a spec em `.specs/{spec-name}.md`
2. Se não encontrar, pergunte ao usuário onde está a spec
3. Leia a spec completa

### 3. Análise de lacunas

Compare a spec com o template e identifique:

| Categoria               | O que verificar                                     |
| ----------------------- | --------------------------------------------------- |
| **Metadado**            | Status, prioridade, datas, responsável preenchidos? |
| **Resumo**              | Existe e é claro?                                   |
| **Contexto**            | Explica o porquê? Referencia o negócio?             |
| **Escopo**              | Dentro e fora do escopo definidos?                  |
| **Requisitos**          | RFs e RNFs com IDs e descrições claras?             |
| **Critérios de aceite** | Verificáveis e testáveis?                           |
| **Impacto técnico**     | Arquivos, dependências e componentes listados?      |
| **Plano**               | Etapas claras e ordenadas?                          |
| **Riscos**              | Identificados com mitigação?                        |

### 4. Refinamento

Para cada lacuna encontrada:

1. **Contextualize** — Use o codebase e docs para entender o que falta
2. **Pergunte** — Se a lacuna não puder ser preenchida com contexto disponível, pergunte ao usuário
3. **Recomende** — Sugira um valor baseado no contexto do projeto
4. **Preencha** — Atualize a spec com as informações refinadas

### 5. Validação final

Após refinar, verifique:

- [ ] Todos os campos do template estão preenchidos
- [ ] Requisitos têm IDs únicos e descrições claras
- [ ] Critérios de aceite são verificáveis
- [ ] Escopo está bem definido (dentro e fora)
- [ ] Plano de implementação é acionável
- [ ] Riscos foram identificados

### 6. Salvar e reportar

1. Salve a spec refinada no mesmo local (sobrescreva)
2. Apresente um resumo das mudanças:

```markdown
## Spec refinada: {spec-name}

### Alterações

- [Campo/lacuna preenchida 1]
- [Campo/lacuna preenchida 2]

### Pendências (se houver)

- [Item que ainda precisa de input do usuário]
```

## Regras

- **Nunca remova informação** — Apenas adicione ou esclareça
- **Mantenha o formato** — Siga a estrutura do template
- **Seja específico** — Substitua "TODO" por conteúdo real
- **Use o contexto** — Referencie arquivos, componentes e padrões existentes
- **Valide antes de salvar** — Garanta que todos os campos estão preenchidos
