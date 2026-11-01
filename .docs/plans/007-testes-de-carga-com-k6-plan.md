# Plano de execução — 007 Testes de carga com k6

Spec: [007 — Testes de carga com k6](../../.specs/007-testes-de-carga-com-k6.md)
Branch: `feat/007-testes-de-carga-com-k6`
ADR: 0013

## Perguntas e respostas (exploração dos docs e código)

| Pergunta                                                  | Resposta                                                                                                                                                          |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Por que semear o banco em vez de usar a API?              | Bcrypt custa ~250ms por hash, tokens são SHA-256 e sign-out/confirmação/reset são de uso único. Semear pela API exigiria milhares de cadastros, e-mails e tokens. |
| Por que separar usuários por cenário?                     | `SessionService.create` revoga todas as sessões ativas do usuário. Sign-in não pode compartilhar usuário com sessões pré-semeadas. Reset também revoga tudo.      |
| Por que reutilizar tokens de sessão?                      | `GET /auth/session` só valida e atualiza `last_used_at`; não consome a sessão. 500 tokens bastam e evitam 20 mil linhas.                                          |
| Por que tokens de uso único por iteração?                 | Sign-out revoga a sessão, confirmação marca o usuário e consome o token, reset troca a senha e consome o token. Reutilizar produziria 401/410 no meio da carga.   |
| Por que `exec.scenario.iterationInTest`?                  | É único entre todas as VUs do cenário, então cada iteração pega um token distinto sem coordenação entre VUs.                                                      |
| Por que taxas por minuto?                                 | Cenários de e-mail têm taxas fracionárias (0,5/s). Declarar `timeUnit: "1m"` permite taxas inteiras e evita depender de suporte a `rate` fracionário.             |
| Por que `constant-arrival-rate` e `ramping-arrival-rate`? | Controlam iterações por tempo independentemente da latência, que é o que importa para gerar volume e medir saturação.                                             |
| Por que Docker?                                           | k6 não está instalado; Docker 29.8.0 está. A imagem oficial evita instalação local e mantém a versão fixa.                                                        |
| Como o container alcança a API?                           | `host.docker.internal:3002` com `extra_hosts: host-gateway`; `K6_API_URL` permite sobrescrever.                                                                   |
| Por que não corrigir o dashboard?                         | É trabalho do usuário (arquivo não rastreado) e está fora do escopo. A divergência de labels será reportada.                                                      |
| Como evitar seed velho?                                   | O seed apaga e recria `k6-*@loadtest.local`; o k6 valida no init se o pool cobre as iterações máximas do perfil e aborta com a instrução de reseed.               |
| E-mail pode falhar?                                       | Sim. `MAILTRAP_*` não está configurado no `.env`; o host `mailtrap-smtp.io` não resolve. A API captura a falha e responde normalmente.                            |

## Etapas

1. **Documentos** (`docs(loadtest)`): spec 007, este plano e ADR 0013; adicionar o ADR ao índice.
2. **Seed** (`feat(loadtest)`): `load-tests/seed.mjs`.
   - Carregar o `.env` da raiz com `process.loadEnvFile`; aceitar `--database-url=`.
   - Limpar `auth_users` com e-mail `k6-%@loadtest.local` (cascata em sessões e tokens).
   - Gerar um único hash Bcrypt (custo 12) e reutilizá-lo em todos os usuários.
   - Gerar tokens com `randomBytes(32).toString("base64url")` e persistir `sha256` hex.
   - Inserir em lotes de 500 dentro de uma transação.
   - Gravar `load-tests/.data/seed.json` via arquivo temporário + rename.
   - Validar o payload contra o perfil `stress` antes de gravar.
3. **Configuração** (`feat(loadtest)`): `load-tests/lib/config.js`.
   - Taxas de `load` por minuto; `smoke` = 10% (mínimo 1/min); `stress` = rampa de 0,5x a 3x em 15min.
   - Pools: 100 sign-in, 100 forgot, 25 usuários de sessão/500 tokens, 100 usuários de sign-out/10.000 tokens, 10.000 confirmações, 5.000 resets.
   - VUs pré-alocadas e máximas por cenário; thresholds por perfil.
   - `requiredSeedCounts(profile)` calcula a cota de tokens de uso único com 10% de folga e `gracefulStop`.
4. **Helpers** (`feat(loadtest)`): `lib/data.js`, `lib/http.js`, `state.js`.
   - `pick` para pools reutilizáveis; `at` para pools de uso único, com erro explícito de esgotamento.
   - `validateSeed(seed, requirements)` retorna lista de erros.
   - `SharedArray` carrega `.data/seed.json` uma vez e compartilha entre VUs.
5. **Cenários** (`feat(loadtest)`): um arquivo por endpoint em `load-tests/scenarios/`.
   - Checks de status e de corpo; tags `endpoint`.
   - Sign-up usa e-mail único por VU/iteração para forçar criação.
   - Sign-in, confirm, reset e sign-up toleram a falha de SMTP já tratada pela API.
6. **Orquestração** (`feat(loadtest)`): `main.js`.
   - Resolver `PROFILE`, validar o seed no init e exportar `options`.
   - Reexportar wrappers dos nove cenários para o campo `exec`.
7. **Integração** (`feat(loadtest)`): Compose, npm e `.gitignore`.
   - Serviço `k6` com profile `loadtest`, `working_dir: /scripts`, volume read-only e `host.docker.internal`.
   - Scripts `loadtest:seed`, `loadtest:check`, `loadtest:smoke`, `loadtest:load`, `loadtest:stress`.
   - Ignorar `load-tests/.data/`.
8. **Documentação** (`docs(loadtest)`): `load-tests/README.md`.
9. **Testes** (`test(loadtest)`): `node --test load-tests/lib/data.test.mjs`.
10. **QA**: `loadtest:check`, seed, smoke contra a API em `localhost:3002`, comandos de QA da raiz e Prettier nos arquivos novos.
11. **Observabilidade**: confirmar métricas no Mimir, logs no Loki e traces no Tempo; reportar o descasamento de labels do dashboard.

## Riscos

| Risco                                                  | Mitigação                                                                                      |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| k6 não resolve `host.docker.internal` no Linux         | `extra_hosts: host-gateway` e `K6_API_URL` documentado                                         |
| Seed de 15 mil usuários demora                         | Um único hash Bcrypt e inserts em lote; transação única                                        |
| SMTP sem DNS aumenta latência de sign-in/confirm/reset | Timeout de 30s no k6; taxas limitadas; API captura a falha                                     |
| Pool de tokens esgotado em rodada anterior             | Validação no init com mensagem para `npm run loadtest:seed`                                    |
| Stress derruba a API local                             | Perfis separados; `smoke` e `load` são o caminho normal; thresholds de stress tolerantes       |
| Dashboard sem dados por labels divergentes             | Reportar `method`, `route` e `status_code` como labels reais; não alterar o arquivo do usuário |

## Critérios

- Todos os critérios de aceite da spec 007 cobertos por teste, execução manual ou inspeção.
- Nenhum token, senha ou hash no console do seed ou no resumo do k6.
- `npm run loadtest:check` e os comandos de QA da raiz passam.
- Prettier passa nos arquivos novos e alterados.
