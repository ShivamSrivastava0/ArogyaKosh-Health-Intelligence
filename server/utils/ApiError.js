import { HTTP_STATUS } from '../constants/index.js';

export default class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }

  static badRequest(msg, errors = []) { return new ApiError(HTTP_STATUS.BAD_REQUEST, msg, errors); }
  static unauthorized(msg = 'Please sign in to continue') { return new ApiError(HTTP_STATUS.UNAUTHORIZED, msg); }
  static forbidden(msg = 'You do not have access to this resource') { return new ApiError(HTTP_STATUS.FORBIDDEN, msg); }
  static notFound(msg = 'Not found') { return new ApiError(HTTP_STATUS.NOT_FOUND, msg); }
  static conflict(msg) { return new ApiError(HTTP_STATUS.CONFLICT, msg); }
  static gone(msg) { return new ApiError(410, msg); }
  static unavailable(msg) { return new ApiError(HTTP_STATUS.SERVICE_UNAVAILABLE, msg); }
  static internal(msg = 'Something went wrong') { return new ApiError(HTTP_STATUS.INTERNAL_SERVER_ERROR, msg); }
}
