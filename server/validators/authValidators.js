import { body } from 'express-validator';

const email = () => body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email').toLowerCase();
const strongPassword = (field = 'password') => body(field)
  .isString().withMessage('Password is required')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Za-z]/).withMessage('Password needs at least one letter')
  .matches(/[0-9]/).withMessage('Password needs at least one number');

export const registerValidator = [
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Enter your name (2–60 characters)'),
  email(),
  strongPassword(),
];

export const loginValidator = [email(), body('password').isString().notEmpty().withMessage('Password is required')];
export const forgotPasswordValidator = [email()];
export const resetPasswordValidator = [strongPassword()];
export const changePasswordValidator = [strongPassword('newPassword')];
