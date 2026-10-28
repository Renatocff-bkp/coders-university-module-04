# Plano — 000-foundation (Etapas 1 e 2)

- **Spec:** [.specs/000-foundation.md](../../.specs/000-foundation.md)
- **ADR relacionado:** [0001 — Estado-alvo da stack](../../.adrs/0001-estado-alvo-da-stack.md)
- **Escopo desta execução:** Etapas 1 e 2 apenas
- **Data:** 2026-10-01

## Objetivo

Alinhar o tooling do monorepo à documentação (Etapa 1) e estabelecer o design system shadcn/ui sobre Tailwind (Etapa 2). Nenhuma etapa posterior será implementada.

## Diagnóstico da Etapa 1

Estado atual verificado em 2026-10-01:

| Verificação                      | Resultado                                   |
| -------------------------------- | ------------------------------------------- |
| `npx turbo run lint check-types` | 6/6 tarefas passam                          |
| `npx turbo run build`            | 2/2 tarefas passam                          |
| `npm run format --check`         | **Falha** — sem `.prettierrc`, usa defaults |

Problemas identificados:

1. **Ambiente incompatível** — Node ativo era v12.10.0 e npm v6.10.3, incompatíveis com `engines.node: ">=24"` e com workspaces (npm 7+). Resolvido pelo usuário: Node v24.15.0 e npm 11.12.1 ativos.
2. **Sem `.prettierrc`** — o script `format` roda `prettier --write` com defaults. Executá-lo reescreveu 183 arquivos sem critério de estilo definido.
3. **Script quebrado** — `packages/ui` tem `generate:component: turbo gen react-component`, mas não há generator configurado em `turbo.json`.
4. **Tasks ausentes** — `test` e `test:e2e` documentados em QA.md não existem em `turbo.json` nem em nenhum workspace.
5. **Glob de formatação incompleto** — `*.{ts,tsx,md}` ignora `.js`, `.mjs` e `.json`, que existem no repositório (eslint-config, tsconfig, package.json).

## Diagnóstico da Etapa 2

| Fato                                                         | Consequência                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `@repo/ui` exporta `./*` → `./src/*.tsx`, sem etapa de build | Componentes dependem de resolução externa; sem `dist/`                             |
| `packages/ui` sem `dependencies` de runtime além de react    | shadcn precisa de `cn()`, `cva`, `clsx`, `tailwind-merge`, `lucide-react`          |
| `apps/docs` e `apps/web` usam CSS Modules                    | Não processam as classes Tailwind dos componentes shadcn                           |
| `Button`, `Card`, `Code` são boilerplate                     | `Button` tem prop `appName` com `alert()`; `Card` tem UTM hardcoded e URL inválida |
| shadcn CLI 4.21.1 disponível                                 | Instalação via npx confirmada                                                      |

## Decisões tomadas

| Decisão                     | Escolha                                          | Motivo                                                                        |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| Configuração do Prettier    | Criar `.prettierrc`                              | Sem ela, `npm run format` reescreve o repositório inteiro a cada execução     |
| Empacotamento de `@repo/ui` | Dependências próprias + etapa de build + `dist/` | Componentes shadcn precisam ser auto-suficientes; evita retrabalho na Etapa 7 |
| Tailwind em `apps/docs`     | Adicionar agora                                  | Sem isso os componentes shadcn não renderizam corretamente                    |

## Etapa 1 — Baseline e scripts

### 1.1 Criar `.prettierrc`

```json
{
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "all",
  "printWidth": 80,
  "arrowParens": "always"
}
```

Alinhado às convenções já declaradas em `DEVELOPMENT.md`.

### 1.2 Ajustar scripts do `package.json` raiz

```json
{
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "check-types": "turbo run check-types",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "format": "prettier --write \"**/*.{ts,tsx,js,mjs,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,js,mjs,json,md}\""
  }
}
```

O glob passa a incluir `.js`, `.mjs` e `.json`, que já existem no repositório.

### 1.3 Adicionar tasks `test` e `test:e2e` ao `turbo.json`

```json
{
  "test": {
    "dependsOn": ["^build"],
    "outputs": ["coverage/**"]
  },
  "test:e2e": {
    "dependsOn": ["^build"],
    "cache": false
  }
}
```

Nenhum workspace implementa esses scripts ainda. Turborepo ignora workspaces sem o script, então as tasks ficam inativas sem quebrar `npm test`.

### 1.4 Remover script quebrado de `packages/ui`

Remover `generate:component`, que invoca `turbo gen react-component` sem generator correspondente.

### 1.5 Remover import não usado em `card.tsx`

`import { type JSX } from "react"` está presente, mas o arquivo referencia `React.ReactNode` sem importar o namespace. Prettier não detecta isso; o lint fica para a Etapa 2.

### 1.6 Verificar a Etapa 1

```bash
npx turbo run lint check-types build --force
npm run format:check
```

## Etapa 2 — Design system

### 2.1 `components.json` manual, sem `shadcn init`

O plano previa `npx shadcn init`. **Não foi feito**: o flag `--template` do `init` tenta criar um app (Next, Vite, etc.) dentro do diretório, o que está errado para uma biblioteca. O `init` também não expõe forma de escolher onde fica o CSS sem template.

O que foi feito em vez disso:

- `components.json` escrito à mão, com `style: new-york-v4` (a variante para Tailwind v4 do registry)
- `aliases` no padrão `@/components`, `@/lib`, com `paths` correspondentes no `tsconfig.json`
- `tailwindcss` instalado como devDependency

Só o `shadcn add` foi usado — que é o comando que realmente copia os componentes.

### 2.2 Mapear os tokens de `DESIGN.md` para o Tailwind

Os dez tokens pastéis de `DESIGN.md` viram variáveis CSS no tema do Tailwind, mais os tokens semânticos que o shadcn espera (`background`, `foreground`, `primary`, `muted`, `border`, `ring`, etc.).

Os tokens de `DESIGN.md` são superfícies decorativas. Para satisfazer WCAG AA em texto, os tokens semânticos de texto precisam de valores derivados com contraste suficiente — a paleta pastel pura não atinge 4.5:1 como cor de texto.

**Derivação implementada e medida** — registrada no [ADR 0002](../../.adrs/0002-tokens-derivados-da-paleta.md):

| Token                  | Valor                              | Contraste |
| ---------------------- | ---------------------------------- | --------- |
| `--foreground`         | `#242424`                          | 15,52:1   |
| `--primary`            | `#1f5673` (powder-blue escurecido) | 7,96:1    |
| `--muted-foreground`   | `#52525b`                          | 7,73:1    |
| `--border` / `--input` | `#7392a4` (alice-blue escurecido)  | 3,29:1    |

`dark:` foi desabilitado por `DESIGN.md` definir tema claro exclusivo: a variante só responde a uma classe `.dark`, que nunca existe.

### 2.3 Adicionar os dez componentes base

```bash
npx shadcn@latest add button card input label dialog dropdown-menu select table skeleton sonner --cwd packages/ui
```

**Desvio do plano:** `toast` não existe mais no registry do shadcn — foi substituído por `sonner`. Confirmado com HTTP 404 em `/r/styles/new-york-v4/toast.json` e 200 em `sonner.json`.

### 2.4 Remover resíduos de boilerplate

| Arquivo                      | Ação                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------- |
| `packages/ui/src/button.tsx` | Removido — prop `appName` e `onClick` com `alert()`                           |
| `packages/ui/src/card.tsx`   | Removido — UTM hardcoded e URL inválida (`create-turbo"`)                     |
| `packages/ui/src/code.tsx`   | Removido — não há equivalente no registry; `Code` sai junto com o boilerplate |

Os arquivos foram apagados, não corrigidos: os componentes shadcn substituem `Button` e `Card` com API melhor, e reaproveitar o código do boilerplate seria manter o problema.

### 2.5 Migrar o boilerplate para os componentes novos

`apps/docs` e `apps/web` importavam `@repo/ui/button`, que deixou de existir. As duas páginas foram reescritas como vitrine do design system, usando só os tokens e componentes novos. Isso também substitui o `<Button appName="docs">Open alert</Button>` das páginas antigas.

### 2.6 Empacotar `@repo/ui`

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./styles.css": "./src/styles/globals.css"
  },
  "scripts": {
    "build": "tsc --build",
    "lint": "eslint . --max-warnings 0",
    "check-types": "tsc --noEmit"
  }
}
```

**Três desvios do plano, todos forcados pela realidade:**

1. **`./styles.css` aponta para `src/`, não `dist/`.** O CSS precisa ser processado pelo Tailwind no consumidor. Compilar no pacote quebraria, porque `@import "tailwindcss"` não pode ser resolvido no build do pacote.
2. **Dependências: `cn`, não `clsx` + `tailwind-merge`.** O registry do shadcn 4.x declara `cn` como dependência oficial — pacote publicado em 2026-09-22, mantido pelo próprio shadcn, descrito como "drop-in replacement for clsx + tailwind-merge". Seguir o plano aqui ignoraria o registry e criaria dois utilitários concorrentes.
3. **Imports entre componentes são relativos.** O `tsc` não reescreve `paths` na emissão: `import { Button } from "@/components/button"` compila e gera `dist/` que quebra em runtime. O único import por alias que o CLI gerou (`dialog.tsx`) foi convertido.

TypeScript 7 removeu `baseUrl` do `tsconfig`. Os `paths` relativos ao arquivo do tsconfig resolvem sem ele.

### 2.7 Adicionar Tailwind ao `apps/docs`

```bash
cd apps/docs
npx shadcn@latest init
```

`globals.css` importa os tokens de `@repo/ui/styles.css`.

### 2.8 Verificar a Etapa 2

```bash
npx turbo run lint check-types build --force
npm run format:check
npx turbo dev
```

Verificação manual: `apps/docs` em `localhost:3001` renderiza os componentes sem estilos quebrados.

## Fora deste plano

Etapas 3 a 10 da spec: infraestrutura local, API NestJS, dados e autenticação, observabilidade, cliente React + Vite, testes E2E, validação final e ADR de consequências.

## Riscos

| Risco                                                                            | Mitigação                                                               |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `apps/web` usa `Button` do boilerplate; removê-lo quebra o build                 | Migrar os imports antes de remover                                      |
| Tokens pastéis não atingem contraste AA como texto                               | Derivar tokens semânticos de texto com contraste verificado             |
| `tsc --build` no `packages/ui` pode conflitar com `check-types` (`tsc --noEmit`) | Manter os dois scripts separados; `build` emite, `check-types` verifica |
| shadcn init no monorepo pode sobrescrever arquivos existentes                    | Revisar o diff de `globals.css` e `tsconfig.json` após o init           |

## Critérios de aceite

- [ ] `npx turbo run lint check-types build` passa sem warnings
- [ ] `npm run format:check` não reporta divergências
- [ ] `npm test` e `npm run test:e2e` executam sem erro (tasks inativas)
- [ ] `packages/ui` compila para `dist/` e exporta a partir dali
- [ ] Componentes shadcn renderizam corretamente em `apps/docs`
- [ ] Nenhum resíduo de boilerplate: sem `alert()`, sem prop `appName`, sem UTM
- [ ] `npm run dev` sobe os apps sem erro
