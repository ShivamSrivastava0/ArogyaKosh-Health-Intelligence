import api from './api';

/**
 * Get all family members
 */
export const getFamilyMembers = async () => {
  const response = await api.get('/family');
  return response.data;
};

/**
 * Add a new family member
 */
export const addFamilyMember = async (data) => {
  const response = await api.post('/family', data);
  return response.data;
};

/**
 * Get a specific family member
 */
export const getFamilyMember = async (id) => {
  const response = await api.get(`/family/${id}`);
  return response.data;
};

/**
 * Update a family member
 */
export const updateFamilyMember = async (id, data) => {
  const response = await api.patch(`/family/${id}`, data);
  return response.data;
};

/**
 * Delete a family member
 */
export const deleteFamilyMember = async (id) => {
  const response = await api.delete(`/family/${id}`);
  return response.data;
};
