# 0002. Tokens derivados da paleta de DESIGN.md

- **Status:** accepted
- **Data:** 2026-10-01
- **Decisores:** Renato Figueredo
- **Spec:** [000-foundation](../.specs/000-foundation.md) — Etapa 2

## Contexto

`DESIGN.md` define dez tokens de cor, todos pastéis claros sobre fundo branco. A spec `000-foundation` (RF-17) pede que esses tokens sejam mapeados para o Tailwind, e o próprio `DESIGN.md` exige "contraste mínimo WCAG AA (4.5:1 para texto)".

Medindo os dez tokens contra `#ffffff`:

| Token            | Hex       | Contraste vs branco |
| ---------------- | --------- | ------------------- |
| `--linen`        | `#fff1e6` | 1,11:1              |
| `--soft-blush`   | `#fde2e4` | 1,22:1              |
| `--mint-cream`   | `#dbe7e4` | 1,27:1              |
| `--powder-petal` | `#eddcd2` | 1,33:1              |
| `--alice-blue`   | `#d6e2e9` | 1,32:1              |
| `--parchment`    | `#f0efeb` | 1,15:1              |
| `--petal-frost`  | `#fad2e1` | 1,37:1              |
| `--light-cyan`   | `#c5dedd` | 1,41:1              |
| `--pale-sky`     | `#bcd4e6` | 1,53:1              |
| `--powder-blue`  | `#99c1de` | 1,90:1              |

Nenhum chega a 4,5:1. Usá-los como cor de texto violaria a própria regra do documento.

Isso não é um defeito da paleta: por definição, são cores de superfície e acento. O problema surge apenas se forem promovidas a cor de texto.

## Decisão

A paleta de `DESIGN.md` é preservada integralmente como **paleta decorativa**, exposta em utilities do Tailwind (`bg-powder-petal`, `bg-linen`, etc.) e em variáveis CSS com o mesmo nome.

Os **tokens semânticos** que o shadcn espera (`--primary`, `--foreground`, `--border`, etc.) são valores derivados, não reusos diretos:

| Token semântico        | Valor     | Origem                     | Contraste verificado                 |
| ---------------------- | --------- | -------------------------- | ------------------------------------ |
| `--foreground`         | `#242424` | neutro                     | 15,52:1 sobre `--background`         |
| `--muted-foreground`   | `#52525b` | neutro                     | 7,73:1 sobre `--background`          |
| `--primary`            | `#1f5673` | `--powder-blue` escurecido | 7,96:1 com texto branco              |
| `--secondary`          | `#dbe7e4` | `--mint-cream` direto      | 12,24:1 com `--secondary-foreground` |
| `--accent`             | `#fde2e4` | `--soft-blush` direto      | 12,70:1 com `--accent-foreground`    |
| `--muted`              | `#f0efeb` | `--parchment` direto       | —                                    |
| `--border` / `--input` | `#7392a4` | `--alice-blue` escurecido  | 3,29:1 sobre `--background`          |
| `--destructive`        | `#b91c1c` | neutro                     | 6,47:1 com texto branco              |

Dois tokens exigiram derivação em vez de reuso:

- **`--primary`**: `--powder-blue` com texto branco daria 1,90:1. Escurecer até `#1f5673` preserva o matiz azulado e entrega 7,96:1. O pastel permanece disponível como acento decorativo.
- **`--border` / `--input`**: `--alice-blue` dá 1,32:1. A WCAG 1.4.11 exige 3:1 para a borda de um controle interativo (input, botão `outline`). `#7392a4` é o tom mais claro da família que atende, com 3,29:1.

`DESIGN.md` pede "bordas suaves". `#7392a4` é visivelmente mais presente que `--alice-blue` — é o custo de acessibilidade. Mantido porque a regra de contraste é explícita no documento e não admite exceção.

`DESIGN.md` também define tema claro exclusivo. Por isso `dark:` foi redefinido para só responder a uma classe `.dark`, que nunca existe, em vez de reagir a `prefers-color-scheme`.

## Alternativas consideradas

| Alternativa                                                    | Por que não foi escolhida                                                                                                              |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Escurecer toda a paleta e usá-la como cor de texto             | Destrói a identidade visual descrita em `DESIGN.md`. As cores são decorativas por definição                                            |
| Manter `#171717` como `--foreground` e os pastéis como acentos | É o que o scaffold do `create-turbo` fazia por conta própria. Não é uma decisão, é um resíduo                                          |
| Afrouxar o requisito de contraste para 3:1                     | `DESIGN.md` diz 4,5:1 para texto. Afrouxar a regra para acomodar a paleta inverte a ordem: o documento não existe para servir à paleta |
| Manter `--border` em `#d6e2e9` e aceitar 1,32:1                | Viola a WCAG 1.4.11 em controles interativos, que é justamente onde a borda carrega significado                                        |

## Consequências

### Positivas

- Nenhum texto da interface fica abaixo de 4,5:1
- A paleta de `DESIGN.md` continua intacta e disponível
- Todo token semântico tem contraste medido e registrado no próprio arquivo de tokens
- `globals.css` documenta a origem de cada valor, não só o valor

### Negativas

- Bordas mais escuras que o previsto em `DESIGN.md`
- O CTA deixa de ser o pastel literal; vira um azul profundo
- Exige manter a medição como responsabilidade permanente, não uma tarefa de setup

### Neutras / riscos aceitos

- A tabela de contraste pode envelhecer. Se a paleta mudar, `--primary` e `--border` precisam remedir junto. A medição está no comentário de `packages/ui/src/styles/globals.css` para ser refeita com o evento
- `dark:` não é testado, porque não é suportado. Se dark mode entrar no escopo, os tokens precisam de um segundo conjunto

## Referências

- [.docs/DESIGN.md](../.docs/DESIGN.md)
- [.docs/DESIGN_SYSTEM.md](../.docs/DESIGN_SYSTEM.md)
- `packages/ui/src/styles/globals.css`
