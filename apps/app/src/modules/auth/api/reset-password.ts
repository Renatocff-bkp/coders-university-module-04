import { apiRequest } from "../../../shared/api-client";

export interface ResetPasswordInput {
  token: string;
  password: string;
  passwordConfirmation: string;
}

export async function resetPassword(
  input: ResetPasswordInput,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest<void>("/api/v1/auth/reset-password", {
    method: "POST",
    body: input,
    signal,
  });
}
