import { useAuth } from "../modules/auth/AuthProvider";

export default function HomePlaceholder() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? "there";

  return (
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16 sm:py-24">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Workspace
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Welcome, {firstName}
          </h1>
          <p className="max-w-prose text-base text-muted-foreground">
            Home placeholder — the authenticated area is on its way.
          </p>
        </header>
      </div>
    </main>
  );
}
