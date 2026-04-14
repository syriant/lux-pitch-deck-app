import axios from 'axios';
import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: ('pcm' | 'admin')[];
  region: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export async function loginApi(data: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/login', data);
  return res.data;
}

export async function refreshApi(refreshToken: string): Promise<RefreshResponse> {
  const res = await axios.post<RefreshResponse>(
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    { refreshToken },
  );
  return res.data;
}

export async function logoutApi(): Promise<void> {
  await apiClient.post('/auth/logout').catch(() => {});
}

export async function getMeApi(): Promise<AuthUser> {
  const res = await apiClient.get<AuthUser>('/auth/me');
  return res.data;
}

export async function microsoftLoginApi(idToken: string): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/microsoft', { idToken });
  return res.data;
}
