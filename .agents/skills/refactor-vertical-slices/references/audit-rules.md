# Catálogo de violações da auditoria

O script `scripts/audit-slices.mjs` cobre o que é mecânico. O agente de auditoria
confirma cada achado no código e acrescenta os julgamentos (`J-*`), que nenhum
regex resolve. Não invente violação para "fechar" o relatório: falso positivo
registrado como falso positivo é melhor que refatoração sem causa.

## Severidades

| Severidade | Significado                                                                     | Entra na execução?       |
| ---------- | ------------------------------------------------------------------------------- | ------------------------ |
| `blocker`  | Quebra a direção de dependência ou o contrato central (handler/use case/porta). | Sempre                   |
| `major`    | Contrato importante: nomenclatura, teste obrigatório, wiring.                   | Padrão                   |
| `minor`    | Consistência e legibilidade; risco baixo.                                       | Só com `--include-minor` |
| `info`     | Observação ou falso positivo provável.                                          | Nunca automaticamente    |

## Regras mecânicas (script)

| ID       | Severidade | Detecta                                                            | Correção                                                                                              |
| -------- | ---------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| ARCH-01  | minor      | Arquivo solto no root da slice, fora de módulo/tokens/testing.     | Mover para a camada correta.                                                                          |
| DEP-01   | blocker    | `domain` importa framework, `shared`, outra camada ou outra slice. | Remover a dependência; declarar porta em `domain`.                                                    |
| DEP-02   | blocker    | `application` importa `infrastructure`.                            | Porta no domínio + token; adapter injetado no módulo.                                                 |
| DEP-03   | blocker    | `application` importa `interface`.                                 | Use types próprios do use case.                                                                       |
| DEP-04   | minor      | `application` importa biblioteca externa além de `@nestjs/common`. | Isolar I/O atrás de porta; `@nestjs/common` só Injectable/Logger.                                     |
| DEP-05   | blocker    | `infrastructure` importa `application`.                            | Adapter implementa porta; não chama use case.                                                         |
| DEP-06   | blocker    | `infrastructure` importa `interface`.                              | Inverter: adapter depende só de `domain`.                                                             |
| DEP-07   | blocker    | `interface` importa `infrastructure`.                              | Handler fala com use case; repositório sobe para o use case.                                          |
| DEP-08   | minor      | `interface` importa `domain` (fora de DTO).                        | Permitido só para tipos/erros de mapeamento HTTP. Se injetou repo/serviço, virar blocker manualmente. |
| DEP-09   | major      | Handler importa outro handler.                                     | Extrair constante/utilitário para arquivo próprio da interface.                                       |
| SLICE-01 | blocker    | Import relativo direto para outra slice.                           | Mover para `shared` ou expor API pública via módulo.                                                  |
| IF-01    | major      | Handler com sufixo `.controller.ts` (nome legado).                 | Renomear para `{ação}.handler.ts`.                                                                    |
| IF-02    | blocker    | Mais de um `@Controller` no mesmo arquivo.                         | Separar em um arquivo/classe por endpoint.                                                            |
| IF-03    | blocker    | Handler sem exatamente uma rota HTTP.                              | Split por ação; uma classe, um endpoint.                                                              |
| IF-04    | minor      | Classe de handler sem sufixo `Handler`.                            | Renomear a classe (e imports).                                                                        |
| IF-05    | info       | Método da rota não se chama `execute`.                             | Padronizar `execute()`; avaliar custo em testes.                                                      |
| UC-01    | blocker    | Handler injeta 0 ou 2+ use cases.                                  | Criar o use case do fluxo ou separar o endpoint.                                                      |
| UC-02    | blocker    | Handler injeta qualquer dependência além do use case.              | Mover para use case ou interceptor/guard/pipe.                                                        |
| UC-03    | blocker    | Arquivo `*.use-case.ts` sem exatamente uma classe `*UseCase`.      | Um fluxo por arquivo/classe.                                                                          |
| UC-04    | major      | Use case sem `execute()`.                                          | Expor `execute(input): Promise<output>`.                                                              |
| UC-05    | blocker    | Use case lança exceção HTTP do Nest.                               | Lançar erro de domínio; handler traduz.                                                               |
| UC-06    | blocker    | Use case usa `@Controller/@Body/@Req/@Res/@Query/@Param`.          | Remover acoplamento de transporte.                                                                    |
| UC-07    | major      | Classe `*UseCase` fora de `*.use-case.ts`.                         | Renomear arquivo ou mover a classe.                                                                   |
| PORT-01  | info       | Classe em `infrastructure` sem `implements` de porta.              | Implementar a interface de `domain` quando for adapter de porta.                                      |
| TEST-01  | major      | `application/*.use-case.ts` sem teste irmão.                       | Escrever teste do fluxo com fakes antes de mexer no handler.                                          |
| TEST-02  | major      | Handler sem teste HTTP irmão e sem menção em nenhum teste da API.  | Cobrir status/erro/validação com supertest.                                                           |
| WIRE-01  | major      | Classe de handler/use case não aparece no `{slice}.module.ts`.     | Registrar em `controllers`/`providers`.                                                               |
| WIRE-02  | blocker    | Slice sem `*.module.ts`.                                           | Criar composition root da slice.                                                                      |

## Regras de julgamento (agente)

| ID   | Severidade sugerida | O que olhar                                                                                       |
| ---- | ------------------- | ------------------------------------------------------------------------------------------------- |
| J-01 | blocker             | Handler com regra de negócio: `if` de domínio, cálculo, decisão de status por estado de entidade. |
| J-02 | blocker             | Handler acessando banco/rede/SDK direta ou indiretamente via serviço injetado.                    |
| J-03 | blocker             | Use case com detalhe de infraestrutura: SQL, Drizzle, SMTP, fetch, `process.env`, filesystem.     |
| J-04 | major               | Slice duplicando regra que já existe em outra slice (candidata a `shared` ou domínio próprio).    |
| J-05 | major               | Porta inexistente: application/infrastructure dependem de classe concreta ou SDK sem interface.   |
| J-06 | major               | Domínio anêmico: entidade só com getters e toda regra no use case. Avaliar com cuidado.           |
| J-07 | major               | DTO/validação repetindo regra de domínio de forma divergente (ex.: dois mínimos de senha).        |
| J-08 | minor               | Nomes fora do padrão do projeto (arquivo, classe, token, método).                                 |
| J-09 | minor               | Teste de interface acoplado a detalhe interno em vez do contrato HTTP.                            |
| J-10 | minor               | Código morto, arquivo duplicado, comentário desatualizado deixado pela refatoração.               |
| J-11 | info                | Slice sem infraestrutura (não é violação).                                                        |
| J-12 | info                | Adapter nomeado `*.repository.ts`/`*.service.ts` (não é violação; consistência do projeto).       |

## Evidência mínima por achado

Todo achado no `audit.md` precisa de:

- ID da regra e severidade;
- caminho do arquivo (e linha quando o script fornecer);
- trecho ou explicação objetiva do que viola;
- por que importa (qual dependência/contrato quebra);
- correção proposta em uma frase;
- classificação `confirmado` ou `falso positivo`.

Achado sem evidência não entra no plano.

## Falsos positivos comuns

- `auth-session.controller.ts` importando `domain/auth-user` para montar a
  resposta: o import é aceitável; o problema é injetar `AuthUserRepository`.
- `ping.controller.ts` importando `domain/ping-result`: aceitável; o problema é
  injetar `MetricsService` no handler.
- `reset-password.dto.ts` importando constante de política de `domain`: aceitável.
- `health`/`ping` sem `infrastructure`: aceitável.
- Teste em `src/app.test.ts` cobrindo `/health` ou `/ping`: conta como cobertura
  HTTP da slice, mesmo sem teste colocado ao lado do handler.

## Ordem de correção recomendada

1. Fluxo sem use case → criar use case + teste, sem tocar no handler ainda.
2. Handler com dependência extra → mover a responsabilidade para o use case ou
   para um interceptor/guard.
3. Renomear handler/classe/arquivo/teste → mecânico, um commit por slice se
   ajudar a revisão.
4. Corrigir direção de dependência → porta + adapter + wiring.
5. Wiring e testes de integração → fechar o contrato.
6. Menores (nomes, imports de domínio na interface) → só com autorização.
