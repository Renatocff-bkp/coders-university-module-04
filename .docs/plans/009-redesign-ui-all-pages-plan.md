# Plano de implementação — Redesign de UI/UX (spec 009)

## Consenso alcançado

### Decisões

- **Direção estética:** Refined minimal — limpo, espaçoso, tipografia forte, acentos pastel sutis, elevação leve; foco em clareza e profissionalismo. Dentro dos tokens de `DESIGN.md` (paleta pastel, tema claro, Geist).
- **Layout auth:** Split-screen — painel esquerdo com branding/illustração pastel + painel direito com formulário; em mobile empilha (formulário primeiro, branding em cima ou oculto).
- **Home:** Welcome card + ações — card de boas-vindas com saudação, atalhos e sign-out discreto no header.
- **Status:** Layout de monitoramento elegante com indicadores, latência e retry.
- **Componentes:** Adicionar componentes shadcn ao `packages/ui` apenas quando reutilizados em múltiplas páginas (Separator, Badge, Alert inicialmente; outros conforme necessidade).
- **Escopo:** Apenas `apps/app`. Sem mudanças de backend. Manter todos os fluxos e validações.
- **Screenshots:** Capturar `*_after.png` com mesmos viewports ao final.

### Plano de ação

1. **Infraestrutura de layout (apps/app)**
   - Criar `apps/app/src/components/auth-layout.tsx` (split-screen) reutilizável para páginas de auth.
   - Criar `apps/app/src/components/page-header.tsx` (eyebrow + título + descrição) reutilizável.
   - Ajustar `apps/app/src/styles.css` se necessário (sem novos tokens fora de `DESIGN.md`).
2. **Componentes packages/ui**
   - Adicionar `Separator`, `Badge`, `Alert` via shadcn CLI (se ainda não existirem); exportar no barrel; build.
   - Testes unitários de variants/estados.
3. **Redesign auth pages**
   - sign-in, sign-up, check-email, confirm-account, forgot-password, reset-password usando `AuthLayout`.
   - Melhorar hierarquia, feedback de erro/sucesso, estados de loading.
4. **Redesign home**
   - Header com sign-out discreto; card de boas-vindas; atalhos (status).
5. **Redesign status**
   - Card de monitoramento com indicadores, latência, retry.
6. **Refinamento de require-auth loading**
   - Skeleton/placeholder elegante.
7. **Captura after screenshots**
   - Playwright com mesmos viewports e nomenclatura.
8. **QA**
   - lint, check-types, test, build, format:check.
   - Revisão a11y e responsividade.

### Riscos e ressalvas

- Manter seletores/labels para não quebrar testes existentes.
- Evitar defaults genéricos (cards idênticos, eyebrow em toda seção).
- Garantir contraste WCAG AA com paleta pastel (usar tokens semânticos derivados).
- Split-screen em mobile deve empilhar sem overflow.

### Critérios de aceite

- 8 páginas redesenhadas e funcionais.
- 24 screenshots after capturados.
- QA completo passando.
- A11y sem falhas críticas.
