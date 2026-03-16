import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: ('pcm' | 'admin')[];
  region: string | null;
  active: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  roles: ('pcm' | 'admin')[];
  region?: string;
}

export interface UpdateUserRequest {
  name?: string;
  roles?: ('pcm' | 'admin')[];
  region?: string | null;
  password?: string;
}

export async function getUsers(): Promise<User[]> {
  const res = await apiClient.get<User[]>('/users');
  return res.data;
}

export async function createUser(data: CreateUserRequest): Promise<User> {
  const res = await apiClient.post<User>('/users', data);
  return res.data;
}

export async function updateUser(id: string, data: UpdateUserRequest): Promise<User> {
  const res = await apiClient.patch<User>(`/users/${id}`, data);
  return res.data;
}

export async function deactivateUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}
