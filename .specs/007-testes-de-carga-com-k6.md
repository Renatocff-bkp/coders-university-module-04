# 007 — Testes de carga com k6

## Metadado

| Campo         | Valor         |
| ------------- | ------------- |
| Status        | `implemented` |
| Prioridade    | `high`        |
| Criado em     | 2026-11-01    |
| Atualizado em | 2026-11-01    |
| Responsável   | Renato        |

## Resumo

Suíte de testes de carga em k6, executada via Docker, que exercita todos os endpoints atuais da API com dados semeados no Postgres e perfis `smoke`, `load` e `stress`, gerando volume de métricas, logs e traces para a stack de observabilidade.

## Contexto

A stack LGTM local já recebe métricas, logs e traces da API, mas não existe uma forma repetível de gerar tráfego representativo. O dashboard de observabilidade fica sem dados, e não há como responder perguntas de capacidade: quantas requisições por segundo a API sustenta, onde a latência cresce, quais rotas falham primeiro e como o volume aparece no Mimir, Loki e Tempo.

Os endpoints de autenticação não podem ser exercitados apenas pela interface: senhas exigem hash Bcrypt, tokens são persistidos como SHA-256 e os tokens de confirmação, reset e as sessões de sign-out são de uso único. Semear o banco diretamente é a única forma de rodar um teste de carga repetível sem centenas ou milhares de chamadas de cadastro e sem depender de entrega real de e-mail.

O k6 não está instalado na máquina, mas o Docker está disponível. A imagem oficial do k6 é o caminho com menos atrito e mantém a suíte independente das ferramentas locais.

## Escopo

### Dentro do escopo

- Script de seed idempotente no Postgres local (Supabase) com usuários, sessões e tokens de uso único.
- Cenário k6 para cada endpoint atual:
  - `GET /health`
  - `GET /api/v1/ping`
  - `POST /api/v1/auth/sign-up`
  - `POST /api/v1/auth/confirm-account`
  - `POST /api/v1/auth/sign-in`
  - `GET /api/v1/auth/session`
  - `POST /api/v1/auth/sign-out`
  - `POST /api/v1/auth/forgot-password`
  - `POST /api/v1/auth/reset-password`
- Perfis `smoke`, `load` e `stress` com executores de taxa de chegada (`constant-arrival-rate` e `ramping-arrival-rate`).
- Validação da capacidade do seed no início do teste, com mensagem clara para reexecutar o seed.
- Serviço `k6` no `docker-compose.yml`, sob o profile `loadtest`.
- Scripts npm para seed, verificação e execução dos três perfis.
- Documentação de uso, taxas, pools e riscos.
- Testes unitários dos helpers de seleção de dados e validação do seed.

### Fora do escopo

- Alterar a API, o schema ou a stack de observabilidade.
- Corrigir o dashboard `api-observability.json`; a divergência de labels será reportada.
- Integração com CI, k6 Cloud ou publicação de resultados.
- Entrega real de e-mail; falhas de SMTP são esperadas e toleradas.
- Rate limiting, autenticação de usuários reais ou dados de produção.
- Medição formal de capacidade com isolamento de recursos (CPU, memória, rede).

## Requisitos funcionais

| ID    | Requisito            | Descrição                                                                                                                                     |
| ----- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Seed idempotente     | Remove usuários de teste (`k6-*@loadtest.local`) e recria usuários, sessões e tokens em uma transação, gravando `load-tests/.data/seed.json`. |
| RF-02 | Cobertura total      | Cada endpoint atual possui um cenário k6 próprio, com método, rota, corpo e cabeçalhos corretos.                                              |
| RF-03 | Perfis               | `smoke` roda em ~30s, `load` em ~9min com taxa constante e `stress` em ~15min com rampa até 3x a taxa de `load`.                              |
| RF-04 | Tokens de uso único  | Sign-out, confirmação e reset consomem um token distinto por iteração, indexado por `exec.scenario.iterationInTest`.                          |
| RF-05 | Pools reutilizáveis  | Usuários de sign-in/forgot e sessões de leitura são reutilizados em rodízio, sem conflito com a revogação de sessões.                         |
| RF-06 | Validação do seed    | O teste aborta no init se o pool de tokens de uso único não cobre as iterações esperadas do perfil, indicando `npm run loadtest:seed`.        |
| RF-07 | E-mail em baixa taxa | Sign-up, confirmação, sign-in, forgot e reset usam taxas menores; falha de SMTP não invalida o teste, pois a API já trata o erro.             |
| RF-08 | Execução via Docker  | A suíte roda na imagem oficial `grafana/k6`, acessando a API no host por `host.docker.internal`, com scripts npm de atalho.                   |
| RF-09 | Documentação         | `load-tests/README.md` cobre pré-requisitos, seed, perfis, comandos, pools, observabilidade e diagnóstico.                                    |

## Requisitos não-funcionais

| ID     | Requisito       | Descrição                                                                                                                         |
| ------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Observabilidade | Todo request passa pela API e gera métricas (`http_requests_total`, `http_request_duration_seconds`), logs estruturados e traces. |
| RNF-02 | Segurança       | Tokens, senhas e hashes não são impressos pelo k6 nem pelo seed; o arquivo de seed fica fora do Git.                              |
| RNF-03 | Repetibilidade  | O seed apaga e recria apenas o domínio de teste; rodar de novo restaura os pools consumidos.                                      |
| RNF-04 | Isolamento      | Nenhuma alteração em código de produção, schema, dashboard ou configuração da API.                                                |
| RNF-05 | Testabilidade   | Helpers puros são cobertos por `node:test`, sem precisar do k6 ou do banco.                                                       |
| RNF-06 | Formatação      | Arquivos novos passam no Prettier do repositório.                                                                                 |

## Critérios de aceite

- [ ] `npm run loadtest:seed` conclui contra o Supabase local e informa os pools criados.
- [ ] Rodar o seed duas vezes seguidas não falha por e-mail duplicado nem acumula usuários de teste.
- [ ] `npm run loadtest:check` passa.
- [ ] `npm run loadtest:smoke` conclui e todos os nove endpoints aparecem no resumo do k6.
- [ ] `npm run loadtest:load` e `npm run loadtest:stress` executam com as durações e taxas documentadas.
- [ ] O init falha com mensagem acionável quando o seed não tem tokens suficientes para o perfil.
- [ ] Nenhum token, senha ou hash aparece no resumo do k6 ou no console do seed.
- [ ] Os requests geram dados visíveis no Mimir, Loki e Tempo.
- [ ] `npm run lint`, `npm run check-types`, `npm run test`, `npm run test:e2e`, `npm run build` e `npm run format:check` passam.
- [ ] A divergência entre os labels do dashboard e os labels reais das métricas é reportada.

## Impacto técnico

### Arquivos afetados

| Arquivo                                          | Ação   | Descrição                                                       |
| ------------------------------------------------ | ------ | --------------------------------------------------------------- |
| `load-tests/seed.mjs`                            | create | Seed transacional, limpeza e escrita atômica do arquivo de seed |
| `load-tests/package.json`                        | create | Marca a pasta como ESM e expõe o script de teste                |
| `load-tests/main.js`                             | create | Exporta `options`, valida o seed e liga os cenários             |
| `load-tests/state.js`                            | create | Carrega o seed uma vez com `SharedArray`                        |
| `load-tests/lib/config.js`                       | create | Perfis, taxas, pools, VUs, thresholds e expectativas            |
| `load-tests/lib/data.js`                         | create | Seleção de usuários/tokens e validação do seed                  |
| `load-tests/lib/http.js`                         | create | Helpers de GET/POST, timeout e Bearer                           |
| `load-tests/lib/data.test.mjs`                   | create | Testes dos helpers puros                                        |
| `load-tests/scenarios/*.js`                      | create | Um cenário por endpoint                                         |
| `load-tests/README.md`                           | create | Guia de uso e diagnóstico                                       |
| `docker-compose.yml`                             | modify | Serviço `k6` sob o profile `loadtest`                           |
| `package.json`                                   | modify | Scripts `loadtest:*`                                            |
| `.gitignore`                                     | modify | Ignora `load-tests/.data/`                                      |
| `.docs/plans/007-testes-de-carga-com-k6-plan.md` | create | Plano de execução                                               |
| `.adrs/0013-testes-de-carga-com-k6.md`           | create | Decisão sobre k6, seed direto e perfis                          |

### Dependências

- [000 — Foundation](./000-foundation.md): API, Supabase local e stack LGTM
- [001 — Auth Foundation](./001-auth-foundation.md): Bcrypt, tokens SHA-256, sessões e `EmailService`
- Docker com Compose
- `pg` e `bcrypt` hoisted em `node_modules` pela API
- Imagem `grafana/k6:2.3.0`

### Componentes de UI

n/a — a entrega é composta por scripts, configuração e documentação.

## Plano de implementação

### Etapa 1 — Documentos

Registrar a spec, o plano de execução e o ADR 0013, com a divergência de labels do dashboard documentada como ressalva.

### Etapa 2 — Seed

Criar `load-tests/seed.mjs` com carregamento do `.env`, um hash Bcrypt reutilizado, tokens aleatórios com hash SHA-256, inserções em lote e escrita atômica de `load-tests/.data/seed.json`.

### Etapa 3 — Configuração e helpers

Definir perfis, taxas por minuto, pools, VUs, thresholds e validação de capacidade. Implementar os helpers de seleção e os testes com `node:test`.

### Etapa 4 — Cenários k6

Criar um arquivo por endpoint e montar `main.js` com os nove cenários, tags `endpoint` e checks de status/corpo.

### Etapa 5 — Integração

Adicionar o serviço `k6` ao Compose, os scripts npm e a entrada no `.gitignore`.

### Etapa 6 — Verificação

```bash
npm run loadtest:check
npm run loadtest:seed
npm run loadtest:smoke
npm run lint
npm run check-types
npm run test
npm run test:e2e
npm run build
npm run format:check
```

## Riscos e ressalvas

| Risco                                                       | Probabilidade | Impacto  | Mitigação                                                                                          |
| ----------------------------------------------------------- | ------------- | -------- | -------------------------------------------------------------------------------------------------- |
| SMTP indisponível deixa sign-in, confirmação e reset lentos | `high`        | `low`    | A API captura a falha; taxas de e-mail são limitadas e requests têm timeout de 30s                 |
| Tokens de uso único esgotam em execuções repetidas          | `medium`      | `medium` | Validação no init aborta antes do teste; README instrui a rodar o seed antes de cada rodada        |
| Revogação de sessão de sign-in afeta tokens de leitura      | `medium`      | `high`   | Pools de usuários separados por cenário; sessões de leitura não compartilham usuário com sign-in   |
| Docker no Linux não resolve `host.docker.internal`          | `medium`      | `medium` | `extra_hosts` com `host-gateway`; `K6_API_URL` permite outro endereço                              |
| Dashboard usa labels diferentes das métricas reais          | `high`        | `medium` | Fora do escopo; a divergência é reportada com os nomes reais (`method`, `route`, `status_code`)    |
| Stress satura a máquina local e derruba a API               | `medium`      | `medium` | Perfil separado, thresholds tolerantes e execução manual; `smoke` e `load` são os caminhos normais |

## Referências

- [001 — Auth Foundation](./001-auth-foundation.md)
- [004 — Auth Sign-in](./004-auth-sign-in.md)
- [005 — Auth Forgot Password](./005-auth-forgot-password.md)
- [006 — Auth Reset Password](./006-auth-reset-password.md)
- [ADR 0007 — Autenticação própria com Bearer](../.adrs/0007-auth-propria-e-bearer.md)
- [ADR 0011 — Esqueci a senha responde antes da busca e do envio](../.adrs/0011-esqueci-a-senha-sem-aguardar-envio.md)
- [DEVELOPMENT.md](../.docs/DEVELOPMENT.md)
- [QA.md](../.docs/QA.md)
