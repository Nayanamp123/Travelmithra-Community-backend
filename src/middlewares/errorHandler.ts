import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  const status = typeof err === 'object' && err !== null && 'status' in err ? (err as any).status : 500;
  const message =
    typeof err === 'object' && err !== null && 'message' in err
      ? (err as any).message
      : 'Internal server error';
  const statusCode = typeof status === 'number' ? status : 500;

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({ error: message });
}
