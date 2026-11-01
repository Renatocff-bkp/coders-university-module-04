---
name: feature-concept
description: Deep-dive questioning skill that stress-tests plans and specs through systematic inquiry before implementation. Use when refining requirements, validating designs, or converting plans into actionable steps. Triggers on "feature concept", "refine spec", "stress test plan", or when a spec needs validation before coding.
---

# Feature Concept

Skill de interrogatório profundo para stress-testar planos e designs através de questionamento sistemático antes de qualquer implementação.

## Quando usar

- Antes de implementar qualquer feature ou mudança significativa
- Quando um plano ou spec precisa de validação e refinamento
- Quando há ambiguidade nos requisitos que precisa ser resolvida
- Como parte do fluxo da skill `implement-me`

## Princípios

1. **Uma pergunta por vez** — Nunca faça múltiplas perguntas na mesma mensagem
2. **Perguntas profundas** — Vá além do óbvio; explore edge cases, dependências e implicações
3. **Recomende respostas** — Para cada pergunta, sugira uma resposta baseada no contexto do projeto
4. **Explore o codebase** — Antes de perguntar, leia arquivos relevantes para fazer perguntas informadas
5. **Não implemente** — Esta skill apenas pergunta e refina; a implementação é responsabilidade de outra skill
6. **Checkpoint após cada resposta** — Confirme o que entendeu antes de avançar para a próxima pergunta

## Fluxo

### 1. Contexto inicial

Antes de começar a fazer perguntas:

1. Leia `.docs/AGENTS.md` para entender as regras do projeto
2. Leia `.docs/ARCHITECTURE.md` para entender a estrutura
3. Leia `.docs/BUSINESS.md` para entender o domínio
4. Leia `.docs/DEVELOPMENT.md` para entender as convenções
5. Explore arquivos relevantes no codebase relacionados ao tema

### 2. Rodadas de perguntas

Para cada rodada:

1. **Analise** o que já foi dito e o que ainda é ambíguo
2. **Identifique** a próxima pergunta mais importante (a que mais reduz incerteza)
3. **Formule** a pergunta de forma clara e específica
4. **Recomende** uma resposta baseada no seu conhecimento do projeto
5. **Aguarde** a resposta do usuário antes de avançar

### 3. Estrutura de perguntas

Organize as perguntas em categorias (na ordem apropriada para o contexto):

| Categoria      | Exemplos de perguntas                                              |
| -------------- | ------------------------------------------------------------------ |
| **Escopo**     | O que está dentro/fora? Quais os limites?                          |
| **Dados**      | Quais dados são necessários? De onde vêm? Como são transformados?  |
| **UI/UX**      | Como o usuário interage? Quais estados possíveis?                  |
| **Técnica**    | Quais componentes? Quais dependências? Quais restrições?           |
| **Edge cases** | O que acontece em erro? E se estiver vazio? E se for muito grande? |
| **Integração** | Como se conecta com o que já existe? Quais APIs?                   |
| **QA**         | Como será testado? Quais critérios de aceite?                      |

### 4. Consolidação

Após cada 3-4 perguntas (ou quando sentir que entendeu o suficiente):

1. **Resuma** o que foi decidido até agora
2. **Liste** pontos ainda em aberto (se houver)
3. **Confirme** com o usuário se o entendimento está correto
4. **Continue** com mais perguntas ou finalize se tudo está claro

### 5. Output final

Ao final do interrogatório, apresente:

```markdown
## Consenso alcançado

### Decisões

- [Lista de decisões tomadas]

### Plano de ação

- [Lista ordenada de passos para implementação]

### Riscos e ressalvas

- [Pontos de atenção, trade-offs aceitos]

### Critérios de aceite

- [Como saber que a implementação está correta]
```

## Regras

- **Nunca implemente código** — Apenas pergunte e refine
- **Seja específico** — "Como o usuário faz login?" em vez de "Como funciona auth?"
- **Use o contexto** — Referencie arquivos, componentes e padrões existentes
- **Adapte-se** — Se o usuário disser "não sei", ofereça opções para escolher
- **Mantenha o ritmo** — Não faça mais de uma pergunta por mensagem
- **Documente** — Salve o consenso final em `.docs/plans/{feature-name}-plan.md` se apropriado
