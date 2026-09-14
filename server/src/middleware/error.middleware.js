import env from '../config/env.js';
import multer from 'multer';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
}

export function errorHandler(error, _req, res, _next) {
  let status = Number.isInteger(error.status) ? error.status : 500;
  let message = error.message;

  const isDatabaseAuthenticationError = error?.name === 'MongoServerError'
    && (error?.code === 18 || error?.code === 8000 || /authentication failed|bad auth/i.test(error?.message));
  const isDatabaseUnavailable = isDatabaseAuthenticationError
    || error?.name === 'MongoServerSelectionError'
    || error?.code === 'ETIMEOUT';

  if (isDatabaseUnavailable) {
    status = 503;
    message = 'Account service is temporarily unavailable. Please try again shortly.';
  }

  if (error instanceof multer.MulterError) {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Resume file must be 5 MB or smaller'
      : 'Invalid file upload';
  }
  if (error.name === 'ZodError') {
    status = 400;
    message = error.issues?.[0]?.message ?? 'Invalid account details';
  }
  const isServerError = status >= 500;

  if (isServerError) console.error(error);

  res.status(status).json({
    error: isServerError && !isDatabaseUnavailable ? 'Internal server error' : message,
    ...(env.nodeEnv === 'development' && isServerError ? { detail: error.message } : {})
  });
}
