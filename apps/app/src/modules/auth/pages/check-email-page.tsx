import { Link } from "react-router-dom";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui";

export default function CheckEmailPage() {
  return (
    <main className="min-h-dvh bg-linen text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.16em] text-powder-blue">
            Authentication
          </p>
          <h1 className="font-sans text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Check your email
          </h1>
          <p className="text-base text-muted-foreground">
            We sent a confirmation link to the address you provided.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Open the link to continue</CardTitle>
            <CardDescription>
              Your account is created but not active yet. Opening the link in
              the email confirms your address and signs you in.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>
              The link expires in 24 hours. If it does not arrive within a few
              minutes, check your spam folder.
            </p>
          </CardContent>

          <CardFooter className="justify-center border-t">
            <Button asChild variant="outline">
              <Link to="/auth/sign-in">Back to sign in</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
