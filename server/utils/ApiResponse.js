import { HTTP_STATUS } from '../constants/index.js';

/** Uniform envelope: { success, message, data } */
export default class ApiResponse {
  static success(res, message, data = null, statusCode = HTTP_STATUS.OK) {
    return res.status(statusCode).json({ success: true, message, data });
  }

  static created(res, message, data = null) {
    return ApiResponse.success(res, message, data, HTTP_STATUS.CREATED);
  }
}
