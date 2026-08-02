import api from './api';

/**
 * Get all medical reports with optional filters
 */
export const getReports = async (params = {}) => {
  const response = await api.get('/reports', { params });
  return response.data;
};

/**
 * Upload a new medical report
 * @param {FormData} formData - must include 'file' field + metadata
 */
export const uploadReport = async (formData) => {
  const response = await api.post('/reports', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Get a specific report
 */
export const getReport = async (id) => {
  const response = await api.get(`/reports/${id}`);
  return response.data;
};

/**
 * Update report metadata
 */
export const updateReport = async (id, data) => {
  const response = await api.patch(`/reports/${id}`, data);
  return response.data;
};

/**
 * Delete a report
 */
export const deleteReport = async (id) => {
  const response = await api.delete(`/reports/${id}`);
  return response.data;
};
