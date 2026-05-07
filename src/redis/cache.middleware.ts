import type { NextFunction, Request, Response } from 'express';
import { generateCacheKey, matchRoute } from './utils.js';
import redisClient from './redis-client.js';
import logger from '@/logger/logger.js';
import type { CacheConfig } from './interface.js';

export function cacheMiddleware(config: CacheConfig[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const policy = matchRoute(req, config);
    if (!policy) return next();

    const key = generateCacheKey(req);

    try {
      const cached = await redisClient.get(key);

      if (cached) {
        logger.info(`Cache HIT: ${key}`);
        return res.json(JSON.parse(cached));
      }

      const originalSend = res.send.bind(res);

      res.send = (body: any) => {
        if (res.statusCode === 200) {
          (async () => {
            try {
              const value = typeof body === 'string' ? body : JSON.stringify(body);

              await redisClient.set(key, value, 'EX', policy.ttl);

              const tags = policy.tags(req);
              for (const tag in tags) {
                await redisClient.sadd(tag, key);
              }
              logger.info(`Cache WRITE: ${key}`);
            } catch (err: any) {
              logger.error('Cache write failed', err);
            }
          })();
        }

        return originalSend(body);
      };

      next();
    } catch (error: any) {
      logger.error(`Unable to get cache: ${error.message}`);
      next();
    }
  };
}

export async function invalidateCacheTag(tags: string[]) {
  for (const tag of tags) {
    const keys = await redisClient.smembers(tag);
    if (keys.length) redisClient.del(...keys);
    redisClient.del(tag);
  }
}
