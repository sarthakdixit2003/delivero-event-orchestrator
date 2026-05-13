import { Router, type NextFunction, type Request, type Response } from 'express';
import { SubscriptionService } from './subscription.service.js';
import { getSubscriptionByIdValidator, getSubscriptionsByTenantIdValidator } from './subscription.validator.js';
import { validateAllowedFields } from '@/utils/validator.utils.js';
import { CacheTags } from '@/redis/utils.js';
import { invalidateCacheTag } from '@/middleware/index.js';
import { ValidationError } from '@/errors/validation.error.js';
import logger from '@/logger/logger.js';

const subscriptionRouter = Router();

subscriptionRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.tenant_id;
    logger.info(`GET /subscriptions: Getting subscriptions for tenant ${tenant_id}`);
    if (!tenant_id) {
      throw new ValidationError('Tenant Id is required');
    }
    getSubscriptionsByTenantIdValidator(tenant_id as string);
    const subscriptions = await new SubscriptionService().getSubscriptionsByTenantId(tenant_id);
    res.status(200).json(subscriptions);
  } catch (error) {
    next(error);
  }
});

subscriptionRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.tenant_id;
    logger.info(`GET /subscriptions/:id: Getting subscription ${req.params?.id} for tenant ${tenant_id}`);
    if (!tenant_id) {
      throw new ValidationError('Tenant Id is required');
    }
    getSubscriptionByIdValidator(req.params?.id as string, tenant_id as string);
    const subscription = await new SubscriptionService().getSubscriptionById(
      req.params?.id as string,
      tenant_id as string,
    );
    res.status(200).json(subscription);
  } catch (error) {
    next(error);
  }
});

subscriptionRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateAllowedFields(req.body, [
      'name',
      'auth_type',
      'auth_secret_ref',
      'max_retries_allowed',
      'concurrency_limit',
      'rate_limit_rps',
      'enabled',
      'endpoint_url',
      'rule_id',
    ]);
    const tenant_id = req.tenant_id;
    if (!tenant_id) {
      throw new ValidationError('Tenant ID is required');
    }
    req.body.tenant_id = tenant_id as string;
    const subscription = await new SubscriptionService().createSubscription(req.body);
    res.status(201).json(subscription);
  } catch (error) {
    next(error);
  }
});

subscriptionRouter.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateAllowedFields(req.body, [
      'name',
      'auth_type',
      'auth_secret_ref',
      'max_retries_allowed',
      'concurrency_limit',
      'rate_limit_rps',
      'enabled',
      'endpoint_url',
    ]);
    const tenant_id = req.tenant_id;
    if (!tenant_id) {
      throw new ValidationError('Tenant ID is required');
    }
    const subscription_id = req.params?.id as string;
    const subscription = await new SubscriptionService().updateSubscriptionById(subscription_id, tenant_id, req.body);

    const tags = CacheTags.subscription(subscription_id, tenant_id);
    await invalidateCacheTag(tags);
    res.status(200).json(subscription);
  } catch (error) {
    next(error);
  }
});

subscriptionRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenant_id = req.tenant_id;
    if (!tenant_id) {
      throw new ValidationError('Tenant ID is required');
    }
    const subscription_id = req.params?.id as string;
    getSubscriptionByIdValidator(subscription_id, tenant_id);
    await new SubscriptionService().deleteSubscriptionById(subscription_id, tenant_id);

    const tags = CacheTags.subscription(subscription_id, tenant_id);
    await invalidateCacheTag(tags);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default subscriptionRouter;
