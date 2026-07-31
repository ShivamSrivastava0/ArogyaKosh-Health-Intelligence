import { HTTP_STATUS } from '../constants/index.js';

/**
 * Custom API Error class extending Error
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array} [errors=[]] - Array of specific errors
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, errors = []) {
    return new ApiError(HTTP_STATUS.BAD_REQUEST, msg, errors);
  }

  static unauthorized(msg) {
    return new ApiError(HTTP_STATUS.UNAUTHORIZED, msg);
  }

  static forbidden(msg) {
    return new ApiError(HTTP_STATUS.FORBIDDEN, msg);
  }

  static notFound(msg) {
    return new ApiError(HTTP_STATUS.NOT_FOUND, msg);
  }

  static conflict(msg) {
    return new ApiError(HTTP_STATUS.CONFLICT, msg);
  }

  static internal(msg) {
    return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, msg);
  }
}

export default ApiError;
