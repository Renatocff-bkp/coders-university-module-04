/**
 * Lint de mensagens de commit — Conventional Commits.
 * Regras do preset: https://github.com/conventional-changelog/commitlint/tree/master/@commitlint/config-conventional
 *
 * Tipos aceitos: build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test.
 * Formato: type(scope): descrição
 */
export default {
  extends: ["@commitlint/config-conventional"],
};
