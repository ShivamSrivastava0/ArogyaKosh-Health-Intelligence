import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';
import asyncHandler from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/index.js';
import User from '../models/User.js';

/**
 * Middleware to protect routes via JWT token
 */
export const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(ApiError.unauthorized('Not authorized to access this route'));
  }

  try {
    const decoded = jwt.verify(token, env.jwt.accessSecret);

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return next(ApiError.unauthorized('User not found or account deactivated'));
    }

    req.user = user;
    next();
  } catch (err) {
    return next(ApiError.unauthorized('Not authorized to access this route'));
  }
});

/**
 * Middleware to restrict access to specific roles
 * @param  {...string} roles - Allowed roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new ApiError(
          HTTP_STATUS.FORBIDDEN,
          `User role ${req.user ? req.user.role : 'Unknown'} is not authorized to access this route`
        )
      );
    }
    next();
  };
};
