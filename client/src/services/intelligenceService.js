import api from './api';

/**
 * Send a chat message to the health assistant
 * @param {string} message - User's query
 * @param {Array} history - Previous messages [{ role, content }]
 */
export const sendChatMessage = async (message, history = []) => {
  const response = await api.post('/intelligence/chat', { message, history });
  return response.data;
};

/**
 * Parse a medical document with AI
 * @param {FormData} formData - Contains 'file' and optional 'reportId'
 */
export const parseDocument = async (formData) => {
  const response = await api.post('/intelligence/parse', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

/**
 * Get AI-generated health insights and ArogyaScore
 */
export const getInsights = async () => {
  const response = await api.get('/intelligence/insights');
  return response.data;
};

/**
 * Get AI-generated Pre-Doctor Brief
 */
export const getDoctorBrief = async () => {
  const response = await api.get('/intelligence/brief');
  return response.data;
};
