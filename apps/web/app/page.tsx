import { Button } from "@repo/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-start justify-center gap-8 px-8 py-20">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">
          Coders University
        </h1>
        <p className="text-muted-foreground max-w-prose text-lg">
          App cliente. Em breve sai daqui o boilerplate do create-turbo e entra
          a interface do produto — ver Etapa 7 da spec de foundation.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button>Primário</Button>
        <Button variant="outline">Contorno</Button>
        <Button variant="ghost">Fantasma</Button>
      </div>
    </main>
  );
}
