import cors from 'cors';
import type { Express } from 'express';

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsOptions = {
  origin(
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean) => void
  ) {
    // Allow requests without an Origin header
    // (Postman, server-to-server requests, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS: Origin not allowed: ${origin}`));
  },

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-admin-username',
    'x-admin-password',
  ],

  credentials: true,
};

export function corsMiddleware(app: Express) {
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
}