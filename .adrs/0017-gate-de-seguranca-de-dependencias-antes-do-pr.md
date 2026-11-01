# 0017. Gate de segurança de dependências antes do PR

- **Status:** accepted
- **Data:** 2026-11-01
- **Decisores:** Renato

## Contexto

A skill `check-security-dependencys` audita o monorepo com `npm audit`, aplica correções e valida os gates. Antes desta decisão, ela era acionada sob demanda. Nada no fluxo de entrega exigia sua execução, e o `/commit-and-push` fazia `git add -A` em um único commit, sem registro de vulnerabilidade. Dependências vulneráveis podiam chegar à `main` sem rastro no histórico ou no PR.

## Decisão

Toda feature que vai para PR passa pelo subagent `security-deps-auditor` antes da abertura, via o comando `/open-pr`. Correções de dependência vão em commit `fix(deps)` separado, com lib, versão anterior → nova, severidade, advisory e workspace. O commit da feature e a descrição do PR referenciam esse registro. `critical` e `high` sem correção validada bloqueiam o PR; `moderate` e `low` sem correção viram pendência documentada.

## Alternativas consideradas

| Alternativa                         | Por que não foi escolhida                                                               |
| ----------------------------------- | --------------------------------------------------------------------------------------- |
| Registro só na descrição do PR      | Perde o rastro no histórico git, que é onde `git log` e `git blame` consultam.          |
| Detalhes no mesmo commit da feature | Mistura duas mudanças lógicas (regra de `RULES.md`) e dificulta reverter só a correção. |
| Comando manual, sem gate            | Depende de lembrança humana; é exatamente o problema a resolver.                        |
| Bloquear qualquer achado            | Trava entregas por dependência transitiva sem correção upstream.                        |
| Gate apenas em CI                   | Fica para spec futura; não substitui a verificação local antes do PR.                   |

## Consequências

### Positivas

- Toda correção de segurança é rastreável por `git log --grep="fix(deps)"`.
- O PR mostra, sem abrir outro arquivo, o estado de segurança das dependências.
- A política de bloqueio fica explícita e reprodutível.

### Negativas

- Cada PR de feature ganha uma execução de `npm audit` e gates completos, o que aumenta o tempo de entrega.
- O `/open-pr` depende de `gh` autenticado e de rede.

### Neutras / riscos aceitos

- Vulnerabilidades `moderate` e `low` sem correção não bloqueiam o PR. Isso é um risco aceito explicitamente.
- A auditoria roda localmente; ela não substitui uma verificação em CI, que fica para spec futura.

## Referências

- [Spec 013](../.specs/013-security-deps-agent.md)
- [Plano 013](../.docs/plans/013-security-deps-agent-plan.md)
- [Skill check-security-dependencys](../.agents/skills/check-security-dependencys/SKILL.md)
