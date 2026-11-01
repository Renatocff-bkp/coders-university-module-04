# Testes de carga com k6

Suíte que exercita todos os endpoints da API para gerar volume de métricas, logs e traces na stack LGTM local, além de medir latência e erros sob carga.

Os testes rodam na imagem oficial `grafana/k6` via Docker. Não é necessário instalar o k6 na máquina.

## Pré-requisitos

- Dependências instaladas na raiz (`npm install`).
- Supabase local e API rodando:
  - `npm run infra:up` sobe Supabase + stack de observabilidade.
  - `npm run dev:api` inicia a API em `http://localhost:3002`.
- Docker com Compose.
- O `DATABASE_URL` da raiz (`.env`) apontando para o Postgres local do Supabase.

Confirme a API antes de rodar:

```bash
curl http://localhost:3002/health
```

## Seed

O seed cria usuários, sessões e tokens direto no Postgres. Ele apaga apenas e-mails `k6-*@loadtest.local` e recria os pools em uma transação:

```bash
npm run loadtest:seed
```

O comando grava `load-tests/.data/seed.json`, que é ignorado pelo Git. O arquivo contém as senhas e os tokens de teste em texto claro; use apenas no ambiente local.

Para apontar para outro banco:

```bash
node load-tests/seed.mjs --database-url=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

Os pools criados são:

| Pool                        | Quantidade | Uso                                            |
| --------------------------- | ---------- | ---------------------------------------------- |
| Usuários de sign-in         | 100        | Reutilizados em rodízio                        |
| Usuários de forgot-password | 100        | Reutilizados em rodízio                        |
| Usuários de sessão          | 25         | Compartilhados por 500 tokens de leitura       |
| Usuários de sign-out        | 100        | Compartilhados por 10.000 sessões de uso único |
| Usuários de confirmação     | 10.000     | Um usuário não confirmado por token            |
| Usuários de reset           | 5.000      | Um usuário confirmado por token                |

Sign-out, confirmação e reset consomem tokens de uso único. O k6 valida no início se o pool cobre as iterações do perfil escolhido. Se o teste abortar com `is exhausted` ou `needs at least`, rode o seed novamente.

Não rode o seed com um teste em andamento: a limpeza apaga os usuários que o teste está usando.

## Perfis e taxas

As taxas são declaradas por minuto nos executores de taxa de chegada. O perfil `smoke` usa 10% da carga de `load`; o `stress` começa em 50%, sobe até 3x e volta a 100%.

| Cenário           | `smoke` (30s) | `load` (9min) | `stress` (pico, 15min) |
| ----------------- | ------------- | ------------- | ---------------------- |
| `health`          | 120/min       | 1.200/min     | 3.600/min              |
| `ping`            | 240/min       | 2.400/min     | 7.200/min              |
| `sign_up`         | 3/min         | 30/min        | 90/min                 |
| `confirm_account` | 12/min        | 120/min       | 360/min                |
| `sign_in`         | 30/min        | 300/min       | 900/min                |
| `session`         | 180/min       | 1.800/min     | 5.400/min              |
| `sign_out`        | 12/min        | 120/min       | 360/min                |
| `forgot_password` | 3/min         | 30/min        | 90/min                 |
| `reset_password`  | 6/min         | 60/min        | 180/min                |
| **Total**         | **606/min**   | **6.060/min** | **18.180/min**         |

O pico do `stress` é cerca de 303 requisições por segundo. O teste pode saturar a máquina local; rode `smoke` e `load` no fluxo normal.

## Comandos

```bash
npm run loadtest:seed    # (re)cria os dados de teste
npm run loadtest:check   # testes unitários dos helpers
npm run loadtest:smoke   # ~30s, valida todos os endpoints
npm run loadtest:load    # ~9min, carga constante
npm run loadtest:stress  # ~15min, rampa até 3x
```

O Docker Compose usa o profile `loadtest`; os comandos acima já passam `--profile loadtest`.

Para rodar a imagem diretamente:

```bash
docker compose --profile loadtest run --rm -e PROFILE=smoke k6
```

## Variáveis de ambiente

| Variável      | Padrão                             | Efeito                                                                 |
| ------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| `PROFILE`     | `smoke`                            | `smoke`, `load` ou `stress`                                            |
| `K6_API_URL`  | `http://host.docker.internal:3002` | Endereço da API visto de dentro do container                           |
| `K6_RUN_ID`   | aleatório por VU                   | Prefixo dos e-mails de sign-up; útil para correlacionar                |
| `K6_NO_COLOR` | —                                  | Desliga cor no resumo; passe com `docker compose ... -e K6_NO_COLOR=1` |

No PowerShell, defina antes do comando:

```powershell
$env:K6_API_URL = "http://host.docker.internal:3002"
npm run loadtest:load
```

## O que cada cenário faz

- `health`: `GET /health`, valida `200` e `status: "ok"`.
- `ping`: `GET /api/v1/ping`, valida `200` e `message: "pong"`.
- `sign_up`: cria um usuário novo com e-mail único por VU/iteração; espera `202`.
- `confirm_account`: consome um token de confirmação; espera `200` e um token de sessão.
- `sign_in`: autentica um usuário semeado; espera `200` e um token de sessão.
- `session`: lê a sessão com um Bearer token semeado; espera `200` e o usuário.
- `sign_out`: revoga uma sessão semeada; espera `204`.
- `forgot_password`: solicita reset para um usuário semeado; espera `202`.
- `reset_password`: consome um token de reset e troca a senha; espera `204`.

Cada request leva a tag `endpoint`; o k6 adiciona `scenario` e o perfil escolhido. Use essas tags no resumo e nos resultados.

## Observabilidade

Cada request passa pela API e deve aparecer em:

- **Mimir** (`http://localhost:9009`): `http_requests_total` e `http_request_duration_seconds`, com os labels reais `method`, `route` e `status_code`.
- **Loki** (`http://localhost:3100`): logs JSON do Pino, com `requestId`, `traceId` e `spanId`.
- **Tempo** (`http://localhost:3200`): traces HTTP da API.
- **Grafana** (`http://localhost:3003`, admin/admin): dashboards provisionados.

O dashboard `api-observability.json` consulta `http_response_status_code`, `http_route` e `http_request_method`, mas as métricas da API usam `status_code`, `route` e `method`. Os painéis que filtram ou agrupam por esses labels não mostram dados até o dashboard ser ajustado. Esse descasamento está registrado no ADR 0013 e não é corrigido por esta suíte.

## E-mail e SMTP

O ambiente local não configura `MAILTRAP_*`; o host padrão `mailtrap-smtp.io` não resolve. Sign-up, confirmação, sign-in, forgot e reset tentam enviar e-mail e falham rápido. A API já captura essas falhas e responde normalmente, então o teste continua válido. Os logs de falha esperados incluem `auth.session.new_session_email_failed` e eventos de e-mail de sign-up/reset.

Se o SMTP for configurado, as taxas de e-mail continuam limitadas, mas a entrega real pode aumentar a latência desses cenários.

## Thresholds

- `smoke`: `checks > 99%`, `http_req_failed < 1%`, `p(95) < 1s`.
- `load`: `checks > 95%`, `http_req_failed < 5%`.
- `stress`: `checks > 80%`, `http_req_failed < 20%`.

Um threshold violado faz o k6 sair com código diferente de zero. Em `stress`, isso é um sinal de saturação, não necessariamente um bug da API.

## Diagnóstico

| Sintoma                                  | Causa provável / correção                                                                  |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `Seed file is not ready for profile`     | Rode `npm run loadtest:seed`; o pool de uso único não cobre o perfil                       |
| `signOutTokens is exhausted`             | Rodadas anteriores consumiram os tokens; reseed antes da próxima execução                  |
| `connection refused` ou timeout no k6    | API não está em `localhost:3002`; ajuste `K6_API_URL` ou suba `npm run dev:api`            |
| `host.docker.internal` não resolve       | Use Linux com `extra_hosts: host-gateway` (já configurado) ou defina `K6_API_URL`          |
| Latência alta em sign-in/confirm/reset   | Tentativa de SMTP sem DNS; esperado. Confira os logs da API                                |
| Seed falha com `DATABASE_URL is not set` | Preencha o `.env` da raiz ou use `--database-url=`                                         |
| Seed falha por e-mail duplicado          | Não deve ocorrer; o seed apaga `k6-*@loadtest.local` antes de inserir. Verifique o domínio |
