import { apiRequest, type PublicAuthUser } from "../../../shared/api-client";

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignInResponse {
  token: string;
  user: PublicAuthUser;
}

export async function signIn(
  payload: SignInPayload,
  signal?: AbortSignal,
): Promise<SignInResponse> {
  const { data } = await apiRequest<SignInResponse>("/api/v1/auth/sign-in", {
    method: "POST",
    body: payload,
    signal,
  });

  return data;
}
