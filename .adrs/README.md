# ADRs (Architecture Decision Records)

Registro das decisões arquiteturais do projeto. Um ADR por decisão, imutável após aprovação.

## Quando criar um ADR

Crie quando a resposta for **não óbvia e tiver consequência estrutural**. Na dúvida, crie.

Exemplos que exigem ADR:

- Adicionar, remover ou trocar uma tecnologia da stack
- Escolher entre duas abordagens de implementação com trade-off real
- Mudar o modelo de arquitetura (camadas, fatias, monólito para serviços)
- Definir estratégia de dados, autenticação ou segurança
- Introduzir dependência externa relevante (serviço, SDK, provedor)
- Descartar uma abordagem que alguém provavelmente tentará de novo

Exemplos que **não** exigem:

- Adicionar um componente isolado
- Corrigir bug sem mudança de estrutura
- Ajustar texto ou formatação

## Nomenclatura

`NNNN-slug-em-kebab-case.md`, numeração sequencial e crescente.

```
0001-estado-alvo-da-stack.md
0002-estrategia-de-autenticacao.md
```

Números nunca são reutilizados, mesmo que o ADR seja rejeitado ou revertido.

## Imutabilidade

Um ADR aprovado não é editado. Para mudar a decisão:

1. Crie um ADR novo com o status `accepted`
2. No novo ADR, referencie o anterior em `## Substitui`
3. Marque o anterior como `superseded by ADR-NNNN` — apenas o status e a referência, sem reescrever o conteúdo

Isso preserva o raciocínio original. Reescrever o ADR apaga o histórico de por que a decisão foi tomada e de quais alternativas foram descartadas.

## Status possíveis

| Status                   | Significado                                    |
| ------------------------ | ---------------------------------------------- |
| `proposed`               | Escrito, aguardando aprovação                  |
| `accepted`               | Vigente                                        |
| `rejected`               | Considerado e descartado — mantenha o registro |
| `deprecated`             | Não se aplica mais, sem substituto             |
| `superseded by ADR-NNNN` | Substituído por outro ADR                      |

## Template

```markdown
# NNNN. Título da decisão

- **Status:** proposed
- **Data:** YYYY-MM-DD
- **Decisores:** [quem decidiu]

## Contexto

Qual problema ou restrição motiva esta decisão. Inclua o estado atual e o que
não funciona. Escreva para quem não estava na discussão.

## Decisão

O que foi decidido, em uma ou duas frases diretas. Declare o que passa a ser
verdade, não o histórico da negociação.

## Alternativas consideradas

| Alternativa | Por que não foi escolhida |
| ----------- | ------------------------- |
| [Opção]     | [Motivo]                  |

## Consequências

### Positivas

- [Ganho concreto]

### Negativas

- [Custo, perda ou dívida aceita]

### Neutras / riscos aceitos

- [Risco conhecido e aceito explicitamente]

## Referências

- [Spec, docs ou links relacionados]
```

## Índice

| ADR                                          | Título                           | Status   |
| -------------------------------------------- | -------------------------------- | -------- |
| [0001](./0001-estado-alvo-da-stack.md)       | Estado-alvo da stack do monorepo | accepted |
| [0002](./0002-tokens-derivados-da-paleta.md) | Tokens derivados da paleta       | accepted |
| [0007](./0007-auth-propria-e-bearer.md)      | Autenticação própria com Bearer  | accepted |
