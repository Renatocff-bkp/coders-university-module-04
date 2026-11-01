---
name: create-spec
description: Creates a refined spec file from a user prompt. Gathers context, asks clarifying questions, and produces a complete spec in .specs/. Use when the user says "create spec for X", "write a spec", "spec this feature", or wants to turn an idea into a structured spec. Triggers on "create spec", "write spec", "spec this", "new spec", or when the user describes a feature idea that needs to be documented.
---

# Create Spec

Skill para criar uma spec refinada a partir de um prompt do usuário, coletando contexto, fazendo perguntas clarificadoras e produzindo um documento completo em `.specs/[number]-<nome>.md`.

## Quando usar

- Quando o usuário diz "crie uma spec para X" ou "escreva uma spec"
- Quando o usuário descreve uma ideia de feature que precisa ser documentada
- Quando há uma necessidade que precisa ser estruturada antes de implementar
- Quando o pedido já chega decomposto pelo `breakdown-specs`
- Como alternativa ao `feature-concept` quando o usuário quer um documento formal

Se o prompt descreve um módulo com várias features (autenticação, CRUD de várias entidades, painel admin), use `breakdown-specs` antes: uma spec única para tudo vira uma implementação impossível de revisar.

## Argumentos

| Argumento | Obrigatório | Descrição                                                      |
| --------- | ----------- | -------------------------------------------------------------- |
| `prompt`  | Sim         | Descrição da feature ou necessidade a ser transformada em spec |

## Fluxo

### 1. Carregar contexto

1. Leia `.docs/AGENTS.md` — regras e skills obrigatórias
2. Leia `.docs/ARCHITECTURE.md` — estrutura e stack
3. Leia `.docs/BUSINESS.md` — domínio e visão
4. Leia `.docs/DEVELOPMENT.md` — convenções de código
5. Leia `.specs/_template.md` — estrutura esperada

### 2. Análise inicial

A partir do prompt, identifique:

| Aspecto     | Pergunta-chave                        |
| ----------- | ------------------------------------- |
| **O que**   | Qual feature ou mudança é necessária? |
| **Por quê** | Qual problema isso resolve?           |
| **Quem**    | Quem será impactado?                  |
| **Onde**    | Onde isso se encaixa no produto?      |
| **Como**    | Existe uma abordagem técnica óbvia?   |

### 3. Perguntas clarificadoras

Faça perguntas para preencher as lacunas (uma por vez, recomendando respostas):

#### Escopo

- O que está dentro e fora do escopo?
- Existem funcionalidades similares já existentes?

#### Requisitos

- Quais são os requisitos funcionais específicos?
- Há requisitos não-funcionais (performance, acessibilidade, etc.)?

#### Critérios de aceite

- Como saberemos que a implementação está correta?
- Quais são os casos de sucesso e falha?

#### Impacto técnico

- Quais arquivos ou componentes serão afetados?
- Há dependências de outras specs ou bibliotecas?

#### Riscos

- Quais são os principais riscos?
- Há trade-offs a considerar?

### 4. Consolidação

Após coletar as respostas:

1. **Estruture** a spec seguindo o template
2. **Preencha** todos os campos com as informações coletadas
3. **Valide** se todos os campos estão completos
4. **Nomeie** o arquivo: `.specs/[number]-{feature-name-kebab-case}.md`

### 5. Revisão com o usuário

Apresente a spec criada para revisão:

```markdown
## Spec criada: {feature-name}

### Resumo

[Resumo do que foi documentado]

### Pendências (se houver)

- [Pontos que precisam de mais detalhes]

### Próximos passos

- Revisar e aprovar a spec
- Executar com `implement-me`
```

Aguarde a aprovação do usuário antes de considerar finalizada.

### 6. Salvar

Salve a spec em `.specs/[number]-{feature-name-kebab-case}.md` com status `draft` ou `refined`.

## Regras

- **Sempre use o template** — Siga a estrutura de `.specs/_template.md`
- **Seja específico** — Evite vagueza; cada requisito deve ser claro e verificável
- **Use o contexto** — Referencie arquivos, componentes e padrões existentes
- **Nomeie corretamente** — Use kebab-case para o nome do arquivo
- **Valide antes de salvar** — Garanta que todos os campos estão preenchidos
- **Não implemente** — Apenas crie o documento; a implementação é responsabilidade do `implement-me`

## Estrutura do arquivo criado

O arquivo criado deve seguir exatamente a estrutura de `.specs/_template.md`, com todos os campos preenchidos com base nas respostas coletadas.
