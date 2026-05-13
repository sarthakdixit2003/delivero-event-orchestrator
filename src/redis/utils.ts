import type { Request } from 'express';
import type { CacheConfig } from './interface.js';
import crypto from 'crypto';

export function matchRoute(req: Request, config: CacheConfig[]): CacheConfig | null {
  const path = req.path;

  for (const policy of config) {
    if (policy.pattern.test(path)) {
      return policy;
    }
  }

  return null;
}

function normalizeQuery(query: Record<string, any>): string {
  const sortedKeys = Object.keys(query).sort();

  const normalized: Record<string, any> = {};

  for (const key of sortedKeys) {
    const value = query[key];

    if (Array.isArray(value)) {
      normalized[key] = [...value].sort();
    } else {
      normalized[key] = value;
    }
  }

  return JSON.stringify(normalized);
}

function hash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Generate cache key
 */
export function generateCacheKey(req: Request): string {
  const method = req.method;
  const path = req.baseUrl + req.path;

  const tenantId = req.tenant_id;

  const normalizedQuery = normalizeQuery(req.query);

  const rawKey = `${method}:${path}:${tenantId}:${normalizedQuery}`;

  const MAX_KEY_LENGTH = 200;

  const finalKey = rawKey.length > MAX_KEY_LENGTH ? hash(rawKey) : rawKey;

  return `cache:${finalKey}`;
}

const CACHE_NAMESPACE = 'event-platform';

export const CacheTags = {
  tenant: (tenantId: string) => [`${CACHE_NAMESPACE}:tenant:${tenantId}`],

  tenantList: () => [`${CACHE_NAMESPACE}:tenant:list`],

  rule: (ruleId: string, tenantId: string) => [`${CACHE_NAMESPACE}:rule:${ruleId}:tenant:${tenantId}`],

  tenantRules: (tenantId: string) => [`${CACHE_NAMESPACE}:rule:list:tenant:${tenantId}`],

  subscription: (subscriptionId: string, tenantId: string) => [
    `${CACHE_NAMESPACE}:subscription:${subscriptionId}:tenant:${tenantId}`,
  ],

  tenantSubscriptions: (tenantId: string) => [`${CACHE_NAMESPACE}:subscription:list:tenant:${tenantId}`],
};
