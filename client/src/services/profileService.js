import api from './api';

/**
 * Get current user's health profile
 */
export const getProfile = async () => {
  const response = await api.get('/profile');
  return response.data;
};

/**
 * Create health profile
 * @param {Object} data - Profile data
 */
export const createProfile = async (data) => {
  const response = await api.post('/profile', data);
  return response.data;
};

/**
 * Partial update health profile
 * @param {Object} data - Fields to update (any combination of sections)
 */
export const updateProfile = async (data) => {
  const response = await api.patch('/profile', data);
  return response.data;
};
