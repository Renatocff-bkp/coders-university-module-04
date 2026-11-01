import { apiRequest } from "../../../shared/api-client";

export interface ForgotPasswordResponse {
  message: string;
}

export async function forgotPassword(
  email: string,
  signal?: AbortSignal,
): Promise<ForgotPasswordResponse> {
  const { data } = await apiRequest<ForgotPasswordResponse>(
    "/api/v1/auth/forgot-password",
    {
      method: "POST",
      body: { email },
      signal,
    },
  );

  return data;
}
