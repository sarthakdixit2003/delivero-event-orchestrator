import type { Request } from 'express';
import type { CacheConfig as CacheConfigInterface } from './interface.js';
import { CacheTags, getTenantId } from './utils.js';

export const cacheConfig: CacheConfigInterface[] = [
  {
    // GET /rules/:id
    pattern: /^\/rules\/[^/]+$/,
    ttl: 7200, // 2 hours

    tags: (req: Request) => {
      const tenantId = getTenantId(req);
      const rule_id = req.params.id;

      return [
        ...CacheTags.rule(rule_id as string, tenantId),

        // invalidate list caches too on updates
        ...CacheTags.tenantRules(tenantId),
      ];
    },
  },

  {
    // GET /rules
    pattern: /^\/rules$/,
    ttl: 7200, // 2 hours

    tags: (req: Request) => {
      const tenantId = getTenantId(req);

      return CacheTags.tenantRules(tenantId);
    },
  },

  {
    // GET /subscriptions/:id
    pattern: /^\/subscriptions\/[^/]+$/,
    ttl: 28800, // 8 hours

    tags: (req: Request) => {
      const tenantId = getTenantId(req);
      const subscription_id = req.params.id;

      return [
        ...CacheTags.subscription(subscription_id as string, tenantId),
        ...CacheTags.tenantSubscriptions(tenantId),
      ];
    },
  },

  {
    // GET /subscriptions
    pattern: /^\/subscriptions$/,
    ttl: 28800, // 8 hours

    tags: (req: Request) => {
      const tenantId = getTenantId(req);

      return CacheTags.tenantSubscriptions(tenantId);
    },
  },

  {
    // GET /tenants/:id
    pattern: /^\/tenants\/[^/]+$/,
    ttl: 28800, // 8 hours

    tags: (req: Request) => {
      const tenant_id = getTenantId(req);

      return [
        ...CacheTags.tenant(tenant_id as string),

        // invalidate tenant listing caches too
        ...CacheTags.tenantList(),
      ];
    },
  },

  {
    // GET /tenants
    pattern: /^\/tenants$/,
    ttl: 28800, // 8 hours

    tags: () => {
      return CacheTags.tenantList();
    },
  },
];
