import { Logger } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OutgoingEmail } from "./auth-email-templates";
import { MailtrapEmailService } from "./mailtrap-email.service";
import { FakeEmailService } from "../testing/fake-email.service";

describe("MailtrapEmailService", () => {
  let sent: OutgoingEmail[];
  let shouldFail: boolean;
  let service: MailtrapEmailService;

  beforeEach(() => {
    sent = [];
    shouldFail = false;
    service = new MailtrapEmailService(
      async (email) => {
        if (shouldFail) {
          throw new Error("smtp down");
        }

        sent.push(email);
      },
      { appUrl: "http://localhost:5173" },
    );
  });

  it("renders and forwards the account confirmation email", async () => {
    const expiresAt = new Date("2026-10-31T12:00:00.000Z");

    await service.sendEmailConfirmation({
      userId: "user-1",
      email: "user@example.com",
      token: "token-abc",
      expiresAt,
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("user@example.com");
    expect(sent[0]?.subject).toBe("Confirm your account");
    expect(sent[0]?.html).toContain(
      "http://localhost:5173/auth/confirm-account?token=token-abc",
    );
    expect(sent[0]?.html).toContain(expiresAt.toISOString());
  });

  it("renders and forwards the password reset email", async () => {
    const expiresAt = new Date("2026-10-31T13:00:00.000Z");

    await service.sendPasswordResetEmail({
      userId: "user-1",
      email: "user@example.com",
      token: "token-reset",
      expiresAt,
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe("Reset your password");
    expect(sent[0]?.html).toContain(
      "http://localhost:5173/auth/reset-password?token=token-reset",
    );
  });

  it("renders and forwards the new session email with time and user agent", async () => {
    const createdAt = new Date("2026-10-31T14:30:00.000Z");

    await service.sendNewSessionEmail({
      userId: "user-1",
      email: "user@example.com",
      sessionId: "session-42",
      createdAt,
      userAgent: "Mozilla/5.0 <script>",
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe("New session started");
    expect(sent[0]?.html).toContain(createdAt.toISOString());
    expect(sent[0]?.html).toContain("Mozilla/5.0 &lt;script&gt;");
    expect(sent[0]?.html).not.toContain("<script>");
  });

  it("truncates a long user agent in the new session email", async () => {
    await service.sendNewSessionEmail({
      userId: "user-1",
      email: "user@example.com",
      sessionId: "session-43",
      createdAt: new Date("2026-10-31T14:30:00.000Z"),
      userAgent: "a".repeat(300),
    });

    expect(sent[0]?.html).toContain(`${"a".repeat(120)}...`);
    expect(sent[0]?.html).not.toContain("a".repeat(121));
  });

  it("renders and forwards the password changed email", async () => {
    await service.sendPasswordChangedEmail({
      userId: "user-1",
      email: "user@example.com",
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.subject).toBe("Your password was changed");
  });

  it("rethrows delivery failures after logging without leaking the token", async () => {
    const errorSpy = vi
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);
    shouldFail = true;

    await expect(
      service.sendEmailConfirmation({
        userId: "user-1",
        email: "user@example.com",
        token: "token-secret",
        expiresAt: new Date(),
      }),
    ).rejects.toThrow("smtp down");

    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("FakeEmailService", () => {
  it("captures all four auth email templates", async () => {
    const fake = new FakeEmailService();

    await fake.sendEmailConfirmation({
      userId: "user-1",
      email: "user@example.com",
      token: "confirm-token",
      expiresAt: new Date("2026-10-31T12:00:00.000Z"),
    });
    await fake.sendNewSessionEmail({
      userId: "user-1",
      email: "user@example.com",
      sessionId: "session-42",
      createdAt: new Date("2026-10-31T14:30:00.000Z"),
      userAgent: "vitest",
    });
    await fake.sendPasswordResetEmail({
      userId: "user-1",
      email: "user@example.com",
      token: "reset-token",
      expiresAt: new Date("2026-10-31T13:00:00.000Z"),
    });
    await fake.sendPasswordChangedEmail({
      userId: "user-1",
      email: "user@example.com",
    });

    expect(fake.sent).toHaveLength(4);

    expect(fake.sent[0]).toMatchObject({
      to: "user@example.com",
      template: "email_confirmation",
      token: "confirm-token",
    });
    expect(fake.sent[1]).toMatchObject({
      to: "user@example.com",
      template: "new_session",
      sessionId: "session-42",
    });
    expect(fake.sent[2]).toMatchObject({
      to: "user@example.com",
      template: "password_reset",
      token: "reset-token",
    });
    expect(fake.sent[3]).toMatchObject({
      to: "user@example.com",
      template: "password_changed",
    });
  });
});
