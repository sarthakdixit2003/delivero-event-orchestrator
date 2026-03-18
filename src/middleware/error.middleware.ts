import type { NextFunction, Request, Response } from 'express';
import type { BaseError } from '../errors/base.error.js';
import logger from '../logger/logger.js';

export function errorMiddleware(err: BaseError, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;

  logger.error({
    message: err.message,
    errorCode: err.errorCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    error: {
      message: err.message,
      code: err.errorCode,
    },
  });

  next(err);
}
