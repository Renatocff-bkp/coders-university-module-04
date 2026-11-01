# Template de relatório — Check Security Dependencies

Salvo em `.security-deps/{run-id}/security-audit.md`.

```markdown
# Relatório de segurança — dependências

- Run: `.security-deps/{run-id}/`
- Gerado em: {data}
- Working tree: {limpo|sujo}

## Resumo

- Total de vulnerabilidades: {N}
- Por severidade: critical {x}, high {x}, moderate {x}, low {x}
- Workspaces afetados: {lista}

## Achados e correções

| Lib | Severidade | Advisory | Versão anterior | Versão corrigida | Fix | Status |
| --- | ---------- | -------- | --------------- | ---------------- | --- | ------ |
| next | critical | GHSA-xxx | 16.3.4 | 16.4.3 | bump | aplicado |
| multer | high | GHSA-yyy | ^2.4.0 | 2.4.1 | audit fix | aplicado |

## Não corrigidos

- {lib} — {razão} (sem fix upstream / decisão pendente).

## QA gates

| Gate | Status | Observação |
| ---- | ------ | ---------- |
| format:check | pass/fail | ... |
| lint | pass/fail | ... |
| check-types | pass/fail | ... |
| test | pass/fail | ... |
| build | pass/fail | ... |

## Validação funcional

- Workspaces com testes/build após a correção: {lista}
- Subida de ambiente: {feito|deferred|bloqueado}

## Próximos passos

- {ações pendentes}
```

Campos obrigatórios: resumo, achados com versão anterior → corrigida, gates com
status real, validação funcional, próximos passos. Não omitir.
