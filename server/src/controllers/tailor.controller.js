import { tailorWithGemini } from '../services/gemini.service.js';

export async function tailorResume(req, res, next) {
  try {
    res.json(await tailorWithGemini(req.body));
  } catch (error) {
    if (error.name === 'ZodError') return next(error);
    // Return only service-owned messages; never log provider payloads or keys.
    if (error.status) return res.status(error.status).json({ error: error.message });
    return next(error);
  }
}
