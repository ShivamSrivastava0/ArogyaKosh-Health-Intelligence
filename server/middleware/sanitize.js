/**
 * Strips keys that start with "$" or contain "." from user input so values
 * like { "email": { "$gt": "" } } can never reach a MongoDB filter.
 */
const clean = (value, depth = 0) => {
  if (depth > 12 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => clean(v, depth + 1));
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.')) delete value[key];
    else value[key] = clean(value[key], depth + 1);
  }
  return value;
};

const sanitize = (req, _res, next) => {
  if (req.body) clean(req.body);
  if (req.params) clean(req.params);
  if (req.query) {
    for (const key of Object.keys(req.query)) {
      // Query values must be plain strings; nested objects are never expected.
      if (typeof req.query[key] === 'object') delete req.query[key];
    }
  }
  next();
};

export default sanitize;
