import { httpRequestCounter, httpRequestDuration } from '@/metrics/registry.js';
import type { NextFunction, Request, Response } from 'express';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const durationInSeconds = Number(process.hrtime.bigint() - startTime) / 1e9;

    const route = req.route?.path ?? req.path;

    httpRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: String(res.statusCode),
    });

    httpRequestDuration.observe({ method: req.method, route: route }, durationInSeconds);
  });

  next();
};
