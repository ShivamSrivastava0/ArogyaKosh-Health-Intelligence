import axios from 'axios';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * @desc    Get Heart Disease Prediction
 * @route   POST /api/predict/heart
 * @access  Private
 */
export const predictHeartDisease = asyncHandler(async (req, res, next) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict/heart`, req.body);
    return ApiResponse.success(res, 'Prediction successful', response.data.data);
  } catch (error) {
    if (error.response) {
      return next(new ApiError(error.response.status, error.response.data.message || 'ML Service Error'));
    }
    return next(ApiError.internal('Could not connect to ML Service'));
  }
});

/**
 * @desc    Get Diabetes Prediction
 * @route   POST /api/predict/diabetes
 * @access  Private
 */
export const predictDiabetes = asyncHandler(async (req, res, next) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict/diabetes`, req.body);
    return ApiResponse.success(res, 'Prediction successful', response.data.data);
  } catch (error) {
    if (error.response) {
      return next(new ApiError(error.response.status, error.response.data.message || 'ML Service Error'));
    }
    return next(ApiError.internal('Could not connect to ML Service'));
  }
});

/**
 * @desc    Get Hypertension Prediction
 * @route   POST /api/predict/hypertension
 * @access  Private
 */
export const predictHypertension = asyncHandler(async (req, res, next) => {
  try {
    const response = await axios.post(`${ML_SERVICE_URL}/predict/hypertension`, req.body);
    return ApiResponse.success(res, 'Prediction successful', response.data.data);
  } catch (error) {
    if (error.response) {
      return next(new ApiError(error.response.status, error.response.data.message || 'ML Service Error'));
    }
    return next(ApiError.internal('Could not connect to ML Service'));
  }
});
