import dotenv from 'dotenv';
dotenv.config();

const required = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const isPlaceholder = (v) => !v || /^your[_-]/i.test(v);
const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  server: {
    port: Number(process.env.PORT) || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    isProd: process.env.NODE_ENV === 'production',
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
    publicApiUrl: process.env.PUBLIC_API_URL || `http://localhost:${Number(process.env.PORT) || 5000}/api`,
  },
  db: { uri: process.env.MONGODB_URI },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: isPlaceholder(process.env.SMTP_PASS) ? '' : process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
  },
  gemini: {
    apiKey: isPlaceholder(process.env.GEMINI_API_KEY) ? '' : process.env.GEMINI_API_KEY,
    // A moving alias, so Google retiring a pinned version doesn't break the app.
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    fallbackModel: 'gemini-flash-latest',
    liteModel: 'gemini-flash-lite-latest',
  },
  google: {
    clientId: isPlaceholder(process.env.GOOGLE_CLIENT_ID) ? '' : process.env.GOOGLE_CLIENT_ID,
    clientSecret: isPlaceholder(process.env.GOOGLE_CLIENT_SECRET) ? '' : process.env.GOOGLE_CLIENT_SECRET,
  },
  client: {
    urls: clientUrls,
    url: clientUrls[0],
  },
  jobs: {
    enabled: process.env.JOBS_ENABLED !== 'false',
  },
};
