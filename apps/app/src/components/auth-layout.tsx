import type { ReactNode } from "react";

interface AuthLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh lg:grid-cols-2">
        <aside
          aria-hidden="true"
          className="relative hidden overflow-hidden bg-gradient-to-br from-linen via-powder-petal to-soft-blush lg:flex lg:flex-col lg:justify-between lg:p-12"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
                aria-hidden="true"
              >
                <path d="M12 2l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1 3-6z" />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-tight text-foreground/80">
              Coders University
            </span>
          </div>

          <div className="max-w-md">
            <p className="text-xs font-medium tracking-[0.2em] text-powder-blue">
              Executive AI agents
            </p>
            <h2 className="mt-4 font-sans text-4xl font-semibold tracking-tight text-foreground">
              Decisions shaped by specialists, powered by your data.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Secure access to your workspace. Every action is tracked and
              auditable.
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Coders University
          </p>
        </aside>

        <section className="flex flex-col justify-center px-4 py-10 sm:px-6 sm:py-16 lg:px-12">
          <div className="mx-auto w-full max-w-md">
            <header className="mb-8 flex flex-col gap-3">
              <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
                {eyebrow}
              </p>
              <h1 className="font-sans text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="text-base text-muted-foreground">{description}</p>
            </header>

            {children}

            {footer ? (
              <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
