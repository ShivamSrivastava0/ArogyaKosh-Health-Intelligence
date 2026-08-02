import api from './api';

export const predictHeartDisease = async (data) => {
  const response = await api.post('/predict/heart', data);
  return response.data;
};

export const predictDiabetes = async (data) => {
  const response = await api.post('/predict/diabetes', data);
  return response.data;
};

export const predictHypertension = async (data) => {
  const response = await api.post('/predict/hypertension', data);
  return response.data;
};
