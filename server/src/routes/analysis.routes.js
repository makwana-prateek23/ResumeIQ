import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { analyzeResume } from '../controllers/analysis.controller.js';

const router = Router();
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: MAX_FILE_SIZE, fields: 2 },
  fileFilter(_req, file, callback) {
    const hasPdfExtension = file.originalname.toLowerCase().endsWith('.pdf');
    const hasPdfMime = file.mimetype === 'application/pdf';
    if (!hasPdfExtension || !hasPdfMime) {
      return callback(Object.assign(new Error('Only PDF files are allowed'), { status: 415 }));
    }
    return callback(null, true);
  }
});

const analysisLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many analysis requests. Please try again later.' }
});

router.post('/', analysisLimiter, upload.single('resume'), analyzeResume);

export default router;
