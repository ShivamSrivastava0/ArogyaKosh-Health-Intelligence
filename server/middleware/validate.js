import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/** Runs express-validator chains and returns a single readable 400 on failure. */
const validate = (validations) => async (req, _res, next) => {
  await Promise.all(validations.map((v) => v.run(req)));
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  return next(ApiError.badRequest(errors[0].message, errors));
};

export default validate;
