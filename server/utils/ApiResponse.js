import { HTTP_STATUS } from '../constants/index.js';

/**
 * Standard API Response format
 */
class ApiResponse {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Response message
   * @param {any} [data=null] - Response payload
   */
  constructor(statusCode, message, data = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }

  /**
   * Return standardized JSON format
   */
  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      errors: null,
    };
  }

  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {string} message - Success message
   * @param {any} [data=null] - Data payload
   * @param {number} [statusCode=200] - HTTP status code
   */
  static success(res, message, data = null, statusCode = HTTP_STATUS.OK) {
    const response = new ApiResponse(statusCode, message, data);
    return res.status(statusCode).json(response.toJSON());
  }

  /**
   * Send a created response
   * @param {Object} res - Express response object
   * @param {string} message - Created message
   * @param {any} [data=null] - Data payload
   */
  static created(res, message, data = null) {
    return this.success(res, message, data, HTTP_STATUS.CREATED);
  }
}

export default ApiResponse;
