import apiClient from './client';

export async function createComplaint(formDataOrObject) {
  let payload = formDataOrObject;
  const config = {};

  if (formDataOrObject instanceof FormData) {
    config.headers = { 'Content-Type': 'multipart/form-data' };
  } else if (typeof formDataOrObject === 'object' && formDataOrObject !== null) {
    const formData = new FormData();
    Object.entries(formDataOrObject).forEach(([key, val]) => {
      if (key === 'files' && Array.isArray(val)) {
        val.forEach((file) => formData.append('files', file));
      } else if (val !== undefined && val !== null) {
        formData.append(key, val);
      }
    });
    payload = formData;
    config.headers = { 'Content-Type': 'multipart/form-data' };
  }

  const response = await apiClient.post('/complaints', payload, config);
  return response.data.data;
}

export async function getComplaints(params = {}) {
  const response = await apiClient.get('/complaints', { params });
  return {
    data: response.data.data,
    meta: response.data.meta,
  };
}

export async function getComplaintById(id) {
  const response = await apiClient.get(`/complaints/${id}`);
  return response.data.data;
}

export function getAttachmentUrl(id, filename) {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  return `${baseURL}/complaints/${id}/attachments/${filename}`;
}

export async function downloadAttachment(id, filename) {
  const response = await apiClient.get(`/complaints/${id}/attachments/${filename}`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function assignComplaint(id, { assigneeId, note }) {
  const response = await apiClient.patch(`/complaints/${id}/assign`, {
    assigneeId,
    note,
  });
  return response.data.data;
}

export async function updateComplaintStatus(id, { toStatus, note, resolutionNotes }) {
  const response = await apiClient.patch(`/complaints/${id}/status`, {
    toStatus,
    note,
    resolutionNotes,
  });
  return response.data.data;
}

export async function verifyComplaint(id) {
  const response = await apiClient.post(`/complaints/${id}/verify`);
  return response.data.data;
}

export async function reopenComplaint(id, { reason }) {
  const response = await apiClient.post(`/complaints/${id}/reopen`, { reason });
  return response.data.data;
}

export async function submitFeedback(id, { rating, comment }) {
  const response = await apiClient.post(`/complaints/${id}/feedback`, {
    rating,
    comment,
  });
  return response.data.data;
}
