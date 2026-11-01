import { apiRequest } from "../../../shared/api-client";

export interface SignUpPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}

export interface SignUpResponse {
  message: string;
}

export async function signUp(
  payload: SignUpPayload,
  signal?: AbortSignal,
): Promise<SignUpResponse> {
  const { data } = await apiRequest<SignUpResponse>("/api/v1/auth/sign-up", {
    method: "POST",
    body: payload,
    signal,
  });

  return data;
}
