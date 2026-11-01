# QA

## Verificações obrigatórias

Nenhuma tarefa é considerada concluída sem que todos os comandos abaixo passem.

| Verificação | Comando                | Valida                                            |
| ----------- | ---------------------- | ------------------------------------------------- |
| Lint        | `npm run lint`         | Regras ESLint em todos os pacotes (zero warnings) |
| Tipagem     | `npm run check-types`  | TypeScript sem erros                              |
| Testes      | `npm run test`         | Testes unitários e de integração                  |
| E2E         | `npm run test:e2e`     | Testes end-to-end                                 |
| Build       | `npm run build`        | Build de produção sem erros                       |
| Formatação  | `npm run format:check` | Prettier sem divergências                         |

## Formatação

O lint não corrige. Use o script dedicado:

```bash
npm run format        # corrige todos os arquivos
npm run format:check  # apenas verifica
```

## Commits

A mensagem é validada por `commitlint` no hook `commit-msg` (husky) e precisa seguir Conventional Commits. Para validar manualmente a última mensagem:

```bash
npm run lint:commit
```

O hook é instalado pelo `npm install` (script `prepare`). Sem `npm install` após um clone, a validação local não existe.

## Execução por workspace

```bash
# Lint de um app específico
npx turbo run lint --filter=api

# Testes de um domínio específico
npx turbo run test --filter=api -- --domain agents

# Testes do cliente (app)
npx turbo run test --filter=app

# Build de um pacote
npx turbo run build --filter=@repo/ui

# Rodar sem cache, para validar de verdade
npx turbo run build --force
```

## Comandos de infraestrutura

```bash
npm run infra:up      # Sobe Supabase local + stack LGTM
npm run infra:down    # Derruba a infraestrutura local
npm run infra:logs    # Acompanha os logs da stack de observabilidade
npm run db:migrate    # Aplica migrations no banco
npm run db:reset      # Reseta o banco local e reaplica migrations
# Postgres 17 roda via Docker Compose (porta 54322); RLS validado com pgTAP via db:test
```

## Comandos de aplicação

```bash
npm run dev           # Sobe API, cliente e docs
npm run dev:api       # Só a API
npm run dev:app       # Só o cliente
```

## Ambiente de teste

```bash
npx playwright install   # Baixa browsers (necessário na primeira vez)
```

## Critérios de aceite de uma mudança

- [ ] `npm run lint` passa sem warnings
- [ ] `npm run check-types` passa sem erros
- [ ] `npm run test` passa e cobre o comportamento novo
- [ ] `npm run test:e2e` passa quando a mudança afeta fluxo de usuário
- [ ] `npm run build` passa
- [ ] Componentes novos são responsivos (mobile, tablet, desktop)
- [ ] Componentes novos são acessíveis (WCAG AA)
- [ ] Mudanças de backend emitem logs estruturados com `requestId`

## Diagnóstico

- **Lint falha com "warning" onde você esperava "error"** — o plugin `only-warn` converte erros em warnings. O build ainda falha por causa do `--max-warnings 0`. Não é falha de configuração.
- **Cache mascara erro** — rode com `--force` ou `npx turbo reset`.
- **E2E falha por porta ocupada** — o Playwright deve subir a aplicação via `webServer`; não dependa de `npm run dev` rodando junto.
