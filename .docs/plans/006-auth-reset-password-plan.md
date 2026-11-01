# Plano de execução — 006 Auth Reset Password

Spec: [006-auth-reset-password](../../.specs/006-auth-reset-password.md)
Branch: `feat/006-auth-reset-password`
ADR reservado: 0012

## Perguntas e respostas (exploração dos docs e código)

| Pergunta                                 | Resposta                                                                                                                                                                                  |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token ausente deve ser 400 ou 410?       | A spec pede 410 `INVALID_TOKEN`. O DTO aceita token opcional e o caso de uso lança `InvalidTokenError`. Divergência consciente do padrão de `confirm-account` (400).                      |
| Onde enviar o e-mail de sucesso?         | Após o commit. Assim o e-mail nunca anuncia uma troca que foi revertida. Falha é logada e engolida. ADR 0012.                                                                             |
| Como evitar reuso do token em corrida?   | `OneTimeTokenService.consume` já usa `markUsedIfUnused`, dentro da transação.                                                                                                             |
| Hash Bcrypt dentro ou fora da transação? | Fora. Bcrypt custo 12 leva ~250 ms; não segurar a transação aberta. O hash é calculado antes de validar o token, o que também iguala o tempo de resposta para tokens válidos e inválidos. |
| Como atualizar a senha?                  | Novo método `updatePasswordHash(id, passwordHash, updatedAt)` em `AuthUserRepository`, espelhando `markEmailConfirmed`.                                                                   |
| Como revogar sessões?                    | `SessionService.revokeAll(userId)` dentro da transação.                                                                                                                                   |
| Validação de senha?                      | DTO (`@MinLength(PASSWORD_MIN_LENGTH)` e `MatchesProperty`), espelhando sign-up. Cliente: `validateResetPasswordForm` em `validation.ts`, reutilizando `PASSWORD_MIN_LENGTH`.             |
| Mensagem de sucesso no login?            | Query `?password=reset`, mesmo padrão de `?session=ended` da 004.                                                                                                                         |
| `<meta name="referrer">` existe?         | Sim, em `apps/app/index.html`.                                                                                                                                                            |

## Etapas

1. **Plano** (`docs(plan)`): este arquivo.
2. **Refactor** (`refactor(api)`): extrair o decorator `MatchesProperty` de `sign-up.dto.ts` para `interface/dto/matches-property.ts`, sem mudança de comportamento. Reutilizado pelo DTO de reset.
3. **Caso de uso** (`feat(api)`): `ResetPasswordUseCase` com testes unitários (TDD), `updatePasswordHash` nas implementações in-memory e Drizzle.
   - Token vazio → `InvalidTokenError`.
   - Hash antes da transação.
   - Transação: `oneTimeTokens.consume(raw, "password_reset")`, `users.updatePasswordHash`, `sessions.revokeAll`.
   - Após commit: busca o usuário e envia `sendPasswordChangedEmail`. Falha logada sem token, senha ou e-mail.
   - Logs: `auth.reset_password.succeeded` (userId, requestId, revokedSessions), `auth.reset_password.failed` (reason).
4. **Endpoint** (`feat(api)`): DTO `reset-password.dto.ts`, controller `POST /api/v1/auth/reset-password` (204, 410 `INVALID_TOKEN`), registro no `AuthModule`, teste de integração HTTP.
5. **Cliente** (`feat(app)`): `validateResetPasswordForm` + testes; `api/reset-password.ts`.
6. **Página** (`feat(app)`): `reset-password-page.tsx`, rota em `App.tsx`. Extrai o token, remove a query, formulário acessível, erros por campo, `aria-live`, foco no primeiro campo inválido. Sucesso: `clearAuthToken()` e navega para `/auth/sign-in?password=reset`. Token inválido: alerta com link para `/auth/forgot-password`.
7. **Login** (`feat(app)`): `sign-in-page.tsx` exibe a mensagem de sucesso quando `?password=reset`.
8. **ADR** (`docs(adr)`): ADR 0012 e linha no índice, formatado com prettier.
9. **E2E** (`test(app)`): `apps/app/e2e/auth-reset-password.spec.ts` escrito, não executado (deferred).
10. **QA**: turbo por filtro, `npm run` raiz, prettier nos arquivos da spec.

## Riscos

| Risco                                                                                               | Mitigação                                                              |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Erro de rota 410 vs 400 para token ausente                                                          | Teste explícito de integração                                          |
| Reuso do token em corrida                                                                           | `markUsedIfUnused` dentro da transação; teste de consumo duplo         |
| Falha de SMTP após troca                                                                            | Log sem dados sensíveis; troca prevalece                               |
| Conflito de arquivos com 004 (`sign-in-page.tsx`, `App.tsx`)                                        | Mudanças mínimas, somente adições                                      |
| E2E em `apps/app/e2e` importando `@playwright/test` sem estar no workspace quebrar lint/check-types | Verificar; se quebrar, excluir o arquivo do lint/tsconfig sem executar |

## Critérios

- Todos os critérios de aceite da spec 006 cobertos por teste unitário, integração ou verificação manual listada.
- Nenhuma senha, token ou hash em log ou resposta.
- `lint`, `check-types`, `test`, `build` passam com `--force`; prettier passa nos arquivos da spec.
