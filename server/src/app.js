import cors from "cors";
import express from "express";
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import env from "./config/env.js";
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import healthRoutes from "./routes/health.routes.js";
import analysisRoutes from './routes/analysis.routes.js';

const app = express();

app.disable('x-powered-by');
if (env.trustProxy) app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origin is not allowed by CORS'), { status: 403 }));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-8',
  legacyHeaders: false
}));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

app.use("/api/health", healthRoutes);
app.use('/api/analysis', analysisRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
