import {
  type ApiResponse,
  type LoginResponse,
  type AuthMeResponse,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type ChangePasswordInput,
  type LoginInput,
} from "@hrms/shared";
import { api } from "@/lib/api";

export async function login(input: LoginInput): Promise<LoginResponse> {
  const res = await api.post<ApiResponse<LoginResponse>>("/auth/login", input);
  return res.data.data!;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function getMe(): Promise<AuthMeResponse> {
  const res = await api.get<ApiResponse<AuthMeResponse>>("/auth/me");
  return res.data.data!;
}

export async function forgotPassword(input: ForgotPasswordInput): Promise<{ sent: boolean; devLink?: string }> {
  const res = await api.post<ApiResponse<{ sent: boolean; devLink?: string }>>("/auth/forgot-password", input);
  return res.data.data ?? { sent: true };
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  await api.post("/auth/reset-password", input);
}

export async function changePassword(input: ChangePasswordInput): Promise<void> {
  await api.post("/auth/change-password", input);
}
