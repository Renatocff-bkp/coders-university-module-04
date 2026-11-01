import { expect, test } from "@playwright/test";

// The Playwright runner is not wired into the workspace yet; this spec is
// executed by the integration job. `baseURL` is set here so the file does not
// depend on a project-level config that other specs may own.
test.use({ baseURL: "http://localhost:3000" });

const SIGN_UP_URL = "/api/v1/auth/sign-up";

test.describe("auth sign-up", () => {
  test("renders the complete accessible form", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await expect(
      page.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
    await expect(page.getByLabel("First name")).toBeVisible();
    await expect(page.getByLabel("Last name")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in",
    );
  });

  test("blocks submission when the passwords diverge", async ({ page }) => {
    let requests = 0;

    await page.route(`**${SIGN_UP_URL}`, async (route) => {
      requests += 1;
      await route.fulfill({ status: 202, body: "{}" });
    });

    await page.goto("/auth/sign-up");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Lovelace");
    await page.getByLabel("Email").fill("ada@example.com");
    await page.getByLabel("Password", { exact: true }).fill("correct-horse");
    await page.getByLabel("Confirm password").fill("different-password");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Passwords do not match",
    );
    await expect(page.getByLabel("Confirm password")).toBeFocused();
    expect(requests).toBe(0);
  });

  test("answers 202 by navigating to the check-email feedback", async ({
    page,
  }) => {
    await page.route(`**${SIGN_UP_URL}`, async (route) => {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Check your email to confirm your account",
        }),
      });
    });

    await page.goto("/auth/sign-up");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Lovelace");
    await page.getByLabel("Email").fill("ada@example.com");
    await page.getByLabel("Password", { exact: true }).fill("correct-horse");
    await page.getByLabel("Confirm password").fill("correct-horse");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/auth\/check-email$/);
    await expect(
      page.getByRole("heading", { name: "Check your email" }),
    ).toBeVisible();
    await expect(
      page.getByText("We sent a confirmation link", { exact: false }),
    ).toBeVisible();
  });
});
