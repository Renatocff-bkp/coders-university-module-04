# Design System

## Base

Construído sobre [shadcn/ui](https://ui.shadcn.com) — componentes acessíveis sobre Radix UI, com código owned pelo projeto e estilizados via TailwindCSS.

O shadcn não é uma dependência de produção: os componentes são copiados para `packages/ui` e versionados aqui. Isso permite customização sem depender de atualizações upstream.

## Estrutura

```
packages/ui/
├── src/
│   ├── components/    # Componentes shadcn copiados
│   ├── styles/        # Tokens e variantes (globals.css)
│   └── index.ts       # Barrel export
├── components.json    # Configuração do shadcn CLI
└── package.json
```

## Componentes

Dez componentes base, todos copiados do registry shadcn (`new-york-v4`) para `packages/ui/src/components/`:

| Componente     | Client | Uso                                                                                           |
| -------------- | ------ | --------------------------------------------------------------------------------------------- |
| `Button`       | não    | Ações do usuário. Variantes `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` |
| `Card`         | não    | Agrupamento de conteúdo. Composição por subcomponente                                         |
| `Input`        | não    | Campo de texto                                                                                |
| `Label`        | sim    | Rótulo de campo                                                                               |
| `Skeleton`     | não    | Placeholder durante carregamento                                                              |
| `Dialog`       | sim    | Modal                                                                                         |
| `DropdownMenu` | sim    | Menu contextual                                                                               |
| `Select`       | sim    | Seletor de valor único                                                                        |
| `Table`        | sim    | Dados tabulares                                                                               |
| `Toaster`      | sim    | Notificações, sobre o [Sonner](https://sonner.emilkowal.ski)                                  |

Todos são exportados pelo barrel `packages/ui/src/index.ts`. Importe de `@repo/ui`, nunca por caminho interno.

O boilerplate do `create-turbo` (`Button` com prop `appName` e `alert()`, `Card` com UTM hardcoded, `Code`) foi removido.

## Empacotamento

`@repo/ui` é uma biblioteca com etapa de build própria:

| Item         | Valor                                                                  |
| ------------ | ---------------------------------------------------------------------- |
| Build        | `tsc --build` → `dist/`                                                |
| Entry point  | `@repo/ui` → `dist/index.js`, tipos em `dist/index.d.ts`               |
| CSS          | `@repo/ui/styles.css` → `src/styles/globals.css` (fonte, não `dist/`)  |
| Dependências | `radix-ui`, `sonner`, `cn`, `class-variance-authority`, `lucide-react` |

O CSS é exportado como **fonte** e não compilado no pacote: o Tailwind precisa processar `@import "tailwindcss"` no consumidor, junto com as classes dos componentes.

### Como o app consome

```css
/* apps/app/src/styles.css */
@import "@repo/ui/styles.css";
```

No app Vite (`apps/app`), o plugin `@tailwindcss/vite` faz o Tailwind processar o CSS do design system:

```json
/* apps/app/package.json */
{
  "devDependencies": { "@tailwindcss/vite": "4.3.3", "tailwindcss": "4.3.3" }
}
```

No app Next.js (`apps/docs`), o equivalente é o plugin `@tailwindcss/postcss` com `postcss.config.mjs`. Sem isso o build passa, mas os componentes renderizam sem estilo — o Tailwind não vê as classes.

`@repo/ui` precisa estar construído antes do app rodar. O `turbo.json` resolve isso com `build: { dependsOn: ["^build"] }`.

## Convenções

- Componentes interativos são client components (`"use client"`) quando usam estado, eventos ou hooks de browser
- Componentes de apresentação devem ser server components por padrão
- Props tipadas com interface explícita; `className` opcional para composição
- Estilização com variantes do `class-variance-authority`; sem CSS inline
- Ícones do [Lucide React](https://lucide.dev)
- Toda variante visual exposta como prop nomeada, nunca condicionada por booleano solto (`isPrimary` em vez de `primary`)
- Imports entre componentes do pacote são **relativos**. O `tsc` não reescreve aliases `paths` na emissão, então um import `@/components/x` compila mas quebra em `dist/`

## Acessibilidade

Requisitos de todo componente, não extras:

- Usar elemento semântico correto (`button`, `a`, `dialog`); `div` apenas com `role` e handlers completos
- Foco gerenciado em componentes sobrepostos e devolvido ao elemento que os abriu
- Ícones decorativos com `aria-hidden`; ícones que carregam significado com `aria-label`
- Texto dos botões nunca apenas ícone sem rótulo acessível
- Contraste verificado contra os tokens, não contra o branco puro

## Adicionando componentes

```bash
npx shadcn@latest add <component> --cwd packages/ui
```

Depois:

1. Exporte o componente em `src/index.ts`
2. Se o import gerado usar o alias `@/components/…`, converta para relativo — ver [Empacotamento](#empacotamento)
3. Adicione tokens necessários a `styles/globals.css` em vez de valores arbitrários
4. Garanta conformidade com as regras de acessibilidade acima
5. Escreva teste unitário para variants e estados

Atenção ao rodar o CLI: ele instala e usa o pacote npm [`cn`](https://www.npmjs.com/package/cn) como utilitário de classes — é o sucessor oficial de `clsx` + `tailwind-merge`. Não remova essa dependência.

## Tokens de design

Cores, espaçamento, tipografia e raios estão em [DESIGN.md](./DESIGN.md). Componentes consomem tokens (`bg-background`, `text-muted-foreground`), nunca valores hexadecimais diretos.

Os tokens semânticos do shadcn **não são** os tokens de `DESIGN.md`: são valores derivados, porque a paleta pastel não atinge contraste suficiente para texto. A tabela de medição está no comentário de `packages/ui/src/styles/globals.css` e a justificativa no [ADR 0002](../.adrs/0002-tokens-derivados-da-paleta.md).

`dark:` está desabilitado — `DESIGN.md` define tema claro exclusivo. A variante foi redefinida para só responder a uma classe `.dark`, que nunca existe.
