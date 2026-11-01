# 0012. Troca de senha revoga sessões na transação e avisa após o commit

- **Status:** accepted
- **Data:** 2026-11-01
- **Decisores:** Renato (lote 002–006, execução pelo agente OpenCode)

## Contexto

A spec 006 fecha a recuperação de senha. Ao trocar a senha, três efeitos precisam
ser consistentes entre si: o token de reset é consumido, o hash Bcrypt é trocado e
todas as sessões ativas são revogadas. Se uma sessão antiga continuar válida depois
de um reset, quem tinha a senha antiga mantém acesso, o que anula a finalidade do reset.

O e-mail `password_changed` é uma notificação de segurança. Se for enviado antes do
commit e a transação falhar, o usuário recebe um aviso sobre uma troca que não aconteceu.

## Decisão

A troca de senha roda em uma única transação (`TransactionManager`, ADR 0009):
consumo do token, atualização do hash e revogação de todas as sessões ativas. Qualquer
falha reverte os três efeitos.

O hash Bcrypt é calculado antes da transação, para não manter a conexão aberta durante
o custo do hash. O e-mail de aviso é enviado somente após o commit. Falha no envio é
logada sem token, senha ou e-mail, e não desfaz a troca.

## Alternativas consideradas

| Alternativa                         | Por que não foi escolhida                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Enviar o aviso dentro da transação  | Um rollback posterior deixaria um aviso sobre troca inexistente                                          |
| Calcular o hash dentro da transação | Mantém a conexão aberta por ~250 ms em cada reset                                                        |
| Revogar sessões fora da transação   | Uma falha entre a troca e a revogação deixaria sessões antigas válidas                                   |
| Manter a sessão atual após o reset  | Quem solicitou o reset pode não ser o dono da sessão ativa; a regra de sessão única (ADR 0007) prevalece |

## Consequências

### Positivas

- Nenhum estado parcial: senha nova sem revogação, ou token consumido sem troca, não ocorre.
- O aviso de segurança sempre corresponde a uma troca efetivamente commitada.

### Negativas

- O envio do aviso acontece depois da resposta de sucesso ser decidida. Uma falha de SMTP fica visível apenas em log, sem reenvio automático.

### Neutras / riscos aceitos

- O endpoint não faz login automático após o reset; o usuário entra novamente com a senha nova.

## Referências

- [Spec 006 — Auth Reset Password](../.specs/006-auth-reset-password.md)
- [ADR 0007 — Autenticação própria com Bearer](./0007-auth-propria-e-bearer.md)
- [ADR 0009 — Unidade de trabalho transacional na confirmação de conta](./0009-unidade-de-trabalho-na-confirmacao-de-conta.md)
