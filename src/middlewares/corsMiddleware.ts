import cors from 'cors';
import type { Express } from 'express';

const allowedOrigins = [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/];

export const corsOptions = {
  origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
    if (!origin || allowedOrigins.some((allowedOrigin) => allowedOrigin.test(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-username', 'x-admin-password'],
};

export function corsMiddleware(app: Express) {
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
}
