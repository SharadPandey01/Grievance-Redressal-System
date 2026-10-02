import apiClient from './client';

export async function getCategories(params = {}) {
  const response = await apiClient.get('/categories', { params });
  return response.data.data;
}

export async function createCategory(data) {
  const response = await apiClient.post('/categories', data);
  return response.data.data;
}

export async function updateCategory(id, data) {
  const response = await apiClient.patch(`/categories/${id}`, data);
  return response.data.data;
}

export async function deleteCategory(id) {
  const response = await apiClient.delete(`/categories/${id}`);
  return response.data.data;
}
