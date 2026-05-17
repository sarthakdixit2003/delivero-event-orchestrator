import { RateLimitError } from '@/errors/rate-limit.error.js';
import { UnauthorizedError } from '@/errors/unauthorized.error.js';
import redisClient from '@/redis/redis-client.js';
import type { NextFunction, Request, Response } from 'express';

export interface RateLimiterOptions {
  windowInSeconds: number;
  maxRequests: number;
}

export function rateLimiterMiddleware({ windowInSeconds, maxRequests }: RateLimiterOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenant_id = req.tenant_id;

      if (!tenant_id) {
        throw new UnauthorizedError('Unauthorized');
      }

      const key = `rate_limit:${tenant_id}`;
      const count = await redisClient.incr(key);

      if (count === 1) {
        await redisClient.expire(key, windowInSeconds);
      }

      if (count > maxRequests) {
        const ttl = await redisClient.ttl(key);
        res.setHeader('Retry-After', ttl);

        throw new RateLimitError('Too many requests', {
          tenant_id,
          windowInSeconds,
          maxRequests,
          count,
          ttl,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
