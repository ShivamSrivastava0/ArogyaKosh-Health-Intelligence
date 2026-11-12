import multer from 'multer';
import { env } from '../config/env.js';

/* eslint-disable no-unused-vars */
const errorHandler = (err, req, res, _next) => {
  let status = err.statusCode || 500;
  let message = err.message || 'Something went wrong';
  let errors = err.errors && Array.isArray(err.errors) ? err.errors : [];

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    message = errors[0]?.message || 'Validation failed';
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = 'That record already exists';
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 15 MB)' : err.message;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500 && !err.isOperational) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    if (env.server.isProd) message = 'Something went wrong. Please try again.';
  }

  res.status(status).json({ success: false, message, data: null, errors });
};

export default errorHandler;
