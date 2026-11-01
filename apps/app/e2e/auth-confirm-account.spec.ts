import { expect, test } from "@playwright/test";

// The Playwright runner is not wired into the workspace yet; this spec is
// executed by the integration job (status: deferred). `baseURL` is set here so
// the file does not depend on a project-level config that other specs may own.
test.use({ baseURL: "http://localhost:3000" });

const CONFIRM_URL = "/api/v1/auth/confirm-account";
const SESSION_URL = "/api/v1/auth/session";
const STORAGE_KEY = "auth.token";
const SESSION_TOKEN = "session-token-from-api";

const CONFIRMED_USER = {
  id: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  emailConfirmedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

test.describe("auth confirm account", () => {
  test("a valid link confirms the account, stores the session and opens /app", async ({
    page,
  }) => {
    await page.route(`**${CONFIRM_URL}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: SESSION_TOKEN,
          user: CONFIRMED_USER,
        }),
      });
    });
    await page.route(`**${SESSION_URL}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: CONFIRMED_USER }),
      });
    });

    await page.goto("/auth/confirm-account?token=valid-token");

    await expect(page).toHaveURL(/\/app$/);
    await expect(page).not.toHaveURL(/token=/);
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBe(SESSION_TOKEN);
  });

  test("an expired or already used link shows an accessible error with a sign-in link", async ({
    page,
  }) => {
    let requests = 0;

    await page.route(`**${CONFIRM_URL}`, async (route) => {
      requests += 1;
      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token",
          },
        }),
      });
    });

    await page.goto("/auth/confirm-account?token=expired-token");

    await expect(page.getByRole("alert")).toContainText(
      "This confirmation link is invalid",
    );
    await expect(
      page.getByRole("link", { name: "Go to sign in" }),
    ).toHaveAttribute("href", "/auth/sign-in");
    await expect(page).not.toHaveURL(/token=/);
    expect(requests).toBe(1);
  });

  test("a reused link does not create a second session", async ({ page }) => {
    let requests = 0;

    await page.route(`**${CONFIRM_URL}`, async (route) => {
      requests += 1;
      await route.fulfill({
        status: 410,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token",
          },
        }),
      });
    });

    await page.goto("/auth/confirm-account?token=used-token");

    await expect(page.getByRole("alert")).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY),
      )
      .toBeNull();
    expect(requests).toBe(1);
  });
});
