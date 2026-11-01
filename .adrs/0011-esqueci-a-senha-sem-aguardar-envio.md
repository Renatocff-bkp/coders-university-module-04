# 0011. Esqueci a senha responde antes da busca e do envio

- **Status:** accepted
- **Data:** 2026-11-01
- **Decisores:** Renato (spec 005)

## Contexto

`POST /api/v1/auth/forgot-password` precisa responder igual para qualquer e-mail, sem revelar se a conta existe (RF-03, RNF-01). Se a resposta esperar a busca do usuário, a emissão do token e o envio SMTP, o tempo de resposta passa a depender da existência da conta: para contas existentes, a requisição leva o tempo de um envio de e-mail; para inexistentes, só a consulta. Essa diferença de tempo é um canal de enumeração que o corpo idêntico da resposta não fecha.

## Decisão

O endpoint responde 202 assim que valida o corpo. A busca, a emissão do token e o envio do e-mail rodam em seguida, em segundo plano, dentro de `ForgotPasswordUseCase`, que captura todos os erros e os registra sem token, sem e-mail e sem id da conta.

## Alternativas consideradas

| Alternativa                               | Por que não foi escolhida                                                                                 |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Aguardar todo o fluxo antes de responder  | Cria diferença de tempo observável entre conta existente e inexistente.                                   |
| Equalizar o tempo com atraso fixo (sleep) | Frágil: o envio pode demorar mais que o atraso, e o atraso penaliza todas as requisições.                 |
| Fila persistente (outbox) com worker      | Garantia de entrega maior, mas exige infraestrutura nova (tabela de jobs, worker), fora do escopo da 005. |

## Consequências

### Positivas

- Tempo de resposta não depende da existência da conta.
- Falha de SMTP não altera a resposta nem vaza para o cliente.

### Negativas

- Se o processo cair depois do 202, o e-mail de reset se perde sem nova tentativa.
- Erros de envio não chegam ao cliente; só aparecem nos logs (`auth.forgot_password.email_failed`).

### Neutras / riscos aceitos

- Sem retry nem outbox nesta fase. Quando a infraestrutura de filas existir, a etapa de envio pode migrar para uma fila sem mudar a resposta HTTP.
- Enquanto o rate limiting não existir (fora do escopo), o endpoint pode ser usado para disparar e-mails; registrado como dívida.

## Referências

- [Spec 005 — Auth Forgot Password](../.specs/005-auth-forgot-password.md)
- [Spec 001 — Auth Foundation](../.specs/001-auth-foundation.md) (`EmailService`, tokens de uso único)
- [ADR 0009 — Unidade de trabalho na confirmação de conta](./0009-unidade-de-trabalho-na-confirmacao-de-conta.md)
