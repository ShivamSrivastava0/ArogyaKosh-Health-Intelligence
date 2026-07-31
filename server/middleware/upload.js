import multer from 'multer';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

// Configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

// Memory storage setup
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid file type. Only PDF, JPG, JPEG, and PNG are allowed.'), false);
  }
};

// Initialize multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Middleware for single file upload
 * @param {string} fieldName - Form field name
 */
export const uploadSingle = (fieldName) => upload.single(fieldName);

/**
 * Middleware for multiple files upload
 * @param {string} fieldName - Form field name
 * @param {number} maxCount - Max number of files
 */
export const uploadMultiple = (fieldName, maxCount) => upload.array(fieldName, maxCount);
