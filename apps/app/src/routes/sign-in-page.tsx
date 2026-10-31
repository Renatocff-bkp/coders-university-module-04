export default function SignInPage() {
  return (
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Authentication
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Sign in
          </h1>
          <p className="text-base text-muted-foreground">
            The sign-in flow is on its way. This is the public entry point.
          </p>
        </header>
      </div>
    </main>
  );
}
