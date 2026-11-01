# Redesign de UI/UX de todas as páginas existentes

## Metadado

| Campo         | Valor         |
| ------------- | ------------- |
| Status        | `implemented` |
| Prioridade    | `high`        |
| Criado em     | 2026-11-01    |
| Atualizado em | 2026-11-01    |
| Responsável   | Renato        |

## Resumo

Redesenhar visual e de experiência de usuário de todas as páginas existentes do cliente SPA (`apps/app`), elevando o nível de qualidade para uma UI profissional, moderna e elegante, sem alterar fluxos de negócio, rotas ou contratos da API. O redesign deve aplicar as diretrizes de `DESIGN.md` e `DESIGN_SYSTEM.md`, além das skills `frontend-design` e `web-design-guidelines`, e ser documentado com screenshots _before/after_ em `.screenshots/`.

## Contexto

As páginas atuais são funcionais, mas visualmente simples/amadoras: layouts centralizados básicos, tipografia pouco explorada, espaçamento e hierarquia limitados, e pouco uso dos componentes do design system além de `Card`, `Button`, `Input` e `Label`. A experiência não transmite o nível de profissionalismo esperado para o produto (plataforma de gestão de agentes de IA executivos).

A primeira entrega de UI não utilizou as skills de design disponíveis, resultando em telas genéricas. Esta spec corrige esse gap.

Referências: `DESIGN.md`, `DESIGN_SYSTEM.md`, `DEVELOPMENT.md`, `BUSINESS.md`, specs `002`–`006` (auth) e `000` (foundation).

## Escopo

### Dentro do escopo

- Redesign visual/UX das 8 rotas do cliente:
  - `/auth/sign-in`
  - `/auth/sign-up`
  - `/auth/check-email`
  - `/auth/confirm-account`
  - `/auth/forgot-password`
  - `/auth/reset-password`
  - `/app` (home placeholder)
  - `/app/status`
- Responsividade em mobile (< 768px), tablet (768–1279px) e desktop (≥ 1280px).
- Preservação de toda lógica, validação, estados e acessibilidade existentes.
- Captura de screenshots _after_ com a mesma nomenclatura e viewports dos _before_ (já capturados).
- Possível adição de componentes shadcn ao `packages/ui` quando necessário (ex.: `Separator`, `Badge`, `Alert`, `Avatar`, `Skeleton` já existente).
- Ajustes de layout compartilhado (ex.: container, header de seção, estados de feedback) dentro de `apps/app`.

### Fora do escopo

- Mudanças de backend, API, banco de dados ou fluxos de negócio.
- Novas rotas, features ou telas além das existentes.
- Suporte a dark mode (proibido por `DESIGN.md`).
- Redesign do app `apps/docs` (vitrine do design system).
- Alteração de testes de comportamento existentes (apenas ajustes de render se necessário).

## Requisitos funcionais

| ID    | Requisito             | Descrição                                                                                                                       |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| RF-01 | Fluxos preservados    | Todas as 8 rotas mantêm navegação, submissão, validação e redirecionamentos atuais.                                             |
| RF-02 | Validação client-side | Mensagens de erro de campo e de formulário permanecem funcionais e visíveis, com foco no primeiro campo inválido.               |
| RF-03 | Estados de feedback   | Loading, erro, sucesso e vazio (ex.: confirmação de e-mail, status da API) têm feedback visual claro e acessível (`aria-live`). |
| RF-04 | Links de navegação    | Links entre sign-in/sign-up, "forgot password", "back to sign in" etc. permanecem presentes e funcionais.                       |
| RF-05 | Home autenticada      | Exibe saudação ao usuário e ação de sign-out; redireciona para sign-in quando não autenticado.                                  |
| RF-06 | Status da API         | Exibe checks de health/ping, estado operacional, latência e botão de retry em caso de falha.                                    |
| RF-07 | Responsividade        | Todas as páginas utilizáveis em mobile, tablet e desktop, sem overflow horizontal.                                              |
| RF-08 | Screenshots after     | Capturar `.screenshots/*_{mobile,tablet,desktop}_after.png` para as 8 páginas, nos mesmos viewports dos _before_.               |

## Requisitos não-funcionais

| ID     | Requisito      | Descrição                                                                                                              |
| ------ | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| RNF-01 | Performance    | Sem regressão perceptível; evitar layout shift; usar `Skeleton` em carregamentos; imagens otimizadas.                  |
| RNF-02 | Acessibilidade | WCAG AA (contraste 4.5:1 texto, 3:1 texto grande/bordas), semântica, foco visível, navegação por teclado, `aria-live`. |
| RNF-03 | Responsividade | Mobile-first; validar em 390×844, 768×1024 e 1280×800; zoom de 200%.                                                   |
| RNF-04 | Consistência   | Usar tokens de `DESIGN.md` e componentes `@repo/ui`; sem valores hexadecimais diretos em componentes.                  |
| RNF-05 | Testes         | `npm run lint`, `npm run check-types`, `npm run test` passam; testes existentes de auth permanecem verdes.             |
| RNF-06 | Screenshots    | `.screenshots/` contém 24 arquivos `*_before.png` (já capturados) e 24 `*_after.png` após a implementação.             |
| RNF-07 | Idioma         | Todo texto de interface em en-US (conforme `DEVELOPMENT.md`).                                                          |

## Critérios de aceite

- [ ] As 8 páginas foram redesenhadas e permanecem funcionais.
- [ ] Antes e depois podem ser comparados visualmente via `.screenshots/`.
- [ ] 24 screenshots _after_ capturados com nomenclatura e viewports idênticos aos _before_.
- [ ] `npm run lint` passa sem warnings.
- [ ] `npm run check-types` passa.
- [ ] `npm run test` passa (apps/app e packages/ui).
- [ ] Revisão de acessibilidade (manual + Lighthouse) sem falhas críticas.
- [ ] Nenhuma regressão de fluxo (sign-in, sign-up, recuperação de senha, confirmação de conta, home, status).
- [ ] Design aderente a `DESIGN.md` (paleta pastel, tema claro, Geist, bordas suaves, sombras leves).

## Impacto técnico

### Arquivos afetados

| Arquivo                                                    | Ação          | Descrição                                                  |
| ---------------------------------------------------------- | ------------- | ---------------------------------------------------------- |
| `apps/app/src/routes/home-placeholder.tsx`                 | modify        | Redesign da home autenticada.                              |
| `apps/app/src/routes/status-page.tsx`                      | modify        | Redesign do status da API.                                 |
| `apps/app/src/routes/require-auth.tsx`                     | modify        | Loading state mais elegante (opcional).                    |
| `apps/app/src/modules/auth/pages/sign-in-page.tsx`         | modify        | Redesign do formulário de sign-in.                         |
| `apps/app/src/modules/auth/pages/sign-up-page.tsx`         | modify        | Redesign do formulário de sign-up.                         |
| `apps/app/src/modules/auth/pages/check-email-page.tsx`     | modify        | Redesign da tela de confirmação de e-mail.                 |
| `apps/app/src/modules/auth/pages/confirm-account-page.tsx` | modify        | Redesign da confirmação de conta.                          |
| `apps/app/src/modules/auth/pages/forgot-password-page.tsx` | modify        | Redesign da solicitação de reset.                          |
| `apps/app/src/modules/auth/pages/reset-password-page.tsx`  | modify        | Redesign do reset de senha.                                |
| `apps/app/src/App.tsx`                                     | modify        | Layout compartilhado/rotas se necessário.                  |
| `apps/app/src/styles.css`                                  | modify        | Ajustes de tokens/estilos globais (dentro de `DESIGN.md`). |
| `apps/app/src/components/*`                                | create/modify | Componentes locais de layout/seção (se necessário).        |
| `packages/ui/src/components/*`                             | create/modify | Novos componentes shadcn, se o redesign exigir.            |
| `packages/ui/src/index.ts`                                 | modify        | Export de novos componentes.                               |

### Dependências

- Skills: `frontend-design`, `web-design-guidelines` (design), `shadcn` (componentes), `vercel-react-best-practices` (performance React).
- Bibliotecas existentes: `@repo/ui`, Tailwind 4, Lucide React, `class-variance-authority`.
- Ferramenta: Playwright (CLI/MCP) para screenshots.
- Nenhuma dependência de backend nova.

### Componentes de UI

| Componente                                     | Origem                   | Uso                                                     |
| ---------------------------------------------- | ------------------------ | ------------------------------------------------------- |
| `Button`                                       | `@repo/ui`               | CTAs, ações primárias/secundárias, retry, sign-out.     |
| `Card`                                         | `@repo/ui`               | Containers de formulário e seções.                      |
| `Input`                                        | `@repo/ui`               | Campos de formulário.                                   |
| `Label`                                        | `@repo/ui`               | Rótulos acessíveis.                                     |
| `Skeleton`                                     | `@repo/ui`               | Placeholders de carregamento (confirm-account, status). |
| `Dialog` / `DropdownMenu` / `Select` / `Table` | `@repo/ui`               | Conforme necessidade do redesign.                       |
| `Separator`, `Badge`, `Alert`, `Avatar`        | `@repo/ui` (a adicionar) | Elementos de hierarquia, status e feedback.             |

## Plano de implementação

### Etapa 0: Screenshots before (concluída)

Capturados 24 arquivos em `.screenshots/*_{mobile,tablet,desktop}_before.png` (8 páginas × 3 viewports).

### Etapa 1: Definir direção de design

- Aplicar a skill `frontend-design`: criar token system (cores, tipografia, layout, princípios) aderente a `DESIGN.md`.
- Revisar o plano contra o brief; evitar defaults genéricos (cards idênticos, eyebrow labels, etc.).
- Decidir componentes adicionais necessários no `packages/ui`.

### Etapa 2: Redesign das páginas de autenticação

- sign-in, sign-up, check-email, confirm-account, forgot-password, reset-password.
- Melhorar hierarquia, espaçamento, feedback de erro/sucesso, estados de loading.
- Manter validação e acessibilidade.

### Etapa 3: Redesign da home e status

- Home: saudação mais refinada, card de boas-vindas, ação de sign-out.
- Status: layout de monitoramento elegante, indicadores de status, latência, retry.

### Etapa 4: Componentes compartilhados

- Extrair padrões repetidos (header de seção, container, alertas) para `apps/app/src/components` ou `packages/ui`.
- Adicionar componentes shadcn faltantes ao `packages/ui` (com build e export).

### Etapa 5: Screenshots after

- Capturar 24 arquivos `.screenshots/*_{mobile,tablet,desktop}_after.png` com os mesmos viewports.
- Comparar visualmente before/after.

### Etapa 6: QA

- Rodar `npm run lint`, `npm run check-types`, `npm run test`.
- Revisão de acessibilidade (Lighthouse, teclado, contraste).
- Revisão de responsividade nos 3 breakpoints.

## Riscos e ressalvas

| Risco                                             | Probabilidade | Impacto | Mitigação                                                          |
| ------------------------------------------------- | ------------- | ------- | ------------------------------------------------------------------ |
| Regressão de testes de auth por mudança de markup | medium        | medium  | Manter seletores/labels; rodar testes a cada etapa.                |
| Over-engineering / excesso de componentes novos   | medium        | low     | Reutilizar `@repo/ui`; adicionar componente apenas se reutilizado. |
| Quebra de acessibilidade (foco, contraste)        | medium        | high    | Seguir `web-design-guidelines`; revisar com Lighthouse e teclado.  |
| Inconsistência com `DESIGN.md` (paleta/tema)      | low           | medium  | Tokens semânticos; revisão final contra `DESIGN.md`.               |
| Flakiness nas capturas after                      | low           | low     | Usar `--wait-for-timeout` e viewports fixos.                       |
| Escopo crescer além das 8 páginas                 | medium        | medium  | Manter foco em `apps/app`; `apps/docs` fora de escopo.             |

## Referências

- `.docs/DESIGN.md` — diretrizes visuais e paleta.
- `.docs/DESIGN_SYSTEM.md` — componentes shadcn e padrões de acessibilidade.
- `.docs/DEVELOPMENT.md` — convenções, a11y, responsividade.
- `.docs/ARCHITECTURE.md` — stack e estado atual.
- `.docs/BUSINESS.md` — domínio e personas.
- `.specs/000-foundation.md`, `.specs/002-auth-sign-up.md` … `.specs/006-auth-reset-password.md`.
- `.screenshots/*_before.png` — estado atual (capturado em 2026-11-01).
- Skills: `frontend-design`, `web-design-guidelines`, `shadcn`, `vercel-react-best-practices`.
