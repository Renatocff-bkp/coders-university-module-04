# 0010. Resposta distinta para conta não confirmada no login

- **Status:** accepted
- **Data:** 2026-11-01
- **Decisores:** Renato

## Contexto

A spec [004 — Auth Sign-in](../.specs/004-auth-sign-in.md) define duas respostas de falha para `POST /api/v1/auth/sign-in`:

- RF-02: credencial inválida responde **401 genérico**, sem revelar se o e-mail existe.
- RF-03: conta com senha correta mas e-mail não confirmado responde **403 `EMAIL_NOT_CONFIRMED`**, com mensagem que orienta a abrir o e-mail de confirmação.

As duas respostas são distintas por necessidade de produto: quem cadastrou a conta e perdeu o e-mail de confirmação precisa saber o que fazer. Mas a diferença cria um canal de enumeração. Um atacante que testa e-mails sem a senha continua recebendo 401 genérico, porém quem **conhece a senha** consegue distinguir "conta inexistente ou senha errada" de "conta existente e não confirmada".

A 002 e a 003 já usam a mesma estratégia no cadastro: resposta 202 genérica para não revelar contas existentes. O login não pode ser genérico no mesmo grau sem quebrar RF-03.

## Decisão

- Credencial inválida (e-mail desconhecido ou senha errada) responde **401 `INVALID_CREDENTIALS`** com a mesma mensagem, sem distinguir os dois casos.
- A verificação de confirmação só acontece **depois** de a senha bater. Conta não confirmada com senha incorreta continua recebendo 401.
- Conta não confirmada com senha correta responde **403 `EMAIL_NOT_CONFIRMED`**. Nenhuma sessão é criada e nenhum e-mail de nova sessão é enviado.
- Essa ordem (senha antes de confirmação) é obrigatória na implementação: `SignInUseCase` testa a senha, depois `emailConfirmedAt`.

## Alternativas consideradas

| Alternativa                                               | Por que não foi escolhida                                                                                                                          |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 401 genérico também para conta não confirmada             | Quebra RF-03. A pessoa não saberia que precisa confirmar o e-mail e ficaria presa, sem caminho de recuperação dentro da spec.                      |
| 403 para conta não confirmada, independentemente da senha | Enumera contas existentes para qualquer atacante, mesmo sem a senha. Pior que o canal atual, que exige a senha correta.                            |
| Reenvio automático do e-mail de confirmação no login      | Fora do escopo da 004 (reenvio manual fica para outra spec). Também abriria um canal de envio de e-mail disparado por qualquer tentativa de login. |

## Consequências

### Positivas

- Quem não conhece a senha recebe a mesma resposta para qualquer e-mail, existente ou não.
- A pessoa que cadastrou a conta recebe orientação clara para confirmar o e-mail.
- Nenhum e-mail ou sessão é disparado em tentativas de login que falham.

### Negativas

- Quem conhece a senha de uma conta descobre que ela existe e não está confirmada. Para o titular da senha, isso é esperado; para terceiros que obtiveram a senha, é um sinal adicional.
- Enumeração de contas continua possível por temporização, porque o bcrypt só roda quando o usuário existe. Mitigação prevista na spec 004 (rate limiting), fora do escopo desta entrega.

### Neutras / riscos aceitos

- A mensagem 403 é fixa e en-US, sem o e-mail informado, para não ecoar entrada do usuário.
- Se a política mudar para resposta genérica no futuro, a mudança deve ser feita por um ADR novo que substitua este, conforme [`.adrs/README.md`](./README.md).

## Referências

- [Spec 004 — Auth Sign-in](../.specs/004-auth-sign-in.md), RF-02 e RF-03
- [ADR 0007 — Autenticação própria com Bearer e sessão única](./0007-auth-propria-e-bearer.md)
- [ADR 0009 — Unidade de trabalho transacional na confirmação de conta](./0009-unidade-de-trabalho-na-confirmacao-de-conta.md)
