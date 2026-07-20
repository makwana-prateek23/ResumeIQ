import env from '../config/env.js';
import multer from 'multer';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Not found', path: req.path });
}

export function errorHandler(error, _req, res, _next) {
  let status = Number.isInteger(error.status) ? error.status : 500;
  let message = error.message;

  if (error instanceof multer.MulterError) {
    status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Resume file must be 5 MB or smaller'
      : 'Invalid file upload';
  }
  const isServerError = status >= 500;

  if (isServerError) console.error(error);

  res.status(status).json({
    error: isServerError ? 'Internal server error' : message,
    ...(env.nodeEnv === 'development' && isServerError ? { detail: error.message } : {})
  });
}
