import type { AuthEmail } from "../domain/email-service";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
}

export interface RenderAuthEmailOptions {
  appUrl: string;
}

interface EmailContent {
  subject: string;
  intro: string[];
  action?: {
    label: string;
    url: string;
  };
  footnote?: string;
  expiresAt?: Date;
}

function escapeHtml(value: string): string {
  const escaped = value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] as string,
  );

  return escaped;
}

const USER_AGENT_MAX_LENGTH = 120;

function summarizeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return "unknown device";
  }

  return userAgent.length > USER_AGENT_MAX_LENGTH
    ? `${userAgent.slice(0, USER_AGENT_MAX_LENGTH)}...`
    : userAgent;
}

function renderHtml(content: EmailContent): string {
  const paragraphs = content.intro.map((text) => `<p>${text}</p>`).join("");
  const action = content.action
    ? `<p><a href="${escapeHtml(content.action.url)}">${content.action.label}</a></p>`
    : "";
  const expiry = content.expiresAt
    ? `<p>This link expires at ${content.expiresAt.toISOString()}.</p>`
    : "";
  const footnote = content.footnote ? `<p>${content.footnote}</p>` : "";

  return `<p>Hello,</p>${paragraphs}${action}${expiry}${footnote}`;
}

export function renderAuthEmail(
  email: AuthEmail,
  options: RenderAuthEmailOptions,
): OutgoingEmail {
  switch (email.template) {
    case "email_confirmation": {
      const token = email.token ?? "";

      return {
        to: email.to,
        subject: "Confirm your account",
        html: renderHtml({
          subject: "Confirm your account",
          intro: [
            "Confirm your account to activate it. This link expires in 24 hours.",
          ],
          action: {
            label: "Confirm account",
            url: `${options.appUrl}/auth/confirm-account?token=${token}`,
          },
          footnote:
            "If you did not create an account, you can safely ignore this email.",
          expiresAt: email.expiresAt ?? undefined,
        }),
      };
    }

    case "new_session": {
      return {
        to: email.to,
        subject: "New session started",
        html: renderHtml({
          subject: "New session started",
          intro: [
            "A new session was started on your account. If this was not you, revoke it from your account settings.",
            `Date and time: ${email.createdAt?.toISOString() ?? "unknown"}`,
            `Device: ${escapeHtml(summarizeUserAgent(email.userAgent))}`,
          ],
        }),
      };
    }

    case "password_reset": {
      const token = email.token ?? "";

      return {
        to: email.to,
        subject: "Reset your password",
        html: renderHtml({
          subject: "Reset your password",
          intro: [
            "We received a request to reset your password. This link expires in 60 minutes.",
          ],
          action: {
            label: "Reset password",
            url: `${options.appUrl}/auth/reset-password?token=${token}`,
          },
          footnote:
            "If you did not request a password reset, you can safely ignore this email.",
          expiresAt: email.expiresAt ?? undefined,
        }),
      };
    }

    case "password_changed": {
      return {
        to: email.to,
        subject: "Your password was changed",
        html: renderHtml({
          subject: "Your password was changed",
          intro: [
            "Your password was changed. If this was not you, contact the support team immediately.",
          ],
        }),
      };
    }
  }
}
