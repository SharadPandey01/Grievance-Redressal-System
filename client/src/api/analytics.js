import apiClient from './client';

export async function getSummary() {
  const response = await apiClient.get('/analytics/summary');
  return response.data.data;
}

export async function getMySummary() {
  const response = await apiClient.get('/analytics/my-summary');
  return response.data.data;
}
