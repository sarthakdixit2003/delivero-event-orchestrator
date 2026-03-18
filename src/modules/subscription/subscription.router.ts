import { Router, type NextFunction, type Request, type Response } from 'express';
import { SubscriptionService } from './subscription.service.js';
import {
  createSubscriptionValidator,
  getSubscriptionByIdValidator,
  getSubscriptionsByTenantIdValidator,
} from './subscription.validator.js';
import { validateAllowedFields } from '../../utils/validator.utils.js';

const subscriptionRouter = Router();

subscriptionRouter.get('/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    getSubscriptionsByTenantIdValidator(req.params?.tenantId as string);
    const subscriptions = await new SubscriptionService().getSubscriptionsByTenantId(req.params?.tenantId as string);
    res.status(200).json(subscriptions);
  } catch (error) {
    next(error);
  }
});

subscriptionRouter.get('/:id/:tenantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    getSubscriptionByIdValidator(req.params?.id as string, req.params?.tenantId as string);
    const subscription = await new SubscriptionService().getSubscriptionById(
      req.params?.id as string,
      req.params?.tenantId as string,
    );
    res.status(200).json(subscription);
  } catch (error) {
    next(error);
  }
});

subscriptionRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    createSubscriptionValidator(req.body);
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
    const subscription = await new SubscriptionService().updateSubscriptionById(
      req.params?.id as string,
      req.query?.tenantId as string,
      req.body,
    );
    res.status(200).json(subscription);
  } catch (error) {
    next(error);
  }
});

subscriptionRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.query?.tenant_id as string;
    getSubscriptionByIdValidator(req.params?.id as string, tenantId);
    await new SubscriptionService().deleteSubscriptionById(req.params?.id as string, tenantId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default subscriptionRouter;
