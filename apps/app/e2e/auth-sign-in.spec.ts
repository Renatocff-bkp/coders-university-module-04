import { expect, test } from "@playwright/test";

// The Playwright runner is not wired into the workspace yet; this spec is
// executed by the integration job. `baseURL` is set here so the file does not
// depend on a project-level config that other specs may own.
test.use({ baseURL: "http://localhost:3000" });

const SIGN_IN_URL = "/api/v1/auth/sign-in";
const SIGN_OUT_URL = "/api/v1/auth/sign-out";
const SESSION_URL = "/api/v1/auth/session";
const TOKEN_KEY = "auth.token";

const SIGNED_IN_USER = {
  id: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  emailConfirmedAt: "2026-10-31T12:00:00.000Z",
  createdAt: "2026-10-30T12:00:00.000Z",
  updatedAt: "2026-10-31T12:00:00.000Z",
};

async function fillCredentials(
  page: import("@playwright/test").Page,
  password = "correct-horse",
): Promise<void> {
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("auth sign-in", () => {
  test("renders the accessible form without a session", async ({ page }) => {
    await page.goto("/auth/sign-in");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Forgot your password?" }),
    ).toHaveAttribute("href", "/auth/forgot-password");
    await expect(
      page.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/auth/sign-up");
  });

  test("blocks submission and focuses the e-mail when it is invalid", async ({
    page,
  }) => {
    let requests = 0;

    await page.route(`**${SIGN_IN_URL}`, async (route) => {
      requests += 1;
      await route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password", { exact: true }).fill("correct-horse");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeFocused();
    expect(requests).toBe(0);
  });

  test("shows the generic message for invalid credentials and stays on the page", async ({
    page,
  }) => {
    await page.route(`**${SIGN_IN_URL}`, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password.",
            requestId: "e2e-401",
          },
        }),
      });
    });

    await page.goto("/auth/sign-in");
    await fillCredentials(page, "wrong-password");

    await expect(page.getByRole("alert")).toContainText(
      "Invalid email or password.",
    );
    await expect(page).toHaveURL(/\/auth\/sign-in$/);
    expect(
      await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
    ).toBeNull();
  });

  test("explains that an unconfirmed account must confirm the e-mail first", async ({
    page,
  }) => {
    await page.route(`**${SIGN_IN_URL}`, async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "EMAIL_NOT_CONFIRMED",
            message:
              "Confirm your email address before signing in. Open the confirmation link we sent you.",
            requestId: "e2e-403",
          },
        }),
      });
    });

    await page.goto("/auth/sign-in");
    await fillCredentials(page);

    await expect(page.getByRole("alert")).toContainText(
      "Confirm your email address before signing in",
    );
  });

  test("stores the token and navigates to /app on success", async ({
    page,
  }) => {
    await page.route(`**${SIGN_IN_URL}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "token-e2e", user: SIGNED_IN_USER }),
      });
    });
    await page.route(`**${SESSION_URL}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: SIGNED_IN_USER }),
      });
    });

    await page.goto("/auth/sign-in");
    await fillCredentials(page);

    await expect(page).toHaveURL(/\/app$/);
    await expect(
      page.getByRole("heading", { name: "Welcome, Ada" }),
    ).toBeVisible();
    expect(
      await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
    ).toBe("token-e2e");
  });

  test("sends the user back to sign-in with a notice when the session was revoked", async ({
    page,
  }) => {
    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [TOKEN_KEY, "token-revoked"],
    );
    await page.route(`**${SESSION_URL}`, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "UNAUTHORIZED",
            message: "Invalid or expired token",
            requestId: "e2e-revoked",
          },
        }),
      });
    });

    await page.goto("/app");

    await expect(page).toHaveURL(/\/auth\/sign-in\?session=ended$/);
    await expect(page.getByRole("status")).toContainText(
      "Your session has ended",
    );
    expect(
      await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
    ).toBeNull();
  });

  test("signs out, revokes the session on the server and returns to sign-in", async ({
    page,
  }) => {
    let signOutAuthorization: string | undefined;

    await page.addInitScript(
      ([key, value]) => localStorage.setItem(key, value),
      [TOKEN_KEY, "token-logout"],
    );
    await page.route(`**${SESSION_URL}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: SIGNED_IN_USER }),
      });
    });
    await page.route(`**${SIGN_OUT_URL}`, async (route) => {
      signOutAuthorization = route.request().headers().authorization;
      await route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/app");
    await page.getByRole("button", { name: "Sign out" }).click();

    await expect(page).toHaveURL(/\/auth\/sign-in$/);
    expect(signOutAuthorization).toBe("Bearer token-logout");
    expect(
      await page.evaluate((key) => localStorage.getItem(key), TOKEN_KEY),
    ).toBeNull();
  });
});
