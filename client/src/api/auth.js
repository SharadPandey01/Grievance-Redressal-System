import apiClient from './client';

export async function register(userData) {
  const response = await apiClient.post('/auth/register', userData);
  return response.data.data;
}

export async function login(credentials) {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data.data;
}

export async function getMe() {
  const response = await apiClient.get('/auth/me');
  return response.data.data;
}

export async function updateMe(data) {
  const response = await apiClient.patch('/auth/me', data);
  return response.data.data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const response = await apiClient.post('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data.data;
}
