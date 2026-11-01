import { expect, test } from "@playwright/test";

// The Playwright runner is not wired into the workspace yet; this spec is
// executed by the integration job. `baseURL` is set here so the file does not
// depend on a project-level config that other specs may own.
test.use({ baseURL: "http://localhost:3000" });

const FORGOT_PASSWORD_URL = "/api/v1/auth/forgot-password";
const GENERIC_MESSAGE =
  "If an account exists for that email, we sent a link to reset your password. Check your inbox and spam folder.";

test.describe("auth forgot password", () => {
  test("renders the accessible form without a session", async ({ page }) => {
    await page.goto("/auth/forgot-password");

    await expect(
      page.getByRole("heading", { name: "Forgot your password?" }),
    ).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send reset link" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to sign in" }),
    ).toHaveAttribute("href", "/auth/sign-in");
  });

  test("blocks submission when the e-mail is malformed", async ({ page }) => {
    let requests = 0;

    await page.route(`**${FORGOT_PASSWORD_URL}`, async (route) => {
      requests += 1;
      await route.fulfill({ status: 202, body: "{}" });
    });

    await page.goto("/auth/forgot-password");
    await page.getByLabel("Email").fill("ada@example");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(page.getByLabel("Email")).toBeFocused();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    expect(requests).toBe(0);
  });

  test("shows the same generic feedback for an existing and an unknown e-mail", async ({
    page,
  }) => {
    await page.route(`**${FORGOT_PASSWORD_URL}`, async (route) => {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ message: GENERIC_MESSAGE }),
      });
    });

    await page.goto("/auth/forgot-password");

    for (const email of ["ada@example.com", "nobody@example.com"]) {
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Send reset link" }).click();

      await expect(page.getByRole("status")).toHaveText(GENERIC_MESSAGE);
    }
  });
});
