import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

/**
 * Validate express-validator rules
 * @param {Array} validations - Array of express-validator rules
 * @returns {Function} Express middleware
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map((err) => ({ [err.path]: err.msg }));

    return next(
      new ApiError(HTTP_STATUS.BAD_REQUEST, 'Validation Error', extractedErrors)
    );
  };
};

export default validate;
