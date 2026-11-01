import { expect, test, type Page } from "@playwright/test";

const RESET_PATH = "/auth/reset-password";
const RESET_ENDPOINT = "**/api/v1/auth/reset-password";
const VALID_TOKEN = "valid-reset-token";
const NEW_PASSWORD = "brand-new-secret";

async function mockResetEndpoint(
  page: Page,
  status: 204 | 410 | 400,
): Promise<{ bodies: unknown[] }> {
  const bodies: unknown[] = [];

  await page.route(RESET_ENDPOINT, async (route) => {
    bodies.push(route.request().postDataJSON());

    if (status === 204) {
      await route.fulfill({ status: 204 });
      return;
    }

    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(
        status === 410
          ? {
              error: {
                code: "INVALID_TOKEN",
                message: "Invalid or expired token",
                requestId: "e2e",
              },
            }
          : {
              error: {
                code: "VALIDATION_ERROR",
                message: "Validation failed",
                fields: [
                  {
                    field: "password",
                    messages: ["Password must be at least 8 characters"],
                  },
                ],
                requestId: "e2e",
              },
            },
      ),
    });
  });

  return { bodies };
}

test.describe("reset password", () => {
  test("valid token changes the password and lands on sign-in with a notice", async ({
    page,
  }) => {
    const { bodies } = await mockResetEndpoint(page, 204);

    await page.goto(`${RESET_PATH}?token=${VALID_TOKEN}`);
    await expect(page).toHaveURL(new RegExp(`${RESET_PATH}$`));

    await page.getByLabel("New password").fill(NEW_PASSWORD);
    await page.getByLabel("Confirm new password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page).toHaveURL(/\/auth\/sign-in\?password=reset$/);
    await expect(
      page.getByText(
        "Your password was changed. Sign in with your new password.",
      ),
    ).toBeVisible();
    expect(bodies).toEqual([
      {
        token: VALID_TOKEN,
        password: NEW_PASSWORD,
        passwordConfirmation: NEW_PASSWORD,
      },
    ]);
  });

  test("mismatched passwords block the submit and focus the confirmation", async ({
    page,
  }) => {
    const { bodies } = await mockResetEndpoint(page, 204);

    await page.goto(`${RESET_PATH}?token=${VALID_TOKEN}`);
    await page.getByLabel("New password").fill(NEW_PASSWORD);
    await page.getByLabel("Confirm new password").fill("different-secret");
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
    await expect(page.getByLabel("Confirm new password")).toBeFocused();
    expect(bodies).toHaveLength(0);
  });

  test("an expired or reused token shows the invalid-link state with a new-reset link", async ({
    page,
  }) => {
    await mockResetEndpoint(page, 410);

    await page.goto(`${RESET_PATH}?token=${VALID_TOKEN}`);
    await page.getByLabel("New password").fill(NEW_PASSWORD);
    await page.getByLabel("Confirm new password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Reset password" }).click();

    await expect(
      page.getByText(
        "This reset link is invalid, expired or has already been used.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Request a new reset link" }),
    ).toHaveAttribute("href", "/auth/forgot-password");
  });

  test("the token is removed from the address bar after the page loads", async ({
    page,
  }) => {
    await page.goto(`${RESET_PATH}?token=${VALID_TOKEN}`);

    await expect(page).toHaveURL(new RegExp(`${RESET_PATH}$`));
    await expect(page).not.toHaveURL(/token=/);
  });
});
