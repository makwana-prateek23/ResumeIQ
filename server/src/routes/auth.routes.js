import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, oauthCallback, oauthStart, signup } from '../controllers/auth.controller.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/oauth/:provider', authLimiter, oauthStart);
router.get('/oauth/:provider/callback', authLimiter, oauthCallback);
export default router;
