import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui";

const paleta = [
  { token: "--powder-petal", nome: "powder-petal", classe: "bg-powder-petal" },
  { token: "--linen", nome: "linen", classe: "bg-linen" },
  { token: "--soft-blush", nome: "soft-blush", classe: "bg-soft-blush" },
  { token: "--petal-frost", nome: "petal-frost", classe: "bg-petal-frost" },
  { token: "--light-cyan", nome: "light-cyan", classe: "bg-light-cyan" },
  { token: "--mint-cream", nome: "mint-cream", classe: "bg-mint-cream" },
  { token: "--parchment", nome: "parchment", classe: "bg-parchment" },
  { token: "--alice-blue", nome: "alice-blue", classe: "bg-alice-blue" },
  { token: "--pale-sky", nome: "pale-sky", classe: "bg-pale-sky" },
  { token: "--powder-blue", nome: "powder-blue", classe: "bg-powder-blue" },
];

const tokensSemanticos = [
  { token: "--background", classe: "bg-background" },
  { token: "--foreground", classe: "bg-foreground" },
  { token: "--primary", classe: "bg-primary" },
  { token: "--secondary", classe: "bg-secondary" },
  { token: "--muted", classe: "bg-muted" },
  { token: "--accent", classe: "bg-accent" },
  { token: "--destructive", classe: "bg-destructive" },
  { token: "--border", classe: "bg-border" },
  { token: "--ring", classe: "bg-ring" },
];

export default function Home() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-8 py-20">
      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">Design System</h1>
        <p className="text-muted-foreground max-w-prose text-lg">
          Vitrine de <code className="font-mono">@repo/ui</code>. Tokens e
          componentes vêm de <code className="font-mono">DESIGN.md</code> e são
          verificados contra WCAG AA.
        </p>
      </header>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight">Paleta</h2>
        <p className="text-muted-foreground max-w-prose">
          Cores de superfície e acento. Nenhuma atinge 4.5:1 sobre branco, por
          isso nenhuma é usada como cor de texto.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {paleta.map((cor) => (
            <figure key={cor.token} className="flex flex-col gap-2">
              <div className={`h-20 rounded-lg ${cor.classe}`} />
              <figcaption className="font-mono text-sm">
                {cor.nome}
                <span className="text-muted-foreground block text-xs">
                  {cor.token}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Tokens semânticos
        </h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-9">
          {tokensSemanticos.map((token) => (
            <figure key={token.token} className="flex flex-col gap-2">
              <div className={`h-14 rounded-lg ${token.classe}`} />
              <figcaption className="text-muted-foreground font-mono text-xs">
                {token.token}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight">Botões</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Contorno</Button>
          <Button variant="ghost">Fantasma</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destrutivo</Button>
          <Button disabled>Desabilitado</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Pequeno</Button>
          <Button size="default">Padrão</Button>
          <Button size="lg">Grande</Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <CardDescription>
              Superfície elevada com raio generoso, conforme DESIGN.md.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="agente">Nome do agente</Label>
              <Input id="agente" placeholder="Assistente de vendas" />
            </div>
            <div className="flex gap-2">
              <Button size="sm">Salvar</Button>
              <Button size="sm" variant="outline">
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carregando</CardTitle>
            <CardDescription>
              Skeleton usado enquanto os dados chegam.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="text-2xl font-semibold tracking-tight">Tabela</h2>
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead>Conector</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">
                    Assistente de vendas
                  </TableCell>
                  <TableCell>Notion</TableCell>
                  <TableCell>Ativo</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Suporte técnico</TableCell>
                  <TableCell>Jira</TableCell>
                  <TableCell>Rascunho</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
