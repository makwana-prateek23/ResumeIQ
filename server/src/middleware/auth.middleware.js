import { findUserById, verifyToken } from '../services/auth.service.js';

export async function requireAuth(req, _res, next) {
  try {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) throw Object.assign(new Error('Sign in is required to use this feature'), { status: 401 });
    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);
    if (!user) throw Object.assign(new Error('Your session is no longer valid'), { status: 401 });
    req.user = user;
    next();
  } catch (error) {
    if (!error.status) error.status = 401;
    next(error);
  }
}
