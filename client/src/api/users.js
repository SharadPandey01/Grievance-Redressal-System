import apiClient from './client';

export async function getUsers(params = {}) {
  const response = await apiClient.get('/users', { params });
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

export async function createUser(data) {
  const response = await apiClient.post('/users', data);
  return response.data.data;
}

export async function updateUser(id, data) {
  const response = await apiClient.patch(`/users/${id}`, data);
  return response.data.data;
}

export async function getOfficers(params = {}) {
  const response = await apiClient.get('/users/officers', { params });
  return response.data.data;
}
