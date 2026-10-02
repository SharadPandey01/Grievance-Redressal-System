import apiClient from './client';

export async function getComments(complaintId) {
  const response = await apiClient.get(`/complaints/${complaintId}/comments`);
  return response.data.data;
}

export async function postComment(complaintId, { text, isInternal = false }) {
  const response = await apiClient.post(`/complaints/${complaintId}/comments`, {
    text,
    isInternal,
  });
  return response.data.data;
}
