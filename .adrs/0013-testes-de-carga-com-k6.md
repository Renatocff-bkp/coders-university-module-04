# 0013. Testes de carga com k6, seed direto no Postgres e pools isolados

- **Status:** accepted
- **Data:** 2026-11-01
- **Decisores:** Renato (spec 007, execução pelo agente OpenCode)

## Contexto

A stack de observabilidade está pronta, mas não há tráfego repetível que produza métricas, logs e traces suficientes para validar dashboards, alertas e capacidade. Os endpoints de autenticação têm três propriedades que impedem um seed ingênuo:

1. Senhas são armazenadas como hash Bcrypt de custo 12; gerar um hash por usuário tornaria o seed lento.
2. Tokens de confirmação, reset e sessões são persistidos como SHA-256 e não podem ser recuperados do banco.
3. Sign-out, confirmação e reset consomem tokens de uso único; sign-in e reset revogam todas as sessões ativas do usuário.

O k6 não está instalado na máquina, mas Docker está. Semear pela API exigiria milhares de cadastros, chamadas de e-mail e tokens descartáveis, além de tornar a suíte lenta e dependente de SMTP.

## Decisão

A suíte roda na imagem oficial `grafana/k6`, via Docker Compose sob o profile `loadtest`, com um cenário de taxa de chegada por endpoint e três perfis: `smoke` (~30s), `load` (~9min) e `stress` (~15min, rampa até 3x).

O seed roda direto no Postgres local, em uma transação: apaga apenas usuários `k6-*@loadtest.local`, recria pools separados por cenário, gera os tokens brutos em memória e persiste seus hashes SHA-256. Um único hash Bcrypt é reutilizado por todos os usuários de teste. O arquivo `load-tests/.data/seed.json` guarda apenas os tokens brutos e as senhas de teste, fica fora do Git e é validado no init do k6 contra a capacidade do perfil escolhido.

Os pools são isolados porque as operações destrutivas não podem compartilhar usuário:

- Sign-in revoga as sessões ativas do usuário; por isso não compartilha usuário com sessões de leitura nem com sign-out.
- Reset revoga todas as sessões do usuário; por isso cada token de reset tem usuário próprio.
- Confirmação marca a conta como confirmada; cada token tem usuário próprio e não confirmado.
- Sign-out revoga apenas a sessão do token apresentado; pode reutilizar usuários, mas não tokens.
- Sessões de leitura são reutilizadas em rodízio, pois `GET /auth/session` não as consome.

Endpoints que disparam e-mail usam taxas menores. A falha de SMTP é esperada no ambiente local e já é capturada pela API; ela não invalida o teste.

## Alternativas consideradas

| Alternativa                                               | Por que não foi escolhida                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Semear pela API (sign-up, forgot, reset)                  | Milhares de requisições, e-mails e tokens; lento, dependente de SMTP e difícil de repetir                               |
| Usar a mesma conta para todos os cenários de autenticação | Sign-in e reset revogam sessões; sign-out invalidaria tokens de leitura; os cenários interfeririam entre si             |
| Instalar o k6 localmente                                  | A máquina não tem k6; Docker já está disponível e fixa a versão                                                         |
| Executor `constant-vus`                                   | A carga variaria com a latência; o objetivo é controlar iterações por segundo e observar saturação                      |
| Um único cenário misturando todos os endpoints            | Não permite taxa própria para e-mail nem diagnóstico por rota                                                           |
| Semear tokens de uso único em quantidade fixa sem validar | Uma rodada de stress esgotaria o pool no meio do teste e produziria 401/410 sem explicação                              |
| Corrigir o dashboard nesta entrega                        | O dashboard é trabalho do usuário e a divergência de labels é um achado separado; a spec 007 não altera observabilidade |

## Consequências

### Positivas

- Um comando cria dados reproduzíveis sem depender de e-mail, interface ou dezenas de milhares de hashes Bcrypt.
- Cada endpoint tem taxa, tags e checks próprios; o resumo do k6 mostra onde a latência ou o erro cresce.
- O volume gerado exercita Mimir, Loki e Tempo com métricas, logs e traces reais da API.
- A validação no init impede um teste que falharia silenciosamente por pool esgotado.

### Negativas

- O seed grava senhas de teste em texto claro em `load-tests/.data/seed.json`; o arquivo é ignorado pelo Git e restrito ao ambiente local.
- O seed depende de `pg` e `bcrypt` hoisted pela API; uma mudança futura de instalação pode exigir dependências próprias em `load-tests/`.
- Rodadas repetidas exigem reseed quando os tokens de uso único se esgotam; o custo é aceito para manter a simplicidade.
- O perfil `stress` pode saturar a máquina local e derrubar a API; é uma execução manual e separada.

### Neutras / riscos aceitos

- O SMTP local não está configurado; sign-in, confirmação, reset e sign-up pagam o custo de uma tentativa de envio que falha. As taxas são limitadas para que isso não domine a carga.
- O dashboard atual consulta `http_response_status_code`, `http_route` e `http_request_method`, enquanto as métricas da API usam `status_code`, `route` e `method`. Os painéis de erro/sucesso por status e por rota não mostrarão dados até o dashboard ser ajustado.
- Não há integração com CI nem publicação de resultados; a suíte é uma ferramenta local de investigação e demonstração.

## Referências

- [Spec 007 — Testes de carga com k6](../.specs/007-testes-de-carga-com-k6.md)
- [Plano 007](../.docs/plans/007-testes-de-carga-com-k6-plan.md)
- [ADR 0007 — Autenticação própria com Bearer](./0007-auth-propria-e-bearer.md)
- [ADR 0011 — Esqueci a senha responde antes da busca e do envio](./0011-esqueci-a-senha-sem-aguardar-envio.md)
- [Spec 006 — Auth Reset Password](../.specs/006-auth-reset-password.md)
