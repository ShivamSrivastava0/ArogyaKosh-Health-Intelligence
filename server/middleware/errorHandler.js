import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/index.js';
import multer from 'multer';

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  let customErrors = [];

  // Log error for dev
  if (env.server.nodeEnv === 'development') {
    console.error(err);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new ApiError(HTTP_STATUS.NOT_FOUND, message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    customErrors = Object.values(err.errors).map((val) => val.message);
    error = new ApiError(HTTP_STATUS.BAD_REQUEST, message, customErrors);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new ApiError(HTTP_STATUS.BAD_REQUEST, message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = new ApiError(HTTP_STATUS.UNAUTHORIZED, message);
  }

  // Multer errors
  if (err instanceof multer.MulterError) {
    const message = `File upload error: ${err.message}`;
    error = new ApiError(HTTP_STATUS.BAD_REQUEST, message);
  }

  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = error.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
    errors: error.errors?.length ? error.errors : (env.server.nodeEnv === 'development' ? [err.stack] : ['Something went wrong']),
  });
};

export default errorHandler;
