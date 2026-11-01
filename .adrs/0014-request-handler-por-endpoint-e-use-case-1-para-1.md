# 0014. Request handler por endpoint e use case 1:1

- **Status:** proposed
- **Data:** 2026-11-01
- **Decisores:** Renato Figueredo
- **Spec:** Refatoração arquitetural da API (skill `refactor-vertical-slices`)

## Contexto

A API já usa vertical slices com `domain`, `application`, `infrastructure` e
`interface` (ADR-0004 e `.docs/DEVELOPMENT.md`). Na prática, porém, os limites
entre essas camadas variaram: handlers injetam repositórios e serviços técnicos,
erros de domínio e exceções HTTP se misturam, e a nomenclatura `*.controller.ts`
não expressa que cada endpoint é um caso de uso próprio.

Sem um contrato explícito, cada feature nova repete a divergência e a auditoria
vira interpretação. O objetivo é tornar o padrão verificável mecanicamente:
request handler por endpoint, um use case por fluxo, dependências apontando para
dentro e portas no domínio.

## Decisão

- A camada `interface` adota o **request handler pattern**: cada endpoint tem uma
  classe própria em `interface/{ação}.handler.ts`, com nome `{Ação}Handler`, um
  único `@Controller` e exatamente uma rota HTTP.
- O handler expõe um único método público `execute` e injeta **exatamente um**
  `*UseCase`; nada além dele. Métricas, logging, repositórios e clientes externos
  pertencem ao use case ou a um interceptor/guard/pipe do Nest.
- A camada `application` tem **um fluxo por classe/arquivo**
  (`{fluxo}.use-case.ts`, `{Fluxo}UseCase`, `execute(input): Promise<output>`).
  Serviços de aplicação compartilhados por dois ou mais fluxos são permitidos,
  mas não substituem o use case no handler.
- `domain` permanece puro: entidades, políticas, erros tipados e **portas**. Não
  importa framework, I/O, `shared` nem outras camadas.
- `infrastructure` implementa portas de `domain` e nunca chama use case. O
  vínculo token → adapter acontece apenas no `{slice}.module.ts`.
- Dependências apontam para dentro. `interface → domain` só é aceitável para
  tipos de resposta e erros que o handler precisa mapear para HTTP; injetar
  repositório ou chamar serviço de domínio no handler é violação.
- Use cases lançam erros de domínio; a tradução para exceção HTTP e o formato
  `{ error: { code, message, fields?, requestId } }` ficam na interface.
- A refatoração preserva o contrato HTTP existente (rotas, status, corpos e
  validação). Mudança de contrato exige WU separado e aprovação.

## Alternativas consideradas

| Alternativa                                                    | Por que não foi escolhida                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Manter controllers agrupando várias rotas do mesmo recurso     | Facilita rotas irmãs, mas mistura fluxos, dificulta teste isolado e mantém o handler como ponto de acúmulo |
| Controllers finos sem use case (chamando serviços diretamente) | Menos arquivos, porém não isola o fluxo, não protege a direção das dependências e não permite portas       |
| Mediator/CQRS bus (`CommandBus`/`QueryBus`)                    | Desacopla dispatcher, mas adiciona indireção e infraestrutura que o tamanho atual da API não justifica     |
| Injeção de múltiplos use cases no mesmo handler                | Reduz classes, mas quebra o 1:1 e esconde qual fluxo pertence a qual endpoint                              |

## Consequências

### Positivas

- Contrato verificável: dá para auditar handler, use case, portas e wiring por
  script, sem interpretação.
- Cada endpoint tem um teste de integração e um fluxo de aplicação identificável.
- Regras de negócio deixam de depender de HTTP, banco ou SDK.
- Métricas/logging saem do handler e passam a viver no fluxo ou em cross-cutting
  do Nest.

### Negativas / riscos aceitos

- Mais arquivos: cada endpoint ganha handler, use case, teste e, às vezes, DTO.
- Renomear `*.controller.ts` para `*.handler.ts` gera um diff mecânico grande;
  fazer em commits separados por slice reduz o risco de revisão.
- O 1:1 pode parecer cerimônia para endpoints triviais (`health`, `ping`); a
  regra vale mesmo assim para manter o padrão uniforme.
- A migração é incremental: enquanto houver controller legado, a auditoria
  continua apontando `IF-01` até a slice ser refatorada.

## Referências

- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md) — arquitetura em camadas e vertical slices
- [ARCHITECTURE.md](../.docs/ARCHITECTURE.md) — estado alvo e decisões vigentes
- [0004-arquitetura-da-api](./0004-arquitetura-da-api.md) — API NestJS, módulos e erros
- [refactor-vertical-slices](../.agents/skills/refactor-vertical-slices/SKILL.md) — skill que aplica e audita este contrato
