# Desenvolvimento

## Princípios

- **DRY** — Não duplicar lógica; extrair para utilitários ou para `src/modules/shared`.
- **Clean Code** — Nomes descritivos, funções pequenas, responsabilidade única.
- **SOLID** — Aplicar conforme o contexto, sem rigidizar casos simples.
- **TDD** — Escreva o teste antes da implementação. Ao final de cada mudança, os testes devem cobrir o comportamento entregue.

## Arquitetura em camadas

Aplicada em `apps/api` e, quando houver lógica de domínio, no cliente.

| Camada           | Responsabilidade                                         | Não deve conter                |
| ---------------- | -------------------------------------------------------- | ------------------------------ |
| `domain`         | Entidades, regras de negócio, serviços de domínio        | Dependências de framework, I/O |
| `application`    | Casos de uso; orquestra domínio e interfaces             | Detalhes de implementação      |
| `infrastructure` | Repositórios concretos, mensageria, filas, clientes HTTP | Regras de negócio              |
| `interface`      | Endpoints, request handlers, controllers, HTTP           | Regras de negócio              |

A regra que sustenta o desenho: **dependências apontam para dentro**. `domain` não importa de `infrastructure` nem de `interface`.

## Vertical slices

Fatie a aplicação por domínio de negócio, não por camada técnica. Cada fatia é autossuficiente.

Domínios previstos para este produto (ver [BUSINESS.md](./BUSINESS.md)):

- `agents` — Agentes de IA e suas especializações
- `connectors` — Conectores com Notion, Google Drive, Jira, etc.
- `organizations` — Empresas e seus tenants
- `conversations` — Interações com os agentes
- `billing` — Planos e cobrança
- `auth` — Autenticação e autorização

Estrutura alvo por fatia:

```
src/modules/{domain}/
├── domain/
├── application/
├── infrastructure/
├── interface/
└── {domain}.module.ts
```

Módulo compartilhado: `src/modules/shared` para código usado por mais de um domínio.

## Convenções de código

- **TypeScript strict** — Tipar props, retornos e variáveis explicitamente. `strict: true` e `noUncheckedIndexedAccess` vêm de `@repo/typescript-config`.
- **ESLint** — Regras via `@repo/eslint-config`. Zero warnings (`--max-warnings 0`).
- **Prettier** — Formatação automática em `**/*.{ts,tsx,js,mjs,json,md}`, com as exclusões de `.prettierignore` (build, `node_modules`, `package-lock.json` e `AGENTS.md`).
- **Componentes** — Funções nomeadas exportadas, não arrow functions anônimas expostas.
- **Nomenclatura** — `kebab-case` para arquivos, `PascalCase` para componentes, `camelCase` para funções e variáveis, `SCREAMING_SNAKE` para constantes.
- **Imports** — Aliases de pacote (`@repo/ui`, `@repo/eslint-config`); caminho relativo apenas dentro do mesmo módulo.

## Acessibilidade (a11y)

Todos os componentes e UIs devem ser acessíveis.

- Elementos semânticos antes de `div` com `role`
- `alt` em toda imagem; `alt=""` em imagens decorativas
- Foco visível e ordem de tabulação coerente
- Navegação completa por teclado, incluindo modais e menus
- Contraste mínimo WCAG AA (4.5:1 para texto, 3:1 para texto grande e bordas de componentes interativos)
- Anúncios de mudança de estado dinâmico via `aria-live`

## Responsividade

Todos os componentes e UIs devem ser responsivos.

- Mobile-first por padrão
- Validar em mobile (< 768px), tablet (768–1279px) e desktop (≥ 1280px)
- Sem largura fixa em containers; preferir `max-width` com unidade relativa
- Tabelas devem ter comportamento definido para telas estreitas (scroll horizontal ou stacked rows)
- Testar com zoom de 200%

## Idioma

- Todo texto de interface, identificador de código, comentário, mensagem de erro da API e template de e-mail em **en-US**.
- Specs e documentação do repositório permanecem em **pt-BR**.

## Testes

| Tipo       | Ferramenta | Onde                                             | Foco                                      |
| ---------- | ---------- | ------------------------------------------------ | ----------------------------------------- |
| Unit       | Vitest     | `packages/*`, `src/modules/*`, `apps/app/src/**` | Regras de domínio e casos de uso isolados |
| Integração | Vitest     | `src/modules/*`                                  | Caso de uso com repositório mockado       |
| E2E        | Playwright | `apps/app`, `apps/api`                           | Fluxos críticos do usuário pela interface |

Regras:

- Cobertura obrigatória para `domain` e `application`
- Nenhum sleep fixo em teste E2E; esperar por condição observável
- E2E deve poder rodar com a aplicação subindo automaticamente, sem `dev` manual

## Observabilidade

Instrumentação é requisito desde o primeiro dia, não item de backlog.

- Logs estruturados em JSON, com `requestId` e `userId` quando aplicável
- Erros de fronteira (HTTP, filas, conectores) sempre logados com contexto completo
- Propagação de `requestId` do cliente à API e serviços downstream
- Métricas de negócio nos caminhos críticos
- Stack LGTM local via Docker Compose e deploy na Vercel

## Estrutura de um app

```
apps/{app}/
├── src/
│   ├── routes/        # Telas por rota
│   ├── shared/        # api-client, query-client, tipos
│   ├── components/    # Componentes locais
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

Para o app da fundação (`apps/app`), a estrutura entregue é:

```
apps/app/
├── src/
│   ├── modules/auth/
│   │   ├── AuthProvider.tsx
│   │   └── auth-storage.ts
│   ├── routes/
│   │   ├── home-placeholder.tsx
│   │   ├── require-auth.tsx
│   │   ├── sign-in-page.tsx
│   │   └── status-page.tsx
│   ├── shared/
│   │   ├── api-client.ts
│   │   └── query-client.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Versionamento

- [Semantic Versioning](https://semver.org) para pacotes publicados
- [Conventional Commits](https://conventionalcommits.org) para mensagens: `type(scope): descrição`
- Mensagens validadas por `commitlint` no hook `commit-msg` (`.husky/commit-msg`); mensagem fora do padrão bloqueia o commit
- `npm run lint:commit` valida a última mensagem; o hook é ativado pelo `npm install` (script `prepare`)
- Um commit por mudança lógica; não misturar feature com refactor no mesmo commit

## Versionamento da API

- Toda rota de negócio fica sob o prefixo global `/api/v1`; auth fica em `/api/v1/auth/*`.
- Health check operacional pode permanecer em `/health` (fora do prefixo).
- Erros seguem o formato padronizado `{ error: { code, message, fields?, requestId } }`.
