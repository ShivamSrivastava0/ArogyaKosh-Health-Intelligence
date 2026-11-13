import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import ApiError from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const UPLOAD_ROOT = path.resolve(env.server.uploadDir);
const ALLOWED = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(UPLOAD_ROOT, String(req.ownerId));
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  filename(_req, file, cb) {
    cb(null, `${crypto.randomUUID()}${ALLOWED[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    return cb(ApiError.badRequest('Only PDF, JPG, PNG or WEBP files are allowed'));
  },
});

export const uploadSingle = (field) => upload.single(field);

/** Absolute path for a stored key, guarded against path traversal. */
export const resolveUpload = (key) => {
  const abs = path.resolve(UPLOAD_ROOT, key);
  if (!abs.startsWith(UPLOAD_ROOT)) throw ApiError.badRequest('Invalid file path');
  return abs;
};

export const removeUpload = async (key) => {
  if (!key) return;
  try {
    await fs.promises.unlink(resolveUpload(key));
  } catch {
    /* already gone */
  }
};
