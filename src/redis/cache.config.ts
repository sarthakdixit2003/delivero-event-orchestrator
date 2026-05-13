import type { Request } from 'express';
import type { CacheConfig as CacheConfigInterface } from './interface.js';
import { CacheTags } from './utils.js';
import { ValidationError } from '@/errors/validation.error.js';

export const cacheConfig: CacheConfigInterface[] = [
  {
    // GET /rules/:id
    pattern: /^\/rules\/[^/]+$/,
    ttl: 7200, // 2 hours

    tags: (req: Request) => {
      const tenantId = req.tenant_id;
      const rule_id = req.params.id;
      if (!tenantId || !rule_id) {
        throw new ValidationError('Tenant ID and Rule ID are required');
      }
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
      const tenantId = req.tenant_id;
      if (!tenantId) {
        throw new ValidationError('Tenant ID is required');
      }
      return CacheTags.tenantRules(tenantId);
    },
  },

  {
    // GET /subscriptions/:id
    pattern: /^\/subscriptions\/[^/]+$/,
    ttl: 28800, // 8 hours

    tags: (req: Request) => {
      const tenantId = req.tenant_id;
      const subscription_id = req.params.id;
      if (!tenantId || !subscription_id) {
        throw new ValidationError('Tenant ID and Subscription ID are required');
      }
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
      const tenantId = req.tenant_id;
      if (!tenantId) {
        throw new ValidationError('Tenant ID is required');
      }
      return CacheTags.tenantSubscriptions(tenantId);
    },
  },

  {
    // GET /tenants/:id
    pattern: /^\/tenants\/[^/]+$/,
    ttl: 28800, // 8 hours

    tags: (req: Request) => {
      const tenant_id = req.tenant_id;
      if (!tenant_id) {
        throw new ValidationError('Tenant ID is required');
      }
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
