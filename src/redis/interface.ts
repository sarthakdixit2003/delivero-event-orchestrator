import type { Request } from 'express';

export interface CacheConfig {
  pattern: RegExp;
  ttl: number;
  tags: (req: Request) => string[];
}
