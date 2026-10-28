# [Nome da Feature]

## Metadado

| Campo         | Valor                                            |
| ------------- | ------------------------------------------------ |
| Status        | `draft` / `refined` / `approved` / `implemented` |
| Prioridade    | `low` / `medium` / `high` / `critical`           |
| Criado em     | YYYY-MM-DD                                       |
| Atualizado em | YYYY-MM-DD                                       |
| Responsável   | [nome]                                           |

## Resumo

[Uma frase que descreve o que esta spec implementa e por quê]

## Contexto

[Por que esta feature é necessária? Qual problema ela resolve? Referencie documentos de negócio ou decisões anteriores se relevante.]

## Escopo

### Dentro do escopo

- [Item 1]
- [Item 2]

### Fora do escopo

- [Item explicitamente excluído]
- [Item explicitamente excluído]

## Requisitos funcionais

| ID    | Requisito | Descrição             |
| ----- | --------- | --------------------- |
| RF-01 | [Nome]    | [Descrição detalhada] |
| RF-02 | [Nome]    | [Descrição detalhada] |

## Requisitos não-funcionais

| ID     | Requisito      | Descrição                     |
| ------ | -------------- | ----------------------------- |
| RNF-01 | Performance    | [Ex: Carregar em < 2s]        |
| RNF-02 | Acessibilidade | [Ex: WCAG AA]                 |
| RNF-03 | Responsividade | [Ex: Mobile, tablet, desktop] |

## Critérios de aceite

- [ ] [Condição verificável 1]
- [ ] [Condição verificável 2]
- [ ] [Condição verificável 3]

## Impacto técnico

### Arquivos afetados

| Arquivo           | Ação                           | Descrição    |
| ----------------- | ------------------------------ | ------------ |
| `caminho/arquivo` | `create` / `modify` / `delete` | [O que muda] |

### Dependências

- [Biblioteca ou spec que precisa existir antes]
- [Outra dependência]

### Componentes de UI

| Componente | Origem            | Uso            |
| ---------- | ----------------- | -------------- |
| `Button`   | `@repo/ui/button` | [Como é usado] |
| `Card`     | `@repo/ui/card`   | [Como é usado] |

## Plano de implementação

### Etapa 1: [Nome]

[Descrição do que fazer nesta etapa]

```bash
# Comandos necessários
```

### Etapa 2: [Nome]

[Descrição do que fazer nesta etapa]

## Riscos e ressalvas

| Risco       | Probabilidade             | Impacto                   | Mitigação      |
| ----------- | ------------------------- | ------------------------- | -------------- |
| [Descrição] | `low` / `medium` / `high` | `low` / `medium` / `high` | [Como mitigar] |

## Referências

- [Link ou referência a docs, ADRs, ou outras specs]
