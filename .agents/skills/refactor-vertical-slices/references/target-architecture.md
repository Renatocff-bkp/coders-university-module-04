# Contrato alvo — vertical slices + camadas hexagonais

Este é o contrato que a skill aplica. Ele complementa `.docs/DEVELOPMENT.md` e o
ADR que registra o request handler pattern; em caso de conflito, o ADR e os docs
do repositório vencem o texto abaixo.

## 1. Unidade: a slice

Uma slice é um domínio de negócio em `apps/api/src/modules/{slice}`:

```
{slice}/
├── domain/            # regras puras + portas
├── application/       # um fluxo por use case
├── infrastructure/    # adapters de porta (DB, e-mail, hash, fila, HTTP externo)
├── interface/         # request handlers, DTOs, guards
├── {slice}.tokens.ts  # símbolos de DI
└── {slice}.module.ts  # composition root
```

- Cada slice é autossuficiente: não importa `domain/`, `application/`,
  `infrastructure/` ou `interface/` de outra slice.
- Código de negócio nunca vai para `src/shared`. `shared` é técnico
  (`config`, `database`, `http`, `logging`, `observability`).
- `infrastructure/` só existe quando a slice fala com o mundo externo. `health`
  e `ping` não precisam dela.
- O root da slice contém apenas módulo, tokens e, no máximo, um `testing/` com
  fakes compartilhados pelos testes da slice.

## 2. Direção das dependências

| Camada            | Pode importar                                                     | Não pode importar                                       |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| `domain`          | somente arquivos do próprio `domain`                              | framework, I/O, `shared`, outras camadas, outras slices |
| `application`     | `domain`, serviços da própria `application`, tokens da slice      | `infrastructure`, `interface`, outras slices            |
| `infrastructure`  | `domain` (portas e tipos), `shared` técnico, SDKs externos        | `application`, `interface`, outras slices               |
| `interface`       | `application` (use cases), DTOs/handlers locais, `shared` técnico | `infrastructure`, repositórios de `domain`              |
| `module`/`tokens` | todas as camadas da própria slice (é o composition root)          | —                                                       |

Regras de leitura:

- `interface → domain` é permitido somente para **tipos de resposta e erros de
  domínio** que o handler precisa mapear para HTTP. Injetar repositório ou chamar
  serviço de domínio diretamente no handler é violação.
- `application → @nestjs/common` é tolerado apenas para `@Injectable()` e
  `Logger`. Qualquer outro símbolo do Nest na application indica vazamento de
  framework.
- Dependências apontam para dentro. Se a seta aponta para fora, a correção é
  criar uma porta em `domain` e inverter a injeção — não mover código de camada.

## 3. `domain` — coração puro

Contém entidades, value objects, políticas, erros tipados e **portas**
(interfaces que descrevem o que o negócio precisa do mundo).

```ts
// domain/password-hasher.ts (porta)
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  verify(plainPassword: string, passwordHash: string): Promise<boolean>;
}

// domain/errors.ts (erro tipado)
export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid credentials");
    this.name = "InvalidCredentialsError";
  }
}
```

- Sem `@nestjs/*`, `drizzle-orm`, `pg`, `node:crypto`, `fetch`, `process.env`.
- Sem DTO, sem status HTTP, sem SQL, sem log de infraestrutura.
- Deve ser testável sem mock de infraestrutura.
- Portas ficam no `domain`; adapters ficam em `infrastructure`.

## 4. `application` — um fluxo por use case

Cada fluxo de negócio é uma classe, um arquivo, um método `execute`.

```ts
// application/sign-in.use-case.ts
export interface SignInInput {
  email: string;
  password: string;
  requestId?: string;
}

export interface SignInOutput {
  token: string;
  user: PublicAuthUser;
}

@Injectable()
export class SignInUseCase {
  constructor(
    @Inject(AUTH_USER_REPOSITORY) private readonly users: AuthUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  async execute(input: SignInInput): Promise<SignInOutput> {
    // orquestra domínio + portas
  }
}
```

Regras:

- Arquivo `{fluxo}.use-case.ts`, classe `{Fluxo}UseCase`, método `execute`.
- Um fluxo por classe. `SignUpUseCase` e `ConfirmAccountUseCase` não dividem
  arquivo nem classe.
- `input` e `output` são tipos do próprio use case; não são DTOs HTTP e não
  carregam `@Body`, `@Req`, `Request`, `Response` etc.
- O use case lança **erro de domínio** (`InvalidCredentialsError`), nunca
  `UnauthorizedException`/`BadRequestException`. A tradução para HTTP é do
  handler.
- Dependências externas entram por porta (`domain`) via token. O use case não
  instancia adapter, não abre conexão, não lê env.
- Serviços de aplicação (`SessionService`, `OneTimeTokenService`) são permitidos
  quando a lógica é compartilhada por dois ou mais fluxos e não representa um
  endpoint. Eles não substituem o use case: o handler continua injetando **um**
  use case.
- Logs de negócio usam o `Logger` do Nest com `event`, `requestId` e nunca
  senha, token ou hash.

### Como decidir se algo é use case ou serviço

| Situação                                           | Vira                                   |
| -------------------------------------------------- | -------------------------------------- |
| Um endpoint/fluxo com entrada e saída claras       | use case                               |
| Regra usada por 2+ use cases, sem endpoint próprio | serviço de `application`               |
| Regra de negócio sem I/O, usada por use cases      | função/classe de `domain`              |
| Chamada a banco, e-mail, fila, API externa         | porta no `domain` + adapter em `infra` |

## 5. `infrastructure` — adapter, não regra

- Implementa uma porta de `domain` (`implements PasswordHasher`).
- Pode usar SDK, SQL, Drizzle, SMTP, `process.env`, `node:*`.
- Não decide regra de negócio; só traduz tecnologia ↔ tipos de domínio.
- Convenção de nome existente no projeto: `drizzle-{entidade}.repository.ts`,
  `{provedor}-email.service.ts`, `bcrypt-password-hasher.ts`. Novos adapters
  seguem o padrão do projeto; não renomeie por gosto.
- O vínculo token → classe concreta acontece **somente** no módulo da slice.

## 6. `interface` — request handler com 1:1

Cada endpoint tem uma classe própria, um arquivo próprio e uma única rota.

```ts
// interface/sign-in.handler.ts
@Controller("auth")
export class SignInHandler {
  constructor(private readonly signIn: SignInUseCase) {}

  @Post("sign-in")
  @HttpCode(HttpStatus.OK)
  async execute(
    @Body() dto: SignInDto,
    @Req() request: RequestWithContext,
  ): Promise<{ token: string; user: PublicAuthUser }> {
    try {
      return await this.signIn.execute({
        email: dto.email,
        password: dto.password,
        requestId: request.requestId,
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException({
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        });
      }

      throw error;
    }
  }
}
```

Contrato:

- Arquivo `{ação}.handler.ts`; classe `{Ação}Handler`.
- Um `@Controller` por classe, **uma** rota (`@Get`/`@Post`/...) por classe.
- O método público da rota chama-se `execute`.
- O construtor injeta **exatamente um** `*UseCase` e nada mais.
  - Métricas, logging, repositório, serviço de aplicação e cliente externo não
    entram no handler. Vão para o use case ou para um interceptor/guard/pipe.
  - Guards (`*.guard.ts`) não são request handlers e podem usar serviço de
    aplicação.
- O handler só faz quatro coisas:
  1. extrai primitivos de `@Body`, `@Query`, `@Param`, `@Req`;
  2. chama `useCase.execute(...)`;
  3. devolve o resultado;
  4. traduz erro de domínio para exceção HTTP com `code`/`message`.
- Não contém `if` de regra de negócio, cálculo, acesso a banco, chamada de rede
  ou validação de regra. Validação de formato fica no DTO; validação de negócio
  fica no domínio/use case.
- Um handler não importa outro handler. Constantes compartilhadas vão para um
  arquivo próprio da interface (ex.: `interface/messages.ts`) ou para o use case.
- DTOs ficam em `interface/dto/{ação}.dto.ts`, usam `class-validator` e não
  acessam persistência. Reutilizar constante de política do domínio é aceitável.
- Erros HTTP seguem `{ error: { code, message, fields?, requestId } }`, via
  `HttpExceptionFilter` do `shared`.

## 7. Composition root (`{slice}.module.ts`)

- É o único lugar que conhece classes concretas de `infrastructure`.
- Registra cada handler em `controllers` e cada use case em `providers`.
- Liga portas a adapters com `{ provide: TOKEN, useExisting/useClass/useFactory }`.
- Tokens ficam em `{slice}.tokens.ts` e são `Symbol("NOME")`.
- Exporta somente o que outra slice/`shared` precisa consumir.

## 8. Testes

| Camada           | Tipo       | O que cobre                                                        |
| ---------------- | ---------- | ------------------------------------------------------------------ |
| `domain`         | unitário   | entidades, políticas, erros, VOs                                   |
| `application`    | unitário   | fluxo do use case com fakes em memória das portas                  |
| `interface`      | integração | status, corpo, contrato de erro, validação do endpoint (supertest) |
| `infrastructure` | adapter    | tradução tecnologia ↔ domínio, com fake do SDK quando possível     |

- Teste mora ao lado do arquivo: `{ação}.handler.test.ts`,
  `{fluxo}.use-case.test.ts`.
- Cobertura de `domain` e `application` é obrigatória (`.docs/DEVELOPMENT.md`).
- Ao refatorar sem mudar comportamento, os testes existentes devem continuar
  passando; se precisar mudar teste, explique por quê no plano.

## 9. Tabela de nomes

| Artefato             | Arquivo                            | Classe/símbolo    |
| -------------------- | ---------------------------------- | ----------------- |
| Request handler      | `interface/{ação}.handler.ts`      | `{Ação}Handler`   |
| DTO de entrada       | `interface/dto/{ação}.dto.ts`      | `{Ação}Dto`       |
| Guard                | `interface/{nome}.guard.ts`        | `{Nome}Guard`     |
| Use case             | `application/{fluxo}.use-case.ts`  | `{Fluxo}UseCase`  |
| Serviço de aplicação | `application/{nome}.service.ts`    | `{Nome}Service`   |
| Porta                | `domain/{capacidade}.ts`           | `{Capacidade}`    |
| Erro de domínio      | `domain/errors.ts`                 | `{Motivo}Error`   |
| Adapter              | `infrastructure/{tech}-{porta}.ts` | `{Tech}{Porta}`   |
| Token                | `{slice}.tokens.ts`                | `SCREAMING_SNAKE` |
| Módulo               | `{slice}.module.ts`                | `{Slice}Module`   |

`kebab-case` para arquivos, `PascalCase` para classes, `camelCase` para
métodos/variáveis — igual ao restante do repositório.

## 10. O que **não** é violação

- Slice sem `infrastructure` (health, ping).
- `@Injectable()`/`Logger` na application (convenção atual do projeto).
- Interface importando erro/tipo de domínio para mapear HTTP.
- Guard de interface usando serviço de aplicação.
- Adapter com nome `*.repository.ts` em vez de `*.adapter.ts`.
- Um use case reaproveitado por dois handlers **do mesmo fluxo** (ex.: `GET` e
  `HEAD`), desde que documentado no plano. O normal continua sendo 1 handler ↔
  1 use case ↔ 1 endpoint.
