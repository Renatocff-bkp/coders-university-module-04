import { Link } from "react-router-dom";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui";

import { AuthLayout } from "../../../components/auth-layout";

export default function CheckEmailPage() {
  return (
    <AuthLayout
      eyebrow="Authentication"
      title="Check your email"
      description="We sent a confirmation link to the address you provided."
      footer={
        <>
          Already confirmed?{" "}
          <Link
            to="/auth/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </>
      }
    >
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="gap-3">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6"
              aria-hidden="true"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <CardTitle className="text-lg">Open the link to continue</CardTitle>
          <CardDescription>
            Your account is created but not active yet. Opening the link in the
            email confirms your address and signs you in.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            The link expires in 24 hours. If it does not arrive within a few
            minutes, check your spam folder.
          </p>
          <Button asChild variant="outline" className="h-10 w-full">
            <Link to="/auth/sign-in">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
