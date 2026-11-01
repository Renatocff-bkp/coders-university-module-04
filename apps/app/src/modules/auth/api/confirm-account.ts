import { apiRequest, type PublicAuthUser } from "../../../shared/api-client";

export interface ConfirmAccountResponse {
  token: string;
  user: PublicAuthUser;
}

export async function confirmAccount(
  token: string,
  signal?: AbortSignal,
): Promise<ConfirmAccountResponse> {
  const { data } = await apiRequest<ConfirmAccountResponse>(
    "/api/v1/auth/confirm-account",
    {
      method: "POST",
      body: { token },
      signal,
    },
  );

  return data;
}
