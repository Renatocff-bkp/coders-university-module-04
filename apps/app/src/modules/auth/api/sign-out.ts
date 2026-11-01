import { apiRequest } from "../../../shared/api-client";

export async function signOut(
  token: string,
  signal?: AbortSignal,
): Promise<void> {
  await apiRequest<void>("/api/v1/auth/sign-out", {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    signal,
  });
}
