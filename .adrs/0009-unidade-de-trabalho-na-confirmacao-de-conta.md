# 0009. Unidade de trabalho transacional na confirmação de conta

- **Status:** accepted
- **Data:** 2026-11-01
- **Decisores:** Renato

## Contexto

A spec [003 — Auth Confirm Account](../.specs/003-auth-confirm-account.md) exige que a confirmação marque `email_confirmed_at`, consuma o token e crie a sessão como uma única operação (RF-04). Antes desta decisão:

- `OneTimeTokenService.consume` lia o token e chamava `markUsed` de forma incondicional, fora de qualquer transação. Duas requisições concorrentes com o mesmo token podiam ambas passar.
- Os repositórios Drizzle usavam diretamente a conexão raiz, sem como participar de uma transação compartilhada entre serviços.
- `SessionService.create` revogava as sessões anteriores e criava a nova, mas nunca disparava `sendNewSessionEmail`, embora a 001 declare esse comportamento e a 004 dependa dele.

## Decisão

Criar o contrato `TransactionManager` no domínio de auth (`domain/transactions.ts`):

```ts
export interface TransactionManager {
  run<T>(work: () => Promise<T>): Promise<T>;
}
```

- A implementação Drizzle (`DrizzleTransactionManager`) guarda a transação atual em `AsyncLocalStorage` e abre `database.transaction` apenas quando não há uma aberta. Chamadas aninhadas entram na transação existente.
- Os repositórios Drizzle leem o executor do contexto (transação atual ou conexão raiz), então `OneTimeTokenService` e `SessionService` são reutilizados sem conhecer a unidade de trabalho.
- O consumo do token passa a ser condicional: `markUsedIfUnused` faz `UPDATE ... WHERE used_at IS NULL` e o serviço rejeita quando nenhuma linha é afetada.
- `SessionService.create` passa a chamar `sendNewSessionEmail` após criar a sessão. Falha do mailer é registrada com `auth.session.new_session_email_failed` e engolida; o token nunca entra no log.
- Nos testes, `InMemoryTransactionManager` tira snapshot dos repositórios falsos e restaura em caso de erro, provando o rollback sem Postgres.

## Alternativas consideradas

| Alternativa                                                          | Por que não foi escolhida                                                                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Transação aberta direto no caso de uso, passando `tx` para os serviços | Acopla `SessionService` e `OneTimeTokenService` ao Drizzle e exige duplicar os serviços para o caminho transacional.                                  |
| Só consumo condicional, sem unidade de trabalho                      | Garante o uso único do token, mas não impede estado parcial (usuário confirmado sem sessão) se a criação da sessão falhar.                            |
| Enviar o e-mail de nova sessão depois do commit (outbox)             | Exige fila ou tabela de outbox, fora do escopo desta spec. Fica registrado como evolução possível.                                                    |

## Consequências

### Positivas

- Falha em qualquer passo desfaz token consumido, `email_confirmed_at` e sessão criada, sem estado parcial (RF-04).
- Duas confirmações concorrentes do mesmo token: apenas uma afeta a linha; a outra recebe `INVALID_TOKEN`.
- `SessionService` continua sendo o único caminho para criar sessão; a 004 reutiliza a mesma regra, incluindo o e-mail de nova sessão.

### Negativas

- O e-mail de nova sessão é enviado dentro da transação, após a criação da sessão. Se o commit falhar depois do envio, a pessoa pode receber aviso de uma sessão que não existiu. Preferimos isso a bloquear a confirmação ou perder o aviso quando o mailer falha.
- `AsyncLocalStorage` depende de propagação de contexto assíncrono. Cada novo ponto de entrada que queira participar da transação precisa passar por `TransactionManager.run`.

### Neutras / riscos aceitos

- O `InMemoryTransactionManager` simula rollback por snapshot; não prova o comportamento do Postgres. A cobertura real de transação fica para teste de integração quando a infraestrutura estiver disponível.
- Envio de e-mail dentro de transação mantém a conexão ocupada durante a chamada ao provedor. Aceito para o volume atual.

## Referências

- [Spec 003 — Auth Confirm Account](../.specs/003-auth-confirm-account.md)
- [Spec 001 — Auth Foundation](../.specs/001-auth-foundation.md)
- [ADR 0007 — Autenticação própria e Bearer](./0007-auth-propria-e-bearer.md)
