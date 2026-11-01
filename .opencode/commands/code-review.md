---
description: Revisa um Pull Request do GitHub: coleta o diff, executa review com o agente code-reviewer, publica comentários inline (Conventional Comments) e submete a revisão final (approve/request changes)
---

Revise o Pull Request informado.

PR informado pelo usuário: $ARGUMENTS

Siga o fluxo da skill `code-review`:

1. Trate `$ARGUMENTS` como `pr-url`. Se estiver vazio, pergunte a URL do PR ao usuário.
2. Valide que é uma URL de PR do GitHub.
3. Verifique `GITHUB_TOKEN`/`GH_TOKEN`. Se ausente, informe e pare.
4. Carregue a skill `code-review` (id: `code-review`) e siga seu fluxo completo.
5. Use o agente `code-reviewer` (subagent) para a análise, passando os dados coletados.
6. Publique a revisão via `scripts/post-review.mjs`.
7. Reporte o resultado conforme a skill.

Não implemente mudanças no código do PR; apenas revise e publique a revisão no GitHub.
